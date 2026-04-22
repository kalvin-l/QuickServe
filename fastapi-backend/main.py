"""
QuickServe FastAPI Backend
Group Ordering System for Cafe/Restaurant

Run this file to start the server:
    uvicorn main:app --reload --host 0.0.0.0 --port 8000
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.database import init_db, get_db
from app.routers import menu, category, size_presets, addons, tables, sessions, websocket, groups, join_requests, orders, payments, auth, staff, inventory, recipe
from app.utils.init_admin import create_default_admin
from app.core.scheduler import init_scheduler, shutdown_scheduler

# Import all models so they're registered with SQLAlchemy Base
# This must be done before init_db() is called
from app.models import (
    Admin,
    Category, Addon, MenuItem, MenuItemAddon, SizePreset,
    Inventory,
    Table, QRScanLog, TableSession, SessionParticipant, PreservedCart,
    GroupSession, GroupMember, JoinRequest,
    Order, OrderItem, Payment, GroupCartItem,
    RecipeIngredient
)

import uvicorn
from pathlib import Path

# Create FastAPI app
app = FastAPI(
    title="QuickServe API",
    description="Ordering system for cafes",
    version="1.0.0"
)

# Configure CORS (allow frontend to communicate)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(menu.router)
app.include_router(category.router)
app.include_router(size_presets.router, prefix="/api/size-presets", tags=["size-presets"])
app.include_router(addons.router)
app.include_router(tables.router)
app.include_router(sessions.router, prefix="/api")
app.include_router(websocket.router)
app.include_router(groups.router, prefix="/api/groups")
app.include_router(join_requests.router, prefix="/api/join-requests")
app.include_router(orders.router)
app.include_router(payments.router)
app.include_router(auth.router, prefix="/api", tags=["Authentication"])
app.include_router(staff.router, prefix="/api", tags=["Staff Management"])
app.include_router(inventory.router)
app.include_router(recipe.router)

# Mount static files for uploads
uploads_dir = Path("uploads")
uploads_dir.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


# Startup event - Initialize database
@app.on_event("startup")
async def startup_event():
    """Initialize database tables on startup"""
    await init_db()
    print("Database initialized successfully")

    # Create default admin user if not exists
    await create_default_admin()
    print("Admin initialization complete")

    # Initialize background scheduler for session management
    await init_scheduler(get_db)
    print("Background scheduler initialized")


# Shutdown event - Cleanup
@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    shutdown_scheduler()
    print("Background scheduler shut down")




# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "QuickServe API is running!",
        "version": "1.0.0",
        "docs": "/docs",
        "endpoints": {
            "menu": "/api/menu",
            "tables": "/api/tables",
            "sessions": "/api/sessions",
            "groups": "/api/groups",
            "orders": "/api/orders",
            "payments": "/api/payments",
            "inventory": "/api/inventory",
            "websocket": "/ws/table/{table_id}",
            "health": "/health"
        },
        "status": "healthy"
    }


# Health check endpoint
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "QuickServe API",
        "database": "SQLite",
        "endpoints_count": len(app.routes)
    }

# Run server if executed directly
if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,  # Auto-reload on code changes
        log_level="info"
    )
