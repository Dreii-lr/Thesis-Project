"""
firebase.py — Firebase Admin SDK initialisation + helpers.

Reads credentials from the path stored in constants.FIREBASE_CREDENTIALS_PATH.
Never hard-code credentials here; they live exclusively in .env.
"""
from __future__ import annotations

import logging

import firebase_admin
from firebase_admin import auth, credentials
from firebase_admin import exceptions as firebase_exceptions
import httpx
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from app.core.exceptions import AuthenticationUnavailableException, RecoveryRateLimitException, UnauthorizedDomainException
from starlette.concurrency import run_in_threadpool

from app.core.constants import constants, FIREBASE_CONFIG, IDENTITY_TOOLKIT_BASE, SECURE_TOKEN_BASE
from app.features.auth.schemas import TokenResponse

logger = logging.getLogger(__name__)

firebase_app: firebase_admin.App | None = None


def initialize_firebase() -> firebase_admin.App | None:
    global firebase_app
    if firebase_app is not None:
        return firebase_app
    try:
        cred = credentials.Certificate(FIREBASE_CONFIG)
        firebase_app = firebase_admin.initialize_app(cred, options={"httpTimeout": 10})
        logger.info("Firebase Admin SDK initialised.")
        return firebase_app
    except Exception as e:
        logger.error("Failed to initialize Firebase Admin SDK (%s).", type(e).__name__)
        return None


def check_email_in_firebase(email : str):
    if not firebase_app:
        initialize_firebase()
    if not firebase_app:
        return None
    try:
        return auth.get_user_by_email(email)
    except auth.UserNotFoundError:
        return None
    except Exception as exc:
        logger.warning(f"Firebase lookup failed for {email}: {exc}")
        return None
# ── Helpers ───────────────────────────────────────────────────────────────────

def _require_firebase() -> firebase_admin.App:
    if not firebase_app:
        initialize_firebase()
    if not firebase_app:
        raise AuthenticationUnavailableException()
    return firebase_app


@retry(
    retry=retry_if_exception_type((firebase_exceptions.UnavailableError, firebase_exceptions.DeadlineExceededError)),
    stop=stop_after_attempt(2),
    wait=wait_exponential(multiplier=0.5, max=1),
    reraise=True,
)
def _verify_id_token(id_token: str, check_revoked: bool) -> dict:
    return auth.verify_id_token(
        id_token, app=_require_firebase(), check_revoked=check_revoked,
        clock_skew_seconds=constants.FIREBASE_CLOCK_SKEW_SECONDS,
    )


def verify_firebase_id_token(id_token: str, check_revoked: bool = True) -> dict:
    """Reject invalid credentials, but report provider failures as unavailable."""
    try:
        return _verify_id_token(id_token, check_revoked)
    except auth.ExpiredIdTokenError as exc:
        raise UnauthorizedDomainException("Your session needs to be refreshed.", "TOKEN_EXPIRED") from exc
    except auth.RevokedIdTokenError as exc:
        raise UnauthorizedDomainException("Your session was revoked. Please sign in again.", "TOKEN_REVOKED") from exc
    except (auth.UserDisabledError, auth.UserNotFoundError) as exc:
        raise UnauthorizedDomainException("This account is unavailable. Please contact your administrator.", "ACCOUNT_UNAVAILABLE") from exc
    except auth.InvalidIdTokenError as exc:
        logger.warning("Firebase rejected an ID token (%s).", type(exc).__name__)
        raise UnauthorizedDomainException("Your session is invalid. Please sign in again.", "TOKEN_INVALID") from exc
    except AuthenticationUnavailableException:
        raise
    except Exception as exc:
        # Never log tokens, passwords, request URLs with API keys, or provider bodies.
        logger.error("Firebase verification unavailable (%s).", type(exc).__name__)
        raise AuthenticationUnavailableException() from exc

def create_firebase_new_user(email: str, password: str):
    _require_firebase()
    try:
        new_user = auth.create_user(email=email, password=password)
        return new_user
    except Exception as e:
        logger.error("Firebase account creation failed (%s).", type(e).__name__)
        raise AuthenticationUnavailableException("Unable to create the sign-in account. Please try again.") from e

def delete_firebase_user(uid: str):
    try:
        auth.delete_user(uid)
    except Exception as e:
        raise e
def create_custom_token(firebase_uid : str | None, developer_claims : dict | None = None):

    _require_firebase()
    try:
        token = auth.create_custom_token(uid=firebase_uid,developer_claims=developer_claims)

        return token.decode('utf-8')
    except Exception as exc:
        logger.error("Firebase token signing failed (%s).", type(exc).__name__)
        raise AuthenticationUnavailableException() from exc


class _TransientFirebaseError(Exception):
    pass


@retry(
    retry=retry_if_exception_type((httpx.TransportError, _TransientFirebaseError)),
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=0.5, max=2),
    reraise=True,
)
async def _post_token_request(url: str, **kwargs) -> httpx.Response:
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(url, **kwargs)
    if response.status_code >= 500:
        raise _TransientFirebaseError()
    return response


async def _token_request(url: str, rejected_codes: set[str], **kwargs) -> dict | None:
    try:
        response = await _post_token_request(url, **kwargs)
        data = response.json()
        if response.is_success and isinstance(data, dict):
            return data
        error = data.get("error", {}) if isinstance(data, dict) else {}
        message = error.get("message", "") if isinstance(error, dict) else ""
        code = message.split(" : ")[0] if isinstance(message, str) else ""
        if response.status_code == 400 and code in rejected_codes:
            return None
        logger.warning("Firebase token request rejected (HTTP %s).", response.status_code)
    except (httpx.TransportError, _TransientFirebaseError, ValueError, TypeError):
        logger.warning("Firebase token request unavailable.")
    raise AuthenticationUnavailableException()


