from datetime import datetime
import math
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth import require_admin
from app.database import get_db
from app.models import LoginHistory, User
from app.schemas import LoginHistoryListResponse, LoginHistoryOut

router = APIRouter(prefix="/login-history", tags=["Login History"])


@router.get("", response_model=LoginHistoryListResponse)
def list_login_history(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Admin-only paginated login audit history.
    Returns user id, user name, user email, attempted email, success boolean, and timestamp.
    Sorted newest first.
    """
    query = (
        db.query(
            LoginHistory.id,
            LoginHistory.user_id,
            User.name.label("user_name"),
            User.email.label("user_email"),
            LoginHistory.attempted_email,
            LoginHistory.success,
            LoginHistory.timestamp,
        )
        .outerjoin(User, User.id == LoginHistory.user_id)
    )

    total = query.count()
    total_pages = math.ceil(total / limit) if total > 0 else 1

    rows = (
        query.order_by(LoginHistory.timestamp.desc(), LoginHistory.id.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    items = [
        LoginHistoryOut(
            id=row.id,
            user_id=row.user_id,
            user_name=row.user_name,
            user_email=row.user_email,
            attempted_email=row.attempted_email,
            success=row.success,
            timestamp=row.timestamp,
        )
        for row in rows
    ]

    return LoginHistoryListResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
    )
