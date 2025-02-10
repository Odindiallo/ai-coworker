from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import uvicorn

# Import services
from app.services.ui.framework_adapter import UIGenerator, UIFramework
from app.services.ui.theme_manager import ThemeManager
from app.services.project.project_manager import ProjectManager
from app.services.collaboration.realtime_service import RealtimeCollaborationService

app = FastAPI(
    title="AI Coworker API",
    description="API for AI-powered coworker application",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with actual origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
BASE_DIR = Path(__file__).resolve().parent.parent
ui_generator = UIGenerator()
theme_manager = ThemeManager(str(BASE_DIR / "themes"))
project_manager = ProjectManager(str(BASE_DIR / "projects"))
realtime_service = RealtimeCollaborationService("your-jwt-secret")  # Replace with actual secret

@app.get("/")
async def root():
    return {"message": "Welcome to AI Coworker API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# WebSocket endpoint for real-time collaboration
@app.websocket("/ws/{project_id}")
async def websocket_endpoint(websocket: WebSocket, project_id: str):
    await realtime_service.handle_connection(websocket, f"/ws/{project_id}")

# UI Framework endpoints
@app.post("/api/generate-component")
async def generate_component(framework: UIFramework, component_def: dict):
    return {
        "code": ui_generator.generate_component(component_def, framework)
    }

# Theme management endpoints
@app.post("/api/themes")
async def create_theme(theme_config: dict):
    return theme_manager.create_theme(theme_config)

@app.get("/api/themes/{name}")
async def get_theme(name: str):
    return theme_manager.get_theme(name)

# Project management endpoints
@app.post("/api/projects")
async def create_project(project_data: dict):
    return project_manager.create_project(
        name=project_data["name"],
        description=project_data["description"],
        owner_id=project_data["owner_id"]
    )

@app.get("/api/projects/{project_id}")
async def get_project(project_id: str):
    return project_manager.get_project(project_id)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080)
