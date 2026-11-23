from datetime import datetime, timedelta, timezone
import math
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, case, func, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth import get_current_user, require_admin
from app.database import get_db
from app.models import Activity, ActivityAction, Snack, SnackCategory, User, Vote
from app.schemas import (
    AmountActionRequest,
    SnackCreate,
    SnackListResponse,
    SnackOfTheWeekOut,
    SnackOut,
    SnackSummaryResponse,
    SnackUpdate,
    StockSummaryOut,
)

router = APIRouter(prefix="/snacks", tags=["Snacks"])


def _snack_to_out(snack: Snack, user_id: int, db: Session) -> SnackOut:
    votes_count = db.query(Vote).filter(Vote.snack_id == snack.id).count()
    user_voted = db.query(Vote).filter(Vote.snack_id == snack.id, Vote.user_id == user_id).first() is not None
    return SnackOut(
        id=snack.id,
        name=snack.name,
        category=snack.category.value if hasattr(snack.category, "value") else str(snack.category),
        quantity=snack.quantity,
        low_stock_threshold=snack.low_stock_threshold,
        status=snack.status,
        created_at=snack.created_at,
        votes_count=votes_count,
        user_voted=user_voted,
    )


# -------------------------------------------------------------
# Summary endpoint MUST come before /{snack_id}
# -------------------------------------------------------------

@router.get("/summary", response_model=SnackSummaryResponse)
def get_snacks_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns counts per status and the Snack of the Week (highest votes in last 7 days).
    """
    # 1. Stock counts computed via SQL
    summary_row = db.query(
        func.count().filter(Snack.quantity == 0).label("gone"),
        func.count().filter(and_(Snack.quantity > 0, Snack.quantity <= Snack.low_stock_threshold)).label("running_low"),
        func.count().filter(Snack.quantity > Snack.low_stock_threshold).label("stocked"),
    ).one()

    stock_summary = StockSummaryOut(
        gone=summary_row.gone or 0,
        running_low=summary_row.running_low or 0,
        stocked=summary_row.stocked or 0,
    )

    # 2. Snack of the Week: highest vote count in last 7 days, tie broken by earliest-created snack
    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
    sotw_row = (
        db.query(
            Snack.id,
            Snack.name,
            func.count(Vote.id).label("vote_count"),
        )
        .join(Vote, Vote.snack_id == Snack.id)
        .filter(Vote.created_at >= seven_days_ago)
        .group_by(Snack.id, Snack.name, Snack.created_at)
        .order_by(func.count(Vote.id).desc(), Snack.created_at.asc())
        .first()
    )

    snack_of_the_week = None
    if sotw_row and sotw_row.vote_count > 0:
        snack_of_the_week = SnackOfTheWeekOut(
            id=sotw_row.id,
            name=sotw_row.name,
            votes=sotw_row.vote_count,
        )

    return SnackSummaryResponse(
        stock_summary=stock_summary,
        snack_of_the_week=snack_of_the_week,
    )


# -------------------------------------------------------------
# List Snacks (Member+)
# -------------------------------------------------------------

@router.get("", response_model=SnackListResponse)
def list_snacks(
    category: Optional[SnackCategory] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = None,
    sort: Optional[str] = Query(None, description="Sort order: name_asc, name_desc, quantity_asc, quantity_desc, votes_desc"),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    List snacks with SQL-level filtering for category, derived status, case-insensitive search, and sorting.
    """
    query = db.query(Snack)

    # Search filter (case-insensitive partial match)
    if search and search.strip():
        query = query.filter(Snack.name.ilike(f"%{search.strip()}%"))

    # Category filter
    if category is not None:
        query = query.filter(Snack.category == category)

    # Status filter at SQL level
    if status_filter:
        status_clean = status_filter.strip().lower()
        if status_clean == "gone":
            query = query.filter(Snack.quantity == 0)
        elif status_clean == "running_low":
            query = query.filter(and_(Snack.quantity > 0, Snack.quantity <= Snack.low_stock_threshold))
        elif status_clean == "stocked":
            query = query.filter(Snack.quantity > Snack.low_stock_threshold)

    total = query.count()
    total_pages = math.ceil(total / limit) if total > 0 else 1

    # Sorting options via SQL ORDER BY
    if sort in ("name_asc", "name"):
        order_clauses = [Snack.name.asc()]
    elif sort == "name_desc":
        order_clauses = [Snack.name.desc()]
    elif sort in ("quantity_asc", "quantity"):
        order_clauses = [Snack.quantity.asc(), Snack.name.asc()]
    elif sort == "quantity_desc":
        order_clauses = [Snack.quantity.desc(), Snack.name.asc()]
    elif sort in ("votes_desc", "votes", "popular"):
        vote_subquery = (
            select(func.count(Vote.id))
            .where(Vote.snack_id == Snack.id)
            .scalar_subquery()
        )
        order_clauses = [vote_subquery.desc(), Snack.name.asc()]
    else:
        order_clauses = [Snack.id.asc()]

    snacks = (
        query.order_by(*order_clauses)
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    if snacks:
        snack_ids = [s.id for s in snacks]

        # 1. Bulk vote counts in a single SQL query
        vote_counts_rows = (
            db.query(Vote.snack_id, func.count(Vote.id))
            .filter(Vote.snack_id.in_(snack_ids))
            .group_by(Vote.snack_id)
            .all()
        )
        vote_counts_map = {row[0]: row[1] for row in vote_counts_rows}

        # 2. Bulk user votes in a single SQL query
        user_voted_rows = (
            db.query(Vote.snack_id)
            .filter(Vote.snack_id.in_(snack_ids), Vote.user_id == current_user.id)
            .all()
        )
        user_voted_set = {row[0] for row in user_voted_rows}

        items = [
            SnackOut(
                id=s.id,
                name=s.name,
                category=s.category.value if hasattr(s.category, "value") else str(s.category),
                quantity=s.quantity,
                low_stock_threshold=s.low_stock_threshold,
                status=s.status,
                created_at=s.created_at,
                votes_count=vote_counts_map.get(s.id, 0),
                user_voted=s.id in user_voted_set,
            )
            for s in snacks
        ]
    else:
        items = []

    return SnackListResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
    )


