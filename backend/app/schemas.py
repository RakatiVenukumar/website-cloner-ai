from pydantic import BaseModel, HttpUrl
from typing import List, Optional, Dict
from datetime import datetime

# Text Block Schemas
class TextBlockBase(BaseModel):
    section: str
    selector: str
    key: str
    tag_type: str
    original_value: str
    current_value: str

class TextBlockCreate(TextBlockBase):
    pass

class TextBlockUpdate(BaseModel):
    current_value: str

class TextBlockOut(TextBlockBase):
    id: str
    project_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Project Schemas
class ProjectBase(BaseModel):
    name: str
    original_url: str

class ProjectCreate(BaseModel):
    url: str
    name: Optional[str] = None

class ProjectOut(ProjectBase):
    id: str
    preview_port: Optional[int] = None
    preview_status: str
    status: str
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ProjectDetailOut(ProjectOut):
    text_blocks: List[TextBlockOut] = []

    class Config:
        from_attributes = True

# Content Edit Schema
class ContentUpdatePayload(BaseModel):
    updates: Dict[str, str] # Key -> new text content map

# Deployment Schemas
class DeploymentBase(BaseModel):
    platform: str

class DeploymentCreate(DeploymentBase):
    pass

class DeploymentOut(DeploymentBase):
    id: str
    project_id: str
    deployment_url: Optional[str] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
