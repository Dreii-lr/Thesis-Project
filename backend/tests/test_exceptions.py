"""
test_exceptions.py — Unit tests for domain exception to custom HTTP exception mapping.
"""
from __future__ import annotations

from fastapi import status
from fastapi.testclient import TestClient
import pytest

from app.core.exceptions import (
    CustomConflictHTTPException,
    CustomNotFoundHTTPException,
    DomainException,
    EntityAlreadyExistsException,
    EntityNotFoundException,
    InvalidCredentialsException,
    map_domain_to_http_exception,
)
from app.main import app

client = TestClient(app)


def test_domain_exception_mapping():
    # 1. EntityNotFoundException -> CustomNotFoundHTTPException (404)
    domain_not_found = EntityNotFoundException("Test entity missing.")
    http_exc = map_domain_to_http_exception(domain_not_found)
    assert isinstance(http_exc, CustomNotFoundHTTPException)
    assert http_exc.status_code == status.HTTP_404_NOT_FOUND
    assert http_exc.error_code == "NOT_FOUND"
    assert http_exc.detail == "Test entity missing."

    # 2. EntityAlreadyExistsException -> CustomConflictHTTPException (409)
    domain_conflict = EntityAlreadyExistsException("Test duplicate.")
    http_exc_conflict = map_domain_to_http_exception(domain_conflict)
    assert isinstance(http_exc_conflict, CustomConflictHTTPException)
    assert http_exc_conflict.status_code == status.HTTP_409_CONFLICT
    assert http_exc_conflict.error_code == "CONFLICT"

    # 3. Unmapped DomainException fallback
    unknown_domain_exc = DomainException("Unknown business error.", error_code="CUSTOM_ERR")
    fallback_http = map_domain_to_http_exception(unknown_domain_exc)
    assert fallback_http.status_code == status.HTTP_400_BAD_REQUEST


def test_domain_exception_fastapi_handler():
    # Define temporary endpoint raising pure DomainException
    @app.get("/test-domain-exception")
    def test_route():
        raise InvalidCredentialsException("Domain credentials invalid.")

    response = client.get("/test-domain-exception")
    assert response.status_code == 401
    json_data = response.json()
    assert json_data["success"] is False
    assert json_data["error_code"] == "UNAUTHORIZED"
    assert json_data["message"] == "Domain credentials invalid."