def _token_pair(data: dict, access_key: str = "idToken", refresh_key: str = "refreshToken") -> TokenResponse:
    access, refresh = data.get(access_key), data.get(refresh_key)
    if not isinstance(access, str) or not access or not isinstance(refresh, str) or not refresh:
        raise AuthenticationUnavailableException()
    return TokenResponse(idToken=access, refreshToken=refresh)


async def exchange_custom_token_for_id_tokens(custom_token: str) -> TokenResponse:
    url = f"{IDENTITY_TOOLKIT_BASE}/accounts:signInWithCustomToken?key={constants.FIREBASE_API_KEY}"
    data = await _token_request(url, set(), json={"token": custom_token, "returnSecureToken": True})
    return _token_pair(data)


async def sign_in_with_password(email: str, password: str) -> dict | None:
    url = f"{IDENTITY_TOOLKIT_BASE}/accounts:signInWithPassword?key={constants.FIREBASE_API_KEY}"
    data = await _token_request(
        url, {"INVALID_LOGIN_CREDENTIALS", "EMAIL_NOT_FOUND", "INVALID_PASSWORD", "USER_DISABLED"},
        json={"email": email, "password": password, "returnSecureToken": True},
    )
    if data is not None:
        _token_pair(data)
        if not isinstance(data.get("localId"), str) or not data["localId"]:
            raise AuthenticationUnavailableException()
    return data


async def send_password_reset_email(firebase_uid: str) -> None:
    """Send Firebase's hosted reset link to the account's actual Firebase email."""
    unavailable_message = "Unable to send the recovery email right now. Please try again later."
    try:
        firebase_user = await run_in_threadpool(auth.get_user, firebase_uid, app=_require_firebase())
        if firebase_user.disabled or not firebase_user.email:
            return
        url = f"{IDENTITY_TOOLKIT_BASE}/accounts:sendOobCode?key={constants.FIREBASE_API_KEY}"
        # Sending email is not idempotent: do not retry an ambiguous timeout and
        # send multiple reset links. Firebase handles codes and email delivery.
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, json={
                "requestType": "PASSWORD_RESET", "email": firebase_user.email,
            })
        data = response.json()
        if response.is_success and isinstance(data, dict):
            return
        error = data.get("error", {}) if isinstance(data, dict) else {}
        message = error.get("message", "") if isinstance(error, dict) else ""
        code = message.split(" : ")[0] if isinstance(message, str) else ""
        if response.status_code == 400 and code in {"EMAIL_NOT_FOUND", "USER_DISABLED"}:
            return  # An account may disappear between lookup and sending.
        if response.status_code == 429 or code in {"TOO_MANY_ATTEMPTS_TRY_LATER", "RESET_PASSWORD_EXCEED_LIMIT"}:
            raise RecoveryRateLimitException()
        logger.warning("Password reset email rejected (HTTP %s).", response.status_code)
    except auth.UserNotFoundError:
        return
    except RecoveryRateLimitException:
        raise
    except Exception as exc:
        # Do not log email addresses, reset codes, API keys, or provider bodies.
        logger.warning("Password reset email unavailable (%s).", type(exc).__name__)
    raise AuthenticationUnavailableException(unavailable_message)


async def refresh_firebase_token(refresh_token: str) -> TokenResponse | None:
    url = f"{SECURE_TOKEN_BASE}/token?key={constants.FIREBASE_API_KEY}"
    data = await _token_request(
        url, {"TOKEN_EXPIRED", "USER_DISABLED", "USER_NOT_FOUND", "INVALID_REFRESH_TOKEN"},
        data={"grant_type": "refresh_token", "refresh_token": refresh_token},
    )
    return _token_pair(data, "id_token", "refresh_token") if data is not None else None

def logout(access_token  : str):
    try:
        if access_token:
            # check_revoked=False here — we're revoking anyway, no need for the
            # extra round-trip just to read the uid out of a still-valid token
            claims = verify_firebase_id_token(access_token, check_revoked=False)

            if claims:
                auth.revoke_refresh_tokens(str(claims["uid"]))
            return True
    except UnauthorizedDomainException:
        # Invalid/expired credentials must not prevent clearing the local cookies.
        return True
    except Exception as exc:
        logger.error("Firebase logout unavailable (%s).", type(exc).__name__)
        raise AuthenticationUnavailableException() from exc


def update_firebase_user_password(firebase_uid: str, password: str) -> bool:
    """
    Updates a user's password in Firebase Authentication using Admin SDK.
    """
    _require_firebase()
    try:
        auth.update_user(firebase_uid, password=password)
        logger.info(f"Firebase password updated successfully for uid: {firebase_uid}")
        return True
    except Exception as exc:
        logger.error(f"Failed to update Firebase password for uid {firebase_uid}: {exc}")
        raise exc


def revoke_firebase_user_tokens(firebase_uid: str) -> bool:
    """
    Revokes all refresh tokens for a user in Firebase Authentication.
    """
    if not firebase_app:
        initialize_firebase()
    if not firebase_app:
        return False
    try:
        auth.revoke_refresh_tokens(firebase_uid)
        logger.info(f"Firebase refresh tokens revoked for uid: {firebase_uid}")
        return True
    except Exception as exc:
        logger.warning(f"Failed to revoke Firebase refresh tokens for uid {firebase_uid}: {exc}")
        return False

