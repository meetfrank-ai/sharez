import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Use /data on Render (persistent disk), local file otherwise
_data_dir = os.getenv("DATA_DIR", ".")
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
