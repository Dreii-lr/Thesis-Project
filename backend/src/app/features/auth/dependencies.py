"""
dependencies.py — Re-exports centralized dependencies from app.core.dependencies.
Maintains backward compatibility across all existing feature routers and test fixtures.
"""
from __future__ import annotations

from app.core.dependencies import (
    get_current_active_user,
    get_current_user,
    require_admin,
    require_roles,
    require_student,
    require_students,
    require_teacher,
    security_bearer,
)

__all__ = [
    "security_bearer",
    "get_current_user",
    "get_current_active_user",
    "require_roles",
    "require_teacher",
    "require_student",
    "require_students",
    "require_admin",
]
