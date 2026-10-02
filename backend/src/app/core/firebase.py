"""
firebase.py — Firebase Admin SDK initialisation + helpers.

Reads credentials from the path stored in constants.FIREBASE_CREDENTIALS_PATH.
Never hard-code credentials here; they live exclusively in .env.
"""
from __future__ import annotations

import logging
import os

import firebase_admin
from firebase_admin import auth, credentials
from sentry_sdk.integrations import httpx

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
        firebase_app = firebase_admin.initialize_app(cred)
        logger.info("Firebase Admin SDK initialised.")
        return firebase_app
    except Exception as e:
        logger.error(f"Failed to initialize Firebase Admin SDK: {e}")
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

def verify_firebase_id_token(id_token: str,check_revoked =True) -> dict | None:
    """
    Verify a Firebase ID token and return its decoded claims dict.
    Returns None if verification fails or Firebase is uninitialized.
    """
    if not firebase_app:
        initialize_firebase()
    if not firebase_app:
        return None
    try:
        return auth.verify_id_token(id_token,check_revoked=check_revoked)
    except Exception as e:
        logger.warning(f"Firebase token verification failed: {e}")
        return None

def create_firebase_new_user(email: str, password: str):
    if not firebase_app:
        initialize_firebase()
    if not firebase_app:
        logger.warning("Firebase app is not initialized; generating local mock UID for user.")
        class MockFirebaseUser:
            uid = f"mock-firebase-{email}"
        return MockFirebaseUser()
    try:
        new_user = auth.create_user(email=email, password=password)
        return new_user
    except Exception as e:
        logger.warning(f"Firebase auth.create_user failed: {e}. Falling back to local mock UID.")
        class MockFirebaseUser:
            uid = f"mock-firebase-{email}"
        return MockFirebaseUser()
def create_custom_token(firebase_uid : str | None, developer_claims : dict | None = None):
    try:
        token = auth.create_custom_token(uid=firebase_uid,developer_claims=developer_claims)

        return token.decode('utf-8')
    except Exception as e:
        return None


async def exchange_custom_token_for_id_tokens(custom_token: str) -> TokenResponse | None:
    """
    Exchanges a custom token created by the Admin SDK for an idToken and refreshToken.
    Calls POST https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=[API_KEY]
    """
    url = f"{IDENTITY_TOOLKIT_BASE}/accounts:signInWithCustomToken?key={constants.FIREBASE_API_KEY}"
    payload = {
        "token": custom_token,
        "returnSecureToken": True,
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json=payload)

        if resp.status_code != 200:

            logger.error(f"Failed custom token exchange: {resp.text}")
            return None

        data = resp.json()
        token =  TokenResponse(idToken=data.get("idToken",""),refreshToken=data.get("refreshToken",""))

        return token
    except Exception as exc:
        logger.error(f"Error exchanging custom token: {exc}")
        return None


async def sign_in_with_password(email: str, password: str) -> dict | None:
    """
    Verifies credentials against Firebase and returns idToken/refreshToken.
    This REST call is required — Admin SDK has no password-verification method.
    """
    url = f"{IDENTITY_TOOLKIT_BASE}/accounts:signInWithPassword?key={constants.FIREBASE_API_KEY}"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                url, json={"email": email, "password": password, "returnSecureToken": True}
            )
        if resp.status_code != 200:
            logger.info(f"Firebase sign-in failed for {email}: {resp.text}")
            return None
        return resp.json()
    except Exception as exc:
        logger.error(f"Firebase sign-in error for {email}: {exc}")
        return None


async def refresh_firebase_token(refresh_token: str) -> TokenResponse | None:
    """
    Exchanges a Firebase refresh token for a new idToken/refreshToken pair.
    Required — Admin SDK does not expose a refresh operation.
    """
    url = f"{SECURE_TOKEN_BASE}/token?key={constants.FIREBASE_API_KEY}"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                url,
                data={"grant_type": "refresh_token", "refresh_token": refresh_token},
            )
        if resp.status_code != 200:
            logger.info(f"Firebase token refresh failed: {resp.text}")
            return None
        data = resp.json()

        # Note: refresh response uses different key names than sign-in response
        return TokenResponse(idToken=data.get("id_token",""), refreshToken=data.get("refresh_token",""))

    except Exception as exc:

        logger.error(f"Firebase token refresh error: {exc}")
        return None

def logout(access_token  : str):
    try:
        if access_token:
            # check_revoked=False here — we're revoking anyway, no need for the
            # extra round-trip just to read the uid out of a still-valid token
            claims = verify_firebase_id_token(access_token, check_revoked=False)

            if claims:
                auth.revoke_refresh_tokens(str(claims["uid"]))
            return True
    except Exception as e:
        return None


def update_firebase_user_password(firebase_uid: str, password: str) -> bool:
    """
    Updates a user's password in Firebase Authentication using Admin SDK.
    """
    if not firebase_app:
        initialize_firebase()
    if not firebase_app:
        logger.warning("Firebase app is not initialized; skipping Firebase password update.")
        return True
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

