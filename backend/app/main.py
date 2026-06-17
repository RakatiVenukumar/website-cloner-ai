import os
import logging
import asyncio
import httpx
from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Dict

from app.database import engine, Base, get_db, SessionLocal
from app.config import settings
from app.models import Project, TextBlock, Deployment
from app.schemas import (
    ProjectCreate, ProjectOut, ProjectDetailOut, 
    ContentUpdatePayload, DeploymentOut
)
from app.scraper.scraper import WebsiteScraper
from app.agent.analyzer import WebsiteAnalyzer
from app.codegen.generator import NextJsGenerator
from app.preview.preview_manager import preview_manager

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("main")

app = FastAPI(title="Website Cloner AI API", version="1.0.0")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize DB on Startup
@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    logger.info("Database initialized successfully.")

# Health Check
@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    try:
        # Check DB connection
        db.execute(Base.metadata.tables["projects"].select().limit(1))
        db_status = "connected"
    except Exception as e:
        logger.error(f"DB Health check failed: {str(e)}")
        db_status = "disconnected"

    return {
        "status": "healthy",
        "database": db_status,
        "caching": "active"
    }

# --- Project Routes ---

@app.get("/api/projects", response_model=List[ProjectOut])
def list_projects(db: Session = Depends(get_db)):
    return db.query(Project).order_by(Project.created_at.desc()).all()

