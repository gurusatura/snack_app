from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from app.models import SnackCategory


# ---------- Auth Schemas ----------

class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="User full name")
    email: str = Field(..., pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$", description="User email address")
    password: str = Field(..., min_length=6, max_length=128, description="User password (min 6 characters)")


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: str

    model_config = ConfigDict(from_attributes=True)


class LoginResponse(BaseModel):
    token: str
    user: UserOut


# ---------- Snack Schemas ----------

class SnackCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    category: SnackCategory
    quantity: int = Field(default=0, ge=0)
    low_stock_threshold: int = Field(default=5, ge=0)


class SnackUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    category: Optional[SnackCategory] = None
    quantity: Optional[int] = Field(default=None, ge=0)
    low_stock_threshold: Optional[int] = Field(default=None, ge=0)


class SnackOut(BaseModel):
    id: int
    name: str
    category: str
    quantity: int
    low_stock_threshold: int
    status: str
    created_at: datetime
    votes_count: int = 0
    user_voted: bool = False

    model_config = ConfigDict(from_attributes=True)


class SnackListResponse(BaseModel):
    items: List[SnackOut]
    total: int
    page: int
    limit: int
    total_pages: int


class AmountActionRequest(BaseModel):
    amount: int = Field(..., gt=0, le=1000)


class StockSummaryOut(BaseModel):
    gone: int
    running_low: int
    stocked: int


class SnackOfTheWeekOut(BaseModel):
    id: int
    name: str
    votes: int


class SnackSummaryResponse(BaseModel):
    stock_summary: StockSummaryOut
    snack_of_the_week: Optional[SnackOfTheWeekOut] = None


# ---------- Error Schemas ----------

class ErrorDetail(BaseModel):
    code: str
    message: str


class ErrorResponse(BaseModel):
    error: ErrorDetail


# ---------- Activity Schemas (Admin Bonus Feature) ----------

class ActivityOut(BaseModel):
    id: int
    user_id: int
    user_name: str
    user_email: str
    snack_id: int
    snack_name: str
    action: str
    amount: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ActivityListResponse(BaseModel):
    items: List[ActivityOut]
    total: int
    page: int
    limit: int
    total_pages: int


# ---------- Login History Schemas (Stage 12 Login Audit) ----------

class LoginHistoryOut(BaseModel):
    id: int
    user_id: Optional[int] = None
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    attempted_email: Optional[str] = None
    success: bool
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)


class LoginHistoryListResponse(BaseModel):
    items: List[LoginHistoryOut]
    total: int
    page: int
    limit: int
    total_pages: int


