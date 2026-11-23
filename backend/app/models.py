import enum
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import relationship
from app.database import Base


class UserRole(str, enum.Enum):
    admin = "admin"
    member = "member"


class SnackCategory(str, enum.Enum):
    sweet = "sweet"
    savoury = "savoury"
    drink = "drink"
    healthy_ish = "healthy-ish"


class ActivityAction(str, enum.Enum):
    consumed = "consumed"
    restocked = "restocked"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(
        SAEnum(UserRole, name="user_role_enum", values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    votes = relationship("Vote", back_populates="user", cascade="all, delete-orphan")
    activities = relationship("Activity", back_populates="user")
    login_histories = relationship("LoginHistory", back_populates="user")


class Snack(Base):
    __tablename__ = "snacks"

    __table_args__ = (
        CheckConstraint("quantity >= 0", name="check_snack_quantity_non_negative"),
        CheckConstraint("low_stock_threshold >= 0", name="check_snack_low_stock_threshold_non_negative"),
    )

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, index=True, nullable=False)
    category = Column(
        SAEnum(SnackCategory, name="snack_category_enum", values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )
    quantity = Column(Integer, nullable=False, default=0)
    low_stock_threshold = Column(Integer, nullable=False, default=5)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    votes = relationship("Vote", back_populates="snack", cascade="all, delete-orphan")
    activities = relationship("Activity", back_populates="snack")

    @property
    def status(self) -> str:
        """Derived status: stocked above threshold, running_low from 1 up to threshold, gone at 0."""
        if self.quantity == 0:
            return "gone"
        elif self.quantity <= self.low_stock_threshold:
            return "running_low"
        return "stocked"


class Vote(Base):
    __tablename__ = "votes"

    __table_args__ = (
        UniqueConstraint("user_id", "snack_id", name="uq_vote_user_snack"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    snack_id = Column(
        Integer,
        ForeignKey("snacks.id", ondelete="CASCADE"),
        nullable=False,
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="votes")
    snack = relationship("Snack", back_populates="votes")


class Activity(Base):
    __tablename__ = "activity"

    __table_args__ = (
        CheckConstraint("amount > 0", name="check_activity_amount_positive"),
        Index("ix_activity_user_snack", "user_id", "snack_id"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    snack_id = Column(
        Integer,
        ForeignKey("snacks.id", ondelete="RESTRICT"),
        nullable=False,
    )
    action = Column(
        SAEnum(ActivityAction, name="activity_action_enum", values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )
    amount = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True, nullable=False)

    # Relationships
    user = relationship("User", back_populates="activities")
    snack = relationship("Snack", back_populates="activities")


class IdempotencyKey(Base):
    __tablename__ = "idempotency_keys"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(255), unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    status_code = Column(Integer, nullable=False)
    response_body = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True, nullable=False)

    # Relationships
    user = relationship("User")


class LoginHistory(Base):
    __tablename__ = "login_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    attempted_email = Column(String(255), nullable=True, index=True)
    success = Column(Boolean, nullable=False, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True, nullable=False)

    # Relationships
    user = relationship("User", back_populates="login_histories")
