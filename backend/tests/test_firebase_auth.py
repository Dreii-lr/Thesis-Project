"""Provider failures must never masquerade as expired credentials."""
from unittest.mock import Mock
from types import SimpleNamespace
from datetime import datetime, timezone
import json
import time

import httpx
import pytest
from firebase_admin import auth, exceptions
from firebase_admin import _token_gen
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization
import jwt
from google.auth import _helpers

from app.core import firebase
from app.core.exceptions import DomainAuthenticationUnavailableException, DomainUnauthorizedDomainException


@pytest.fixture(autouse=True)
def setup_test_db():
    yield  # No database is used by these provider tests.


@pytest.fixture(autouse=True)
def initialized_firebase(monkeypatch):
    monkeypatch.setattr(firebase, "firebase_app", object())


def test_verifier_allows_small_clock_skew_without_disabling_revocation(monkeypatch):
    verify = Mock(return_value={"uid": "user-1"})
    monkeypatch.setattr(firebase.auth, "verify_id_token", verify)
    assert firebase.verify_firebase_id_token("token") == {"uid": "user-1"}
    assert verify.call_args.kwargs["check_revoked"] is True
    assert verify.call_args.kwargs["clock_skew_seconds"] == firebase.constants.FIREBASE_CLOCK_SKEW_SECONDS


@pytest.mark.parametrize("error,code", [
    (auth.ExpiredIdTokenError("expired", None), "TOKEN_EXPIRED"),
    (auth.RevokedIdTokenError("revoked"), "TOKEN_REVOKED"),
    (auth.InvalidIdTokenError("invalid"), "TOKEN_INVALID"),
    (auth.UserDisabledError("disabled"), "ACCOUNT_UNAVAILABLE"),
])
def test_invalid_credentials_are_not_retried(monkeypatch, error, code):
    verify = Mock(side_effect=error)
    monkeypatch.setattr(firebase.auth, "verify_id_token", verify)
    with pytest.raises(DomainUnauthorizedDomainException) as caught:
        firebase.verify_firebase_id_token("token")
    assert caught.value.error_code == code
    assert verify.call_count == 1


def test_transient_verification_failure_recovers(monkeypatch):
    verify = Mock(side_effect=[exceptions.UnavailableError("offline"), {"uid": "user-1"}])
    monkeypatch.setattr(firebase.auth, "verify_id_token", verify)
    assert firebase.verify_firebase_id_token("token")["uid"] == "user-1"
    assert verify.call_count == 2


def test_verification_outage_is_not_unauthorized(monkeypatch):
    verify = Mock(side_effect=exceptions.UnavailableError("offline"))
    monkeypatch.setattr(firebase.auth, "verify_id_token", verify)
    with pytest.raises(DomainAuthenticationUnavailableException):
        firebase.verify_firebase_id_token("token")
    assert verify.call_count == 2


def mock_provider(monkeypatch, responses):
    calls = []
    def handle(request):
        calls.append(request)
        result = responses[min(len(calls) - 1, len(responses) - 1)]
        if isinstance(result, Exception):
            raise result
        return result
    real_client = httpx.AsyncClient
    monkeypatch.setattr(firebase.httpx, "AsyncClient", lambda **kwargs: real_client(
        transport=httpx.MockTransport(handle), **kwargs,
    ))
    return calls


@pytest.mark.asyncio
async def test_refresh_recovers_from_transient_provider_failure(monkeypatch):
    calls = mock_provider(monkeypatch, [
        httpx.Response(503),
        httpx.Response(200, json={"id_token": "new-access", "refresh_token": "new-refresh"}),
    ])
    tokens = await firebase.refresh_firebase_token("old-refresh")
    assert tokens.idToken == "new-access"
    assert tokens.refreshToken == "new-refresh"
    assert len(calls) == 2


@pytest.mark.asyncio
@pytest.mark.parametrize("response", [httpx.Response(503), httpx.ConnectTimeout("offline")])
async def test_refresh_outage_is_bounded_and_not_session_expiry(monkeypatch, response):
    calls = mock_provider(monkeypatch, [response])
    with pytest.raises(DomainAuthenticationUnavailableException):
        await firebase.refresh_firebase_token("refresh")
    assert len(calls) == 3


@pytest.mark.asyncio
async def test_revoked_refresh_is_not_retried(monkeypatch):
    calls = mock_provider(monkeypatch, [httpx.Response(400, json={"error": {"message": "TOKEN_EXPIRED"}})])
    assert await firebase.refresh_firebase_token("revoked") is None
    assert len(calls) == 1


@pytest.mark.asyncio
@pytest.mark.parametrize("response", [
    httpx.Response(400, json={"error": {"message": "API_KEY_INVALID"}}),
    httpx.Response(429, json={"error": {"message": "TOO_MANY_ATTEMPTS_TRY_LATER"}}),
    httpx.Response(200, json={"id_token": "", "refresh_token": ""}),
    httpx.Response(200, text="invalid json"),
])
async def test_configuration_throttling_and_bad_responses_are_not_expiry(monkeypatch, response):
    calls = mock_provider(monkeypatch, [response])
    with pytest.raises(DomainAuthenticationUnavailableException):
        await firebase.refresh_firebase_token("refresh")
    assert len(calls) == 1


def test_real_signed_token_tolerates_small_skew_but_rejects_invalid_tokens(monkeypatch):
    monkeypatch.delenv("FIREBASE_AUTH_EMULATOR_HOST", raising=False)
    now = int(time.time())
    monkeypatch.setattr(_helpers, "utcnow", lambda: datetime.fromtimestamp(now, timezone.utc).replace(tzinfo=None))
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    public_key = key.public_key().public_bytes(serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo).decode()
    verifier = _token_gen.TokenVerifier(SimpleNamespace(options={}, project_id="test-project"))
    verifier.request = Mock(return_value=SimpleNamespace(status=200, data=json.dumps({"test-key": public_key}).encode()))
    def token(**overrides):
        claims = {"sub": "test-user", "aud": "test-project", "iss": "https://securetoken.google.com/test-project", "iat": now + 2, "exp": now + 3600}
        claims.update(overrides)
        return jwt.encode(claims, key, algorithm="RS256", headers={"kid": "test-key"})
    with pytest.raises(auth.InvalidIdTokenError):
        verifier.verify_id_token(token(), clock_skew_seconds=0)
    assert verifier.verify_id_token(token(), clock_skew_seconds=5)["uid"] == "test-user"
    for invalid in [token(iat=now + 120), token(aud="another-project"), token(iss="https://attacker.invalid")]:
        with pytest.raises(auth.InvalidIdTokenError):
            verifier.verify_id_token(invalid, clock_skew_seconds=5)
    with pytest.raises(auth.ExpiredIdTokenError):
        verifier.verify_id_token(token(iat=now - 3600, exp=now - 60), clock_skew_seconds=5)
    wrong_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    forged = jwt.encode(jwt.decode(token(), options={"verify_signature": False}), wrong_key, algorithm="RS256", headers={"kid": "test-key"})
    with pytest.raises(auth.InvalidIdTokenError):
        verifier.verify_id_token(forged, clock_skew_seconds=5)


def test_failed_account_creation_never_fabricates_a_uid(monkeypatch):
    monkeypatch.setattr(firebase.auth, "create_user", Mock(side_effect=exceptions.UnavailableError("offline")))
    with pytest.raises(DomainAuthenticationUnavailableException):
        firebase.create_firebase_new_user("user@example.com", "password")
