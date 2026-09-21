from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

# Engine configuration with dialect-specific options
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db() -> Generator:
    """
    FastAPI dependency that provides a transactional database session.
    Automatically commits on success or rolls back on exceptions.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Initialize all tables defined in models and seed default accounts."""
    # Import all models to ensure they are registered with Base.metadata
    import app.models  # noqa: F401
    Base.metadata.create_all(bind=engine)

    # Auto-migrate missing columns for SQLite if necessary
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            # Check audit_logs columns
            result = conn.execute(text("PRAGMA table_info(audit_logs)"))
            columns = [row[1] for row in result.fetchall()]
            if columns and "user_agent" not in columns:
                conn.execute(text("ALTER TABLE audit_logs ADD COLUMN user_agent VARCHAR(255) DEFAULT 'unknown'"))
                conn.commit()
    except Exception as e:
        print(f"Warning during schema migration: {e}")

    # Seed default institutional users & comprehensive investigation test dataset
    try:
        from app.core.seeder import seed_database_comprehensive
        db = SessionLocal()
        seed_database_comprehensive(db)
        db.close()
    except Exception as e:
        print(f"Warning during comprehensive seeding: {e}")



