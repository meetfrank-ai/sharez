import os
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Use DATA_DIR if set and exists, otherwise fall back to local directory
_data_dir = os.getenv("DATA_DIR", ".")
if _data_dir != "." and not Path(_data_dir).exists():
    Path(_data_dir).mkdir(parents=True, exist_ok=True)
DATABASE_URL = f"sqlite:///{_data_dir}/sharez.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
