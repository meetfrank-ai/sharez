import os
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from database import engine, Base
from routes import auth, portfolio, follow, theses, comments, feed, notes, discover

# Create all tables
Base.metadata.create_all(bind=engine)

# Migrate: add new columns if missing (SQLite doesn't auto-add on create_all)
try:
    import sqlite3
    _conn = engine.raw_connection()
    _cursor = _conn.cursor()
    _cursor.execute("PRAGMA table_info(users)")
    _cols = [col[1] for col in _cursor.fetchall()]
    for col_name, col_type in [("handle", "VARCHAR"), ("linkedin_url", "VARCHAR"), ("twitter_url", "VARCHAR"), ("website_url", "VARCHAR")]:
        if col_name not in _cols:
            _cursor.execute(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}")
            print(f"Migrated: added {col_name} column to users")
    _conn.commit()
    _conn.close()
except Exception as e:
    print(f"Migration check: {e}")

# Seed database if empty (runs once on first deploy)
try:
    from database import SessionLocal
    from models import User
    _db = SessionLocal()
    if not _db.query(User).first():
        _db.close()
        print("Empty database — running seed...")
        import subprocess, sys
        subprocess.run([sys.executable, "seed.py"], check=True)
    else:
        _db.close()
except Exception as e:
    print(f"Seed check skipped: {e}")

app = FastAPI(title="Sharez", description="Social investing for friends")

# CORS — allow the React frontend in dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(auth.router)
app.include_router(portfolio.router)
app.include_router(follow.router)
app.include_router(theses.router)
app.include_router(comments.router)
app.include_router(feed.router)
app.include_router(notes.router)
app.include_router(discover.router)

# Serve built React frontend in production
STATIC_DIR = Path(__file__).parent / "static"

if STATIC_DIR.exists():
    app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(request: Request, full_path: str):
        # Serve static files if they exist, otherwise return index.html (SPA routing)
        file_path = STATIC_DIR / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(STATIC_DIR / "index.html")
else:
    @app.get("/")
    def root():
        return {"app": "Sharez", "status": "running", "note": "Frontend not built yet. Run: cd frontend && npm run build"}