# -------------------------------------------------------------
# Get Snack by ID (Member+)
# -------------------------------------------------------------

@router.get("/{snack_id}", response_model=SnackOut)
def get_snack(
    snack_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    snack = db.query(Snack).filter(Snack.id == snack_id).first()
    if not snack:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "SNACK_NOT_FOUND", "message": "Snack not found."}},
        )
    return _snack_to_out(snack, current_user.id, db)


# -------------------------------------------------------------
# Create Snack (Admin)
# -------------------------------------------------------------

@router.post("", response_model=SnackOut, status_code=status.HTTP_201_CREATED)
def create_snack(
    body: SnackCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    # Check name uniqueness
    existing = db.query(Snack).filter(Snack.name == body.name.strip()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"error": {"code": "SNACK_ALREADY_EXISTS", "message": "A snack with this name already exists."}},
        )

    snack = Snack(
        name=body.name.strip(),
        category=body.category,
        quantity=body.quantity,
        low_stock_threshold=body.low_stock_threshold,
    )
    db.add(snack)
    db.commit()
    db.refresh(snack)
    return _snack_to_out(snack, current_user.id, db)


# -------------------------------------------------------------
# Update Snack (Admin)
# -------------------------------------------------------------

@router.patch("/{snack_id}", response_model=SnackOut)
def update_snack(
    snack_id: int,
    body: SnackUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    snack = db.query(Snack).filter(Snack.id == snack_id).first()
    if not snack:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "SNACK_NOT_FOUND", "message": "Snack not found."}},
        )

    if body.name is not None and body.name.strip() != snack.name:
        existing = db.query(Snack).filter(Snack.name == body.name.strip(), Snack.id != snack_id).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={"error": {"code": "SNACK_ALREADY_EXISTS", "message": "A snack with this name already exists."}},
            )
        snack.name = body.name.strip()

    if body.category is not None:
        snack.category = body.category
    if body.quantity is not None:
        snack.quantity = body.quantity
    if body.low_stock_threshold is not None:
        snack.low_stock_threshold = body.low_stock_threshold

    db.commit()
    db.refresh(snack)
    return _snack_to_out(snack, current_user.id, db)


# -------------------------------------------------------------
# Delete Snack (Admin)
# -------------------------------------------------------------

@router.delete("/{snack_id}")
def delete_snack(
    snack_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    snack = db.query(Snack).filter(Snack.id == snack_id).first()
    if not snack:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "SNACK_NOT_FOUND", "message": "Snack not found."}},
        )

    try:
        db.delete(snack)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "error": {
                    "code": "CANNOT_DELETE_SNACK",
                    "message": "Cannot delete snack with existing activity history.",
                }
            },
        )

    return {"message": "Snack deleted successfully.", "snack_id": snack_id}


# -------------------------------------------------------------
# Consume Snack (Member+) — CRITICAL: 2-query Atomic Pattern
# -------------------------------------------------------------

