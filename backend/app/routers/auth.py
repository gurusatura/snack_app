from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, UserRole
from app.security import hash_password, verify_password
from app.auth import create_access_token
from app.schemas import LoginRequest, LoginResponse, RegisterRequest, UserOut

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    """
    Authenticate with email + password, return JWT + user info.
    JWT contains only user id and expiry — role is always re-fetched from DB.
    """
    user = db.query(User).filter(User.email == body.email).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": {"code": "INVALID_CREDENTIALS", "message": "Invalid email or password."}},
        )

    if not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": {"code": "INVALID_CREDENTIALS", "message": "Invalid email or password."}},
        )

    token = create_access_token(user.id)
    return LoginResponse(
        token=token,
        user=UserOut.model_validate(user),
    )


@router.post("/register", response_model=LoginResponse, status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    """
    Register a new user account.
    SAFEGUARDS:
    1. Role is strictly hardcoded to UserRole.member — admin role can NEVER be self-assigned.
    2. Email uniqueness enforced at DB and application layer (returns 409 EMAIL_ALREADY_EXISTS).
    3. Password securely hashed with salted bcrypt.
    4. Automatically returns JWT token and UserOut for seamless instant login.
    """
    clean_email = body.email.strip().lower()
    clean_name = body.name.strip()

    if not clean_name:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error": {"code": "INVALID_NAME", "message": "Name cannot be empty or whitespace only."}},
        )

    # Check email uniqueness
    existing = db.query(User).filter(func.lower(User.email) == clean_email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "error": {
                    "code": "EMAIL_ALREADY_EXISTS",
                    "message": "An account with this email already exists.",
                }
            },
        )

    # Create new member (ROLE IS HARDCODED TO MEMBER: NEVER TRUSTED FROM BODY)
    new_user = User(
        name=clean_name,
        email=clean_email,
        password_hash=hash_password(body.password),
        role=UserRole.member,
    )

    try:
        db.add(new_user)
        db.flush()
        user_out = UserOut(
            id=new_user.id,
            name=new_user.name,
            email=new_user.email,
            role=new_user.role.value if hasattr(new_user.role, "value") else str(new_user.role),
        )
        token = create_access_token(new_user.id)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "error": {
                    "code": "EMAIL_ALREADY_EXISTS",
                    "message": "An account with this email already exists.",
                }
            },
        )

    return LoginResponse(
        token=token,
        user=user_out,
    )