@app.get("/api/projects/{project_id}", response_model=ProjectDetailOut)
def get_project(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@app.delete("/api/projects/{project_id}")
def delete_project(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Stop preview if running
    preview_manager.stop_preview(project_id)
    
    # Remove project from DB
    db.delete(project)
    db.commit()
    
    # Clean up project directory on disk if it exists
    project_dir = os.path.join(settings.PROJECTS_DIR, project_id)
    if os.path.exists(project_dir):
        try:
            import shutil
            shutil.rmtree(project_dir)
        except Exception as e:
            logger.error(f"Failed to delete directory {project_dir}: {str(e)}")
            
    return {"message": "Project deleted successfully"}

# Background task for cloning, analyzing, and generating code
async def run_clone_pipeline(project_id: str, url: str, db_session_factory):
    # Retrieve project in a separate thread/session since SQLAlchemy sessions are thread-specific
    db = db_session_factory()
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        db.close()
        return

    try:
        # Step 1: Scrape
        project.status = "cloning"
        db.commit()
        logger.info(f"Starting Scrape for project {project_id} ({url})")
        
        project_dir = os.path.join(settings.PROJECTS_DIR, project_id)
        scraped_dir = os.path.join(project_dir, "scraped")
        os.makedirs(scraped_dir, exist_ok=True)
        
        scraper = WebsiteScraper(output_dir=scraped_dir)
        scraped_data = await scraper.clone_website(url)
        
        # Step 2: Analyze
        project.status = "analyzing"
        db.commit()
        logger.info(f"Starting Analysis for project {project_id}")
        
        analyzer = WebsiteAnalyzer(api_key=settings.OPENAI_API_KEY)
        blocks_data = await analyzer.analyze_layout(scraped_data["html_path"])
        
        # Save blocks to DB
        text_blocks = []
        for index, block in enumerate(blocks_data):
            text_block = TextBlock(
                project_id=project_id,
                section=block["section"],
                selector=block["selector"],
                key=block.get("key", f"text_{index}"),
                tag_type=block["tag_type"],
                original_value=block["original_value"],
                current_value=block["current_value"]
            )
            db.add(text_block)
            text_blocks.append(text_block)
        db.commit()

        # Step 3: Generate
        project.status = "generating"
        db.commit()
        logger.info(f"Starting Generation for project {project_id}")
        
        generator = NextJsGenerator(output_dir=project_dir)
        # Generate runnable Next.js code inside frontend subfolder
        generator.generate_project(
            project_name="app", 
            scraped_data=scraped_data, 
            text_blocks=[{"key": tb.key, "selector": tb.selector, "tag_type": tb.tag_type, "current_value": tb.current_value} for tb in text_blocks]
        )
        
        project.status = "ready"
        db.commit()
        logger.info(f"Pipeline completed successfully for project {project_id}")

    except Exception as e:
        logger.error(f"Pipeline failed for project {project_id}: {str(e)}", exc_info=True)
        project.status = "failed"
        project.error_message = str(e)
        db.commit()
    finally:
        db.close()

@app.post("/api/projects", response_model=ProjectOut, status_code=201)
def create_project(
    payload: ProjectCreate, 
    background_tasks: BackgroundTasks, 
    db: Session = Depends(get_db)
):
    name = payload.name or payload.url.split("//")[-1].split("/")[0] or "Cloned Website"
    
    project = Project(
        name=name,
        original_url=payload.url,
        status="pending"
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    
    # Trigger async cloner process
    background_tasks.add_task(
        run_clone_pipeline, 
        project.id, 
        payload.url, 
        SessionLocal # pass session factory
    )
    
    return project

# --- Preview Server Management ---

@app.post("/api/projects/{project_id}/preview/start")
def start_preview(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if project.status != "ready":
        raise HTTPException(status_code=400, detail=f"Project is not ready. Status is: {project.status}")
        
    project_dir = os.path.join(settings.PROJECTS_DIR, project_id, "app")
    
    try:
        port = preview_manager.start_preview(project_id, project_dir)
        project.preview_port = port
        project.preview_status = "running"
        db.commit()
        return {"message": "Preview started", "port": port}
    except Exception as e:
        project.preview_status = "failed"
        db.commit()
        raise HTTPException(status_code=500, detail=f"Failed to start preview: {str(e)}")

@app.post("/api/projects/{project_id}/preview/stop")
def stop_preview(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    stopped = preview_manager.stop_preview(project_id)
    if stopped:
        project.preview_status = "stopped"
        db.commit()
        return {"message": "Preview stopped"}
    else:
        return {"message": "Preview was not running"}

# --- Content Editing Endpoint ---

@app.patch("/api/projects/{project_id}/content")
def update_project_content(project_id: str, payload: ContentUpdatePayload, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    # Update values in Database
    for key, new_val in payload.updates.items():
        block = db.query(TextBlock).filter(
            TextBlock.project_id == project_id,
            TextBlock.key == key
        ).first()
        if block:
            block.current_value = new_val
            db.add(block)
    
    db.commit()
    
    # Write updated contents to the Next.js translation/mapping file
    project_dir = os.path.join(settings.PROJECTS_DIR, project_id, "app")
    content_json_path = os.path.join(project_dir, "content.json")
    
    if os.path.exists(project_dir):
        try:
            import json
            # Load all block values for this project
            all_blocks = db.query(TextBlock).filter(TextBlock.project_id == project_id).all()
            content_map = {b.key: b.current_value for b in all_blocks}
            
            with open(content_json_path, "w", encoding="utf-8") as f:
                json.dump(content_map, f, indent=2)
                
            logger.info(f"Updated content.json for project {project_id}")
        except Exception as e:
            logger.error(f"Failed to update content.json: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to write content update to disk: {str(e)}")
            
    return {"message": "Content updated successfully"}

# --- Deployments routes ---

@app.post("/api/projects/{project_id}/deploy", response_model=DeploymentOut)
def deploy_project(project_id: str, platform: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    # Create deployment in database
    deployment = Deployment(
        project_id=project_id,
        platform=platform,
        status="success" if platform != "fail" else "failed",
        deployment_url=f"https://website-cloner-ai-{project_id}.{platform}.app"
    )
    db.add(deployment)
    db.commit()
    db.refresh(deployment)
    return deployment

# --- Preview Proxy Router ---

@app.api_route("/api/preview/{project_id}/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])
async def preview_proxy(project_id: str, path: str, request: Request, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    port = preview_manager.get_preview_port(project_id)
    if not port:
        # If preview not running, try starting it automatically
        project_dir = os.path.join(settings.PROJECTS_DIR, project_id, "app")
        if os.path.exists(project_dir) and project.status == "ready":
            try:
                port = preview_manager.start_preview(project_id, project_dir)
                project.preview_port = port
                project.preview_status = "running"
                db.commit()
            except Exception as e:
                raise HTTPException(status_code=503, detail=f"Preview server is stopped and failed to start: {str(e)}")
        else:
            raise HTTPException(status_code=503, detail="Preview server is stopped. Start it first.")

    target_url = f"http://127.0.0.1:{port}/{path}"
    
    # Get request body
    body = await request.body()
    
    # Filter header fields to forward
    headers = {key: value for key, value in request.headers.items() if key.lower() not in ["host", "content-length"]}
    
    # Forward query parameters
    params = dict(request.query_params)
    
    async with httpx.AsyncClient() as client:
        try:
            # Forward the request
            response = await client.request(
                method=request.method,
                url=target_url,
                headers=headers,
                params=params,
                content=body,
                timeout=10.0
            )
        except Exception as e:
            logger.error(f"Proxy connection to {target_url} failed: {str(e)}")
            raise HTTPException(status_code=502, detail="Failed to connect to local preview server.")
            
    # Forward response headers
    response_headers = {key: value for key, value in response.headers.items() if key.lower() not in ["content-encoding", "transfer-encoding"]}
    
    return StreamingResponse(
        content=response.aiter_bytes(),
        status_code=response.status_code,
        headers=response_headers
    )
