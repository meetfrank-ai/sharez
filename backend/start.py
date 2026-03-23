"""
Production startup script.
Seeds the database if empty, then starts uvicorn.
"""

import os
import subprocess
import sys

# Ensure we're in the backend directory
os.chdir(os.path.dirname(os.path.abspath(__file__)))

# Seed if DB is empty
from database import engine, Base, SessionLocal
from models import User

Base.metadata.create_all(bind=engine)
db = SessionLocal()
if not db.query(User).first():
    print("Empty database — running seed...")
    db.close()
    subprocess.run([sys.executable, "seed.py"], check=True)
else:
    print(f"Database has {db.query(User).count()} users, skipping seed.")
    db.close()
