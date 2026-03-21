import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import Settings
from app.database import init_db
from app.routers import (
    attachments,
    audit_logs,
    auth,
    boms,
    build_orders,
    categories,
    components,
    dashboard,
    footprints,
    invoices,
    machines,
    maintenance,
    manufacturers,
    materials,
    proxmox,
    software,
    stock_items,
    stock_locations,
    subscriptions,
    suppliers,
    system_settings,
    tools,
    users,
)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan: initialize DB and create directories on startup."""
    settings = Settings()

    # Create data directory for SQLite
    db_url = settings.DATABASE_URL
    if db_url.startswith("sqlite"):
        db_path = db_url.replace("sqlite:///", "")
        db_dir = os.path.dirname(db_path)
        if db_dir:
            os.makedirs(db_dir, exist_ok=True)

    # Create upload directories
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    os.makedirs(os.path.join(settings.UPLOAD_DIR, "invoices"), exist_ok=True)
    os.makedirs(os.path.join(settings.UPLOAD_DIR, "boms"), exist_ok=True)
    os.makedirs(os.path.join(settings.UPLOAD_DIR, "attachments"), exist_ok=True)

    # Initialize database tables
    init_db()

    # Seed default admin user and settings
    seed_defaults()

    yield


def seed_defaults():
    """Create default admin user and system settings if they don't exist."""
    from app.database import SessionLocal
    from app.models.user import User
    from app.models.system_settings import SystemSetting
    from app.services.auth import hash_password
    from app.routers.system_settings import init_default_settings

    settings = Settings()
    db = SessionLocal()
    try:
        # Create default admin if no users exist
        if db.query(User).count() == 0:
            admin = User(
                username=settings.FIRST_ADMIN_USERNAME,
                hashed_password=hash_password(settings.FIRST_ADMIN_PASSWORD),
                role="admin",
                full_name="Administrator",
            )
            db.add(admin)
            db.commit()

        # Create default settings if none exist
        init_default_settings(db)
    finally:
        db.close()


app = FastAPI(
    title="Homelab Manager",
    description="API for managing homelab components, BOMs, invoices, machines, and more.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware - allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all routers
app.include_router(components.router, prefix="/api/v1")
app.include_router(boms.router, prefix="/api/v1")
app.include_router(invoices.router, prefix="/api/v1")
app.include_router(tools.router, prefix="/api/v1")
app.include_router(materials.router, prefix="/api/v1")
app.include_router(machines.router, prefix="/api/v1")
app.include_router(maintenance.router, prefix="/api/v1")
app.include_router(software.router, prefix="/api/v1")
app.include_router(subscriptions.router, prefix="/api/v1")
app.include_router(proxmox.router, prefix="/api/v1")
app.include_router(suppliers.router, prefix="/api/v1")
app.include_router(manufacturers.router, prefix="/api/v1")
app.include_router(dashboard.router, prefix="/api/v1")
app.include_router(stock_locations.router, prefix="/api/v1")
app.include_router(stock_items.router, prefix="/api/v1")
app.include_router(build_orders.router, prefix="/api/v1")
app.include_router(categories.router, prefix="/api/v1")
app.include_router(footprints.router, prefix="/api/v1")
app.include_router(attachments.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(system_settings.router, prefix="/api/v1")
app.include_router(audit_logs.router, prefix="/api/v1")


@app.get("/")
def root():
    """Root endpoint."""
    return {"app": "Homelab Manager", "version": "1.0.0"}
