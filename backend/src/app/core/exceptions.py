"""
exceptions.py — Domain exceptions, custom HTTP exceptions, and mapping handlers.

Architecture:
  1. Domain Exceptions: Pure Python exceptions (inheriting from Exception) with zero
     FastAPI/HTTP dependency. Raised inside domain, services, and repositories.
  2. Custom HTTP Exceptions: Inherit from FastAPI HTTPException. Carries HTTP status_code,
     detail, and error_code.
  3. Domain Mapper & Handlers: Automatically maps Domain Exceptions to Custom HTTP Exceptions
     in FastAPI global exception handlers, returning structured JSON error envelopes:

     {
         "success": false,
         "error_code": "NOT_FOUND",
         "message": "User not found."
     }
"""
from __future__ import annotations

from typing import Type

from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse


# ==============================================================================
# 1. PURE DOMAIN EXCEPTIONS (Zero FastAPI / HTTP dependency)
# ==============================================================================

class DomainException(Exception):
    """Base exception for all domain logic and business rules."""

    def __init__(self, message: str, error_code: str = "DOMAIN_ERROR") -> None:
        super().__init__(message)
        self.message = message
        self.error_code = error_code


class EntityNotFoundException(DomainException):
    """Raised when a requested domain entity is missing."""

    def __init__(self, message: str = "Requested entity was not found.") -> None:
        super().__init__(message, error_code="NOT_FOUND")


class EntityAlreadyExistsException(DomainException):
    """Raised when a domain entity already exists (e.g. duplicate email)."""

    def __init__(self, message: str = "Entity already exists.") -> None:
        super().__init__(message, error_code="CONFLICT")


class InvalidCredentialsException(DomainException):
    """Raised when user credentials (password/token) fail validation."""

    def __init__(self, message: str = "Invalid credentials provided.") -> None:
        super().__init__(message, error_code="UNAUTHORIZED")


class UnauthorizedDomainException(DomainException):
    """Raised when an operation lacks authentication."""

    def __init__(self, message: str = "Authentication required.") -> None:
        super().__init__(message, error_code="UNAUTHORIZED")


class ForbiddenDomainException(DomainException):
    """Raised when an authenticated user lacks permission for an action."""

    def __init__(self, message: str = "Operation forbidden for your role.") -> None:
        super().__init__(message, error_code="FORBIDDEN")


class ValidationDomainException(DomainException):
    """Raised when domain parameters or payload fail business validation."""

    def __init__(self, message: str = "Validation error.") -> None:
        super().__init__(message, error_code="BAD_REQUEST")


class SessionExpiredException(DomainException):
    """Raised when a user session or token has expired."""

    def __init__(self, message: str = "Session or token has expired.") -> None:
        super().__init__(message, error_code="UNAUTHORIZED")


class SessionRevokedException(DomainException):
    """Raised when a user session has been revoked."""

    def __init__(self, message: str = "Session has been revoked.") -> None:
        super().__init__(message, error_code="UNAUTHORIZED")


# ==============================================================================
# 2. CUSTOM HTTP EXCEPTIONS (FastAPI / Web coupled)
# ==============================================================================

class CustomHTTPException(HTTPException):
    """Custom HTTP Exception wrapping FastAPI HTTPException with machine-readable error_code."""

    def __init__(
        self,
        status_code: int,
        detail: str,
        error_code: str = "HTTP_ERROR",
    ) -> None:
        super().__init__(status_code=status_code, detail=detail)
        self.error_code = error_code


class CustomNotFoundHTTPException(CustomHTTPException):
    def __init__(self, detail: str = "Resource not found.") -> None:
        super().__init__(status.HTTP_404_NOT_FOUND, detail, "NOT_FOUND")


class CustomConflictHTTPException(CustomHTTPException):
    def __init__(self, detail: str = "Conflict occurred.") -> None:
        super().__init__(status.HTTP_409_CONFLICT, detail, "CONFLICT")


class CustomUnauthorizedHTTPException(CustomHTTPException):
    def __init__(self, detail: str = "Authentication required.") -> None:
        super().__init__(status.HTTP_401_UNAUTHORIZED, detail, "UNAUTHORIZED")


class CustomForbiddenHTTPException(CustomHTTPException):
    def __init__(self, detail: str = "Access forbidden.") -> None:
        super().__init__(status.HTTP_403_FORBIDDEN, detail, "FORBIDDEN")


class CustomBadRequestHTTPException(CustomHTTPException):
    def __init__(self, detail: str = "Bad request.") -> None:
        super().__init__(status.HTTP_400_BAD_REQUEST, detail, "BAD_REQUEST")


class CustomInternalServerErrorHTTPException(CustomHTTPException):
    def __init__(self, detail: str = "Internal server error.") -> None:
        super().__init__(status.HTTP_500_INTERNAL_SERVER_ERROR, detail, "INTERNAL_SERVER_ERROR")


# Backward compatibility aliases
AppException = CustomHTTPException
NotFoundException = CustomNotFoundHTTPException
ConflictException = CustomConflictHTTPException
UnauthorizedException = CustomUnauthorizedHTTPException
ForbiddenException = CustomForbiddenHTTPException
BadRequestException = CustomBadRequestHTTPException


# ==============================================================================
# 3. DOMAIN EXCEPTION TO CUSTOM HTTP EXCEPTION MAPPER
# ==============================================================================

DOMAIN_TO_HTTP_MAP: dict[Type[DomainException], Type[CustomHTTPException]] = {
    EntityNotFoundException: CustomNotFoundHTTPException,
    EntityAlreadyExistsException: CustomConflictHTTPException,
    InvalidCredentialsException: CustomUnauthorizedHTTPException,
    UnauthorizedDomainException: CustomUnauthorizedHTTPException,
    ForbiddenDomainException: CustomForbiddenHTTPException,
    ValidationDomainException: CustomBadRequestHTTPException,
    SessionExpiredException: CustomUnauthorizedHTTPException,
    SessionRevokedException: CustomUnauthorizedHTTPException,
}


def map_domain_to_http_exception(domain_exc: DomainException) -> CustomHTTPException:
    """
    Translates a pure DomainException into its corresponding CustomHTTPException.
    """
    exc_class = type(domain_exc)
    http_exc_class = DOMAIN_TO_HTTP_MAP.get(exc_class, CustomBadRequestHTTPException)
    return http_exc_class(detail=domain_exc.message)


# ==============================================================================
# 4. GLOBAL FASTAPI EXCEPTION HANDLERS
# ==============================================================================

async def domain_exception_handler(request: Request, exc: DomainException) -> JSONResponse:
    """Catches domain exceptions and maps them to HTTP responses."""
    http_exc = map_domain_to_http_exception(exc)
    return JSONResponse(
        status_code=http_exc.status_code,
        content={"success": False, "error_code": http_exc.error_code, "message": http_exc.detail},
    )


async def custom_http_exception_handler(request: Request, exc: CustomHTTPException) -> JSONResponse:
    """Catches CustomHTTPException instances."""
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "error_code": exc.error_code, "message": exc.detail},
    )


async def app_exception_handler(request: Request, exc: CustomHTTPException) -> JSONResponse:
    return await custom_http_exception_handler(request, exc)


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    error_code = getattr(exc, "error_code", "HTTP_ERROR")
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "error_code": error_code, "message": exc.detail},
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error_code": "INTERNAL_SERVER_ERROR",
            "message": "An unexpected error occurred.",
        },
    )
