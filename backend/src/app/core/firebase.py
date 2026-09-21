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

from app.core.constants import constants

logger = logging.getLogger(__name__)

firebase_app: firebase_admin.App | None = None


def initialize_firebase() -> firebase_admin.App | None:
    global firebase_app
    if firebase_app is not None:
        return firebase_app

    cred_path = constants.FIREBASE_CREDENTIALS_PATH
    if not os.path.exists(cred_path):
        logger.warning(
            "Firebase credentials not found at '%s'. "
            "Firebase auth features will be unavailable.",
            cred_path,
        )
        return None
    try:
        cred = credentials.Certificate(cred_path)
        firebase_app = firebase_admin.initialize_app(cred)
        logger.info("Firebase Admin SDK initialised.")
        return firebase_app
    except Exception as e:
        logger.error(f"Failed to initialize Firebase Admin SDK: {e}")
        return None


# ── Helpers ───────────────────────────────────────────────────────────────────

def verify_firebase_id_token(id_token: str) -> dict | None:
    """
    Verify a Firebase ID token and return its decoded claims dict.
    Returns None if verification fails or Firebase is uninitialized.
    """
    if not firebase_app:
        initialize_firebase()
    if not firebase_app:
        return None
    try:
        return auth.verify_id_token(id_token)
    except Exception as e:
        logger.warning(f"Firebase token verification failed: {e}")
        return None


def create_custom_token(uid: str) -> str | None:
    """
    Create a Firebase custom token for the given UID.
    """
    if not firebase_app:
        initialize_firebase()
    if not firebase_app:
        return None
    try:
        token_bytes: bytes = auth.create_custom_token(uid)
        return token_bytes.decode("utf-8")
    except Exception as e:
        logger.error(f"Failed to create custom Firebase token: {e}")
        return None


def get_firebase_user_by_email(email: str) -> auth.UserRecord | None:
    """Return a Firebase UserRecord by email, or None if not found."""
    if not firebase_app:
        initialize_firebase()
    if not firebase_app:
        return None
    try:
        return auth.get_user_by_email(email)
    except Exception:
        return None
