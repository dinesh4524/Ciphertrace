from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from app.models.user import User
from app.core.security import get_password_hash, verify_password
from app.core.permissions import Role, ROLE_PERMISSIONS, Permission
from app.schemas.user import UserCreate, UserUpdate
from app.services.audit_service import AuditService


class UserService:
    @staticmethod
    def get_by_id(db: Session, user_id: str) -> Optional[User]:
        return db.query(User).filter(User.id == user_id).first()

    @staticmethod
    def get_by_username(db: Session, username: str) -> Optional[User]:
        return db.query(User).filter(User.username == username.lower().strip()).first()

    @staticmethod
    def get_by_email(db: Session, email: str) -> Optional[User]:
        return db.query(User).filter(User.email == email.lower().strip()).first()

    @staticmethod
    def authenticate(db: Session, username: str, password: str) -> Optional[User]:
        user = UserService.get_by_username(db, username)
        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        if not user.is_active:
            return None
        return user

    @staticmethod
    def create_user(db: Session, user_in: UserCreate, operator_id: str = "SYSTEM_ADMIN") -> User:
        user = User(
            username=user_in.username.lower().strip(),
            email=user_in.email.lower().strip(),
            hashed_password=get_password_hash(user_in.password),
            full_name=user_in.full_name,
            role=user_in.role.value if isinstance(user_in.role, Role) else user_in.role,
            badge_number=user_in.badge_number,
            department=user_in.department,
            designation=user_in.designation,
            is_active=user_in.is_active,
            is_superuser=(user_in.role == Role.SYSTEM_ADMINISTRATOR or user_in.role == Role.SYSTEM_ADMINISTRATOR.value)
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        AuditService.log_action(
            db=db,
            action_type="USER_CREATED",
            resource_type="USER",
            resource_id=user.id,
            operator_id=operator_id,
            details={"username": user.username, "role": user.role, "full_name": user.full_name}
        )
        return user

    @staticmethod
    def list_users(
        db: Session,
        role: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> Tuple[List[User], int]:
        query = db.query(User)
        if role:
            query = query.filter(User.role == role.upper())
        if search:
            q = f"%{search}%"
            query = query.filter((User.full_name.ilike(q)) | (User.username.ilike(q)) | (User.badge_number.ilike(q)))
        
        total = query.count()
        users = query.order_by(User.created_at.asc()).offset(offset).limit(limit).all()
        return users, total

    @staticmethod
    def seed_default_users(db: Session) -> List[User]:
        """
        Seeds default test users covering all 6 organizational roles.
        """
        default_accounts = [
            {
                "username": "investigator_sharma",
                "email": "sharma.io@police.gov.in",
                "password": "Password123!",
                "full_name": "Inspector Rajesh Sharma",
                "role": Role.INVESTIGATOR,
                "badge_number": "DEL-CYBER-7492",
                "department": "Special Cyber Cell, Mandir Marg",
                "designation": "Investigating Officer / Inspector"
            },
            {
                "username": "supervisor_verma",
                "email": "verma.acp@police.gov.in",
                "password": "Password123!",
                "full_name": "ACP Surender Verma",
                "role": Role.SENIOR_INVESTIGATOR,
                "badge_number": "DEL-CYBER-0012",
                "department": "Crime Branch HQ / Supervisory Cell",
                "designation": "Assistant Commissioner of Police"
            },
            {
                "username": "legal_advocate_iyer",
                "email": "iyer.legal@prosecution.gov.in",
                "password": "Password123!",
                "full_name": "Advocate Priya Iyer",
                "role": Role.LEGAL_ANALYST,
                "badge_number": "BAR-DEL-99120",
                "department": "Directorate of Prosecution",
                "designation": "Senior Public Prosecutor & Legal Analyst"
            },
            {
                "username": "forensic_dr_deshmukh",
                "email": "deshmukh.forensic@fsl.gov.in",
                "password": "Password123!",
                "full_name": "Dr. Anand Deshmukh",
                "role": Role.FORENSIC_ANALYST,
                "badge_number": "FSL-DIG-4041",
                "department": "Central Forensic Science Laboratory (CFSL)",
                "designation": "Digital Forensics & CDR Lead"
            },
            {
                "username": "intel_patel",
                "email": "patel.intel@cid.gov.in",
                "password": "Password123!",
                "full_name": "Kiran Patel",
                "role": Role.INTELLIGENCE_ANALYST,
                "badge_number": "CID-INT-8122",
                "department": "State Crime Intelligence Bureau (CIB)",
                "designation": "Crime Network & Threat Analyst"
            },
            {
                "username": "admin_ciphertrace",
                "email": "admin@ciphertrace.gov.in",
                "password": "Password123!",
                "full_name": "System Administrator",
                "role": Role.SYSTEM_ADMINISTRATOR,
                "badge_number": "SYS-ADM-0001",
                "department": "Ciphertrace X Command & Infrastructure",
                "designation": "Platform Administrator"
            }
        ]

        seeded = []
        for acc in default_accounts:
            existing = UserService.get_by_username(db, acc["username"])
            if not existing:
                u_in = UserCreate(**acc)
                u = UserService.create_user(db, u_in, operator_id="SYSTEM_BOOTSTRAP")
                seeded.append(u)
            else:
                seeded.append(existing)
        return seeded
