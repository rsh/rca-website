"""Database models for the RCA (Root Cause Analysis) tool."""
from datetime import datetime, timezone
from typing import Any, Dict, List, cast

from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import check_password_hash, generate_password_hash

db = SQLAlchemy()


class User(db.Model):  # type: ignore  # db.Model lacks type stubs
    """User model for authentication and profile management."""

    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    username = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(
        db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    rcas = cast(
        List["Rca"],
        db.relationship("Rca", back_populates="owner", cascade="all, delete-orphan"),
    )

    def set_password(self, password: str) -> None:
        """Hash and set user password."""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        """Check if provided password matches hash."""
        return check_password_hash(self.password_hash, password)

    def to_dict(self, include_email: bool = False) -> Dict[str, Any]:
        """Convert user to dictionary."""
        data: Dict[str, Any] = {
            "id": self.id,
            "username": self.username,
            "created_at": self.created_at.isoformat(),
        }
        if include_email:
            data["email"] = self.email
        return data


class Rca(db.Model):  # type: ignore  # db.Model lacks type stubs
    """Root Cause Analysis model."""

    __tablename__ = "rcas"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    timeline = db.Column(db.Text, nullable=True)
    owner_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(
        db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    owner = cast("User", db.relationship("User", back_populates="rcas"))
    nodes = cast(
        List["WhyNode"],
        db.relationship(
            "WhyNode",
            back_populates="rca",
            cascade="all, delete-orphan",
            order_by="WhyNode.order",
        ),
    )

    def to_dict(self) -> Dict[str, Any]:
        """Convert RCA to dictionary (without nodes)."""
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "timeline": self.timeline,
            "owner": self.owner.to_dict() if self.owner else None,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }

    def to_dict_with_tree(self) -> Dict[str, Any]:
        """Convert RCA to dictionary with full why-node tree."""
        data = self.to_dict()
        # Build tree from flat list
        top_level = [n for n in self.nodes if n.parent_id is None]
        data["nodes"] = [
            n.to_tree_dict() for n in sorted(top_level, key=lambda n: n.order)
        ]
        return data


class WhyNode(db.Model):  # type: ignore  # db.Model lacks type stubs
    """A node in the 5 Whys tree."""

    __tablename__ = "why_nodes"

    id = db.Column(db.Integer, primary_key=True)
    rca_id = db.Column(db.Integer, db.ForeignKey("rcas.id"), nullable=False)
    parent_id = db.Column(db.Integer, db.ForeignKey("why_nodes.id"), nullable=True)
    node_type = db.Column(db.String(20), nullable=False, default="why")
    content = db.Column(db.Text, nullable=False)
    order = db.Column(db.Integer, nullable=False, default=0)
    created_at = db.Column(
        db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    rca = cast("Rca", db.relationship("Rca", back_populates="nodes"))
    children = cast(
        List["WhyNode"],
        db.relationship(
            "WhyNode",
            backref=db.backref("parent", remote_side="WhyNode.id"),
            cascade="all, delete-orphan",
            order_by="WhyNode.order",
        ),
    )

    def to_dict(self) -> Dict[str, Any]:
        """Convert node to flat dictionary."""
        return {
            "id": self.id,
            "rca_id": self.rca_id,
            "parent_id": self.parent_id,
            "node_type": self.node_type,
            "content": self.content,
            "order": self.order,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }

    def to_tree_dict(self) -> Dict[str, Any]:
        """Convert node to dictionary with recursive children."""
        data = self.to_dict()
        sorted_children: List[WhyNode] = sorted(self.children, key=lambda c: c.order)
        data["children"] = [c.to_tree_dict() for c in sorted_children]
        return data