@router.post("/{snack_id}/consume")
def consume_snack(
    snack_id: int,
    body: AmountActionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Atomic consumption:
    1. Check snack existence (SELECT id FROM snacks WHERE id=:id) -> 404 if not found.
    2. Atomic UPDATE (UPDATE snacks SET quantity = quantity - :amount WHERE id=:id AND quantity >= :amount RETURNING quantity).
       -> 409 INSUFFICIENT_STOCK if 0 rows affected.
    3. Insert activity record in the SAME transaction.
    """
    # Query 1: Check existence
    existence = db.execute(text("SELECT id FROM snacks WHERE id = :id"), {"id": snack_id}).fetchone()
    if not existence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "SNACK_NOT_FOUND", "message": "Snack not found."}},
        )

    # Query 2: Atomic update with RETURNING
    result = db.execute(
        text(
            "UPDATE snacks SET quantity = quantity - :amount "
            "WHERE id = :id AND quantity >= :amount RETURNING quantity"
        ),
        {"id": snack_id, "amount": body.amount},
    )
    row = result.fetchone()

    if row is None:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "error": {
                    "code": "INSUFFICIENT_STOCK",
                    "message": "Someone beat you to the last packet! Not enough stock remaining.",
                }
            },
        )

    new_quantity = row[0]

    # Query 3 (in same transaction): Record activity
    activity = Activity(
        user_id=current_user.id,
        snack_id=snack_id,
        action=ActivityAction.consumed,
        amount=body.amount,
    )
    db.add(activity)
    db.commit()

    return {
        "snack_id": snack_id,
        "amount_consumed": body.amount,
        "remaining_quantity": new_quantity,
    }


# -------------------------------------------------------------
# Restock Snack (Admin) — Single Atomic SQL Pattern
# -------------------------------------------------------------

@router.post("/{snack_id}/restock")
def restock_snack(
    snack_id: int,
    body: AmountActionRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Atomic restock:
    1. Check snack existence -> 404 if not found.
    2. Atomic UPDATE (UPDATE snacks SET quantity = quantity + :amount WHERE id=:id RETURNING quantity).
    3. Insert activity record in the SAME transaction.
    """
    # Query 1: Check existence
    existence = db.execute(text("SELECT id FROM snacks WHERE id = :id"), {"id": snack_id}).fetchone()
    if not existence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "SNACK_NOT_FOUND", "message": "Snack not found."}},
        )

    # Query 2: Atomic restock
    result = db.execute(
        text(
            "UPDATE snacks SET quantity = quantity + :amount "
            "WHERE id = :id RETURNING quantity"
        ),
        {"id": snack_id, "amount": body.amount},
    )
    new_quantity = result.fetchone()[0]

    # Record activity in same transaction
    activity = Activity(
        user_id=current_user.id,
        snack_id=snack_id,
        action=ActivityAction.restocked,
        amount=body.amount,
    )
    db.add(activity)
    db.commit()

    return {
        "snack_id": snack_id,
        "amount_restocked": body.amount,
        "new_quantity": new_quantity,
    }


# -------------------------------------------------------------
# Vote for Snack (Member+) — Rely on Schema Constraint
# -------------------------------------------------------------

@router.post("/{snack_id}/vote", status_code=status.HTTP_201_CREATED)
def vote_for_snack(
    snack_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Check snack existence
    snack = db.query(Snack).filter(Snack.id == snack_id).first()
    if not snack:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "SNACK_NOT_FOUND", "message": "Snack not found."}},
        )

    vote = Vote(user_id=current_user.id, snack_id=snack_id)
    db.add(vote)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"error": {"code": "ALREADY_VOTED", "message": "You have already voted for this snack."}},
        )

    return {"message": "Vote recorded.", "snack_id": snack_id}


# -------------------------------------------------------------
# Remove Vote for Snack (Member+)
# -------------------------------------------------------------

@router.delete("/{snack_id}/vote")
def remove_vote_for_snack(
    snack_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Check snack existence
    snack = db.query(Snack).filter(Snack.id == snack_id).first()
    if not snack:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "SNACK_NOT_FOUND", "message": "Snack not found."}},
        )

    vote = db.query(Vote).filter(Vote.user_id == current_user.id, Vote.snack_id == snack_id).first()
    if not vote:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "VOTE_NOT_FOUND", "message": "You have not voted for this snack."}},
        )

    db.delete(vote)
    db.commit()

    return {"message": "Vote removed.", "snack_id": snack_id}
