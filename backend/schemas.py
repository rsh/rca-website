"""Pydantic schemas for request/response validation."""
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator


class RegisterRequest(BaseModel):
    """Schema for user registration."""

    email: EmailStr
    username: str = Field(min_length=3, max_length=120)
    password: str = Field(min_length=8)

    @field_validator("username")
    @classmethod
    def username_alphanumeric(cls, v: str) -> str:
        """Validate username is alphanumeric."""
        if not v.replace("_", "").replace("-", "").isalnum():
            raise ValueError(
                "Username must be alphanumeric (underscores and hyphens allowed)"
            )
        return v


class LoginRequest(BaseModel):
    """Schema for user login."""

    email: EmailStr
    password: str


class RcaCreateRequest(BaseModel):
    """Schema for creating an RCA."""

    name: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None
    timeline: Optional[str] = None


class RcaUpdateRequest(BaseModel):
    """Schema for updating an RCA."""

    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    timeline: Optional[str] = None


class WhyNodeCreateRequest(BaseModel):
    """Schema for creating a why node."""

    parent_id: Optional[int] = None
    node_type: str = Field(default="why", pattern="^(why|root_cause)$")
    content: str = Field(min_length=1)


class WhyNodeUpdateRequest(BaseModel):
    """Schema for updating a why node."""

    content: Optional[str] = Field(None, min_length=1)
    node_type: Optional[str] = Field(None, pattern="^(why|root_cause)$")
