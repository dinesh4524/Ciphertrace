import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, Enum
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.core.permissions import Role


class User(Base):
    """
    User Entity representing an Officer, Analyst, or Administrator in the platform.
    """
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    
    full_name = Column(String(150), nullable=False)
    role = Column(String(50), nullable=False, default=Role.INVESTIGATOR.value, index=True)
    badge_number = Column(String(50), unique=True, nullable=True, index=True)
    department = Column(String(150), default="State Cyber Crime Division")
    designation = Column(String(100), default="Inspector of Police")
    
    is_active = Column(Boolean, default=True, nullable=False)
    is_superuser = Column(Boolean, default=False, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    case_assignments = relationship("CaseAssignment", back_populates="user", cascade="all, delete-orphan")
    case_notes = relationship("CaseNote", back_populates="author", cascade="all, delete-orphan")
