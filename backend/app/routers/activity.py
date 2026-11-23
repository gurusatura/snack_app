from datetime import datetime
import math
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth import require_admin
from app.database import get_db
from app.models import Activity, Snack, User
from app.schemas import ActivityListResponse, ActivityOut

router = APIRouter(prefix="/activity", tags=["activity"])


@router.get("", response_model=ActivityListResponse)
def list_activity(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Admin-only paginated activity log.
    Returns user name, snack name, action, amount, and timestamp,
    joined from activity, users, and snacks tables, sorted newest first.
    """
    query = (
        db.query(
            Activity.id,
            Activity.user_id,
            User.name.label("user_name"),
            User.email.label("user_email"),
            Activity.snack_id,
            Snack.name.label("snack_name"),
            Activity.action,
            Activity.amount,
            Activity.created_at,
        )
        .join(User, User.id == Activity.user_id)
        .join(Snack, Snack.id == Activity.snack_id)
    )

    total = query.count()
    total_pages = math.ceil(total / limit) if total > 0 else 1

    rows = (
        query.order_by(Activity.created_at.desc(), Activity.id.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    items = [
        ActivityOut(
            id=row.id,
            user_id=row.user_id,
            user_name=row.user_name,
            user_email=row.user_email,
            snack_id=row.snack_id,
            snack_name=row.snack_name,
            action=row.action.value if hasattr(row.action, "value") else str(row.action),
            amount=row.amount,
            created_at=row.created_at,
        )
        for row in rows
    ]

    return ActivityListResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
    )
