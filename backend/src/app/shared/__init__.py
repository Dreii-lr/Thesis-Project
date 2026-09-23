"""
Shared package initialization.
"""

import asyncpg
from sqlalchemy.exc import DBAPIError, OperationalError
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_fixed, wait_exponential

TransientDBErrors = (
    OperationalError,
    DBAPIError,
    asyncpg.exceptions.PostgresError,
)

# Decorator configured with exponential backoff (Wait 1s, 2s, 4s, 8s...)
retry_on_transient = retry(
    retry=retry_if_exception_type(TransientDBErrors),
    stop=stop_after_attempt(5),
    wait=wait_exponential(multiplier=1, min=1, max=10),
    reraise=True,
)