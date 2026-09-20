from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from app.core.permissions import Role, Permission


class UserBase(BaseModel):
    username: str = Field(..., example="r_sharma")
    email: EmailStr = Field(..., example="r_sharma@police.gov.in")
    full_name: str = Field(..., example="Inspector R.K. Sharma")
    role: Role = Field(default=Role.INVESTIGATOR, example=Role.INVESTIGATOR)
    badge_number: Optional[str] = Field(None, example="DEL-CYBER-7492")
    department: Optional[str] = Field(default="State Cyber Crime Division", example="State Cyber Crime Division")
    designation: Optional[str] = Field(default="Inspector of Police", example="Inspector of Police")
    is_active: bool = True


class UserCreate(UserBase):
    password: str = Field(..., min_length=6, example="SecurePolicePass2026!")


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[Role] = None
    badge_number: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None


class UserLogin(BaseModel):
    username: str = Field(..., example="investigator_sharma")
    password: str = Field(..., example="Investigator@123")


class UserResponse(UserBase):
    id: str
    is_superuser: bool
    created_at: datetime
    updated_at: datetime
    permissions: List[str] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenPayload(BaseModel):
    sub: str
    role: str
    exp: datetime
    iat: datetime
