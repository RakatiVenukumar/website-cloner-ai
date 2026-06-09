import datetime
import uuid
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base

class Project(Base):
    __tablename__ = "projects"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    original_url = Column(String, nullable=False)
    preview_port = Column(Integer, nullable=True)
    preview_status = Column(String, default="stopped") # "stopped", "running", "failed"
    status = Column(String, default="pending")          # "pending", "cloning", "analyzing", "generating", "ready", "failed"
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    text_blocks = relationship("TextBlock", back_populates="project", cascade="all, delete-orphan")
    deployments = relationship("Deployment", back_populates="project", cascade="all, delete-orphan")


class TextBlock(Base):
    __tablename__ = "text_blocks"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    section = Column(String, default="General") # Hero, Features, Pricing, Footer, etc.
    selector = Column(Text, nullable=False)     # CSS selector or custom element identifier
    key = Column(String, nullable=False)        # JSON dictionary key, e.g., "hero_heading"
    tag_type = Column(String, nullable=False)   # h1, p, a, button, etc.
    original_value = Column(Text, nullable=False)
    current_value = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    project = relationship("Project", back_populates="text_blocks")


class Deployment(Base):
    __tablename__ = "deployments"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    platform = Column(String, nullable=False)   # vercel, render, netlify, github
    deployment_url = Column(String, nullable=True)
    status = Column(String, default="pending")  # pending, deploying, success, failed
    external_id = Column(String, nullable=True)  # deployment ID from third party provider
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    project = relationship("Project", back_populates="deployments")
