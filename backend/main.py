import os
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from database import engine, Base
from routes import auth, portfolio, follow, theses, comments, feed, notes, discover, trades

# Create all tables
Base.metadata.create_all(bind=engine)

# Migrate: add new columns to existing tables (PostgreSQL doesn't auto-add)
try:
    from sqlalchemy import text
    with engine.connect() as conn:
        # Check and add missing columns
        for col_name, col_sql in [
            ("portfolio_imported_at", "ALTER TABLE users ADD COLUMN portfolio_imported_at TIMESTAMP"),
            ("handle", "ALTER TABLE users ADD COLUMN handle VARCHAR UNIQUE"),
            ("transaction_ids", "ALTER TABLE notes ADD COLUMN transaction_ids JSONB"),
            ("image_url", "ALTER TABLE notes ADD COLUMN image_url VARCHAR"),
            ("reshare_count", "ALTER TABLE notes ADD COLUMN reshare_count INTEGER DEFAULT 0"),
            ("restacked_note_id", "ALTER TABLE notes ADD COLUMN restacked_note_id INTEGER"),
        ]:
            try:
                conn.execute(text(col_sql))
                conn.commit()
                print(f"Migrated: added {col_name}")
            except Exception:
                conn.rollback()  # Column already exists
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
app.include_router(trades.router)

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
