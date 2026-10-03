"""
main.py — FastAPI application entry point.
"""
from __future__ import annotations

from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.core.constants import constants
from app.core.exceptions import (
    CustomHTTPException,
    DomainException,
    custom_http_exception_handler,
    domain_exception_handler,
    http_exception_handler,
    unhandled_exception_handler,
)
from app.core.firebase import initialize_firebase
from app.features.auth.router import router as auth_router
from app.features.users.router import router as users_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup tasks
    initialize_firebase()
    yield
    # Shutdown tasks if any


app = FastAPI(
    title=constants.APP_NAME,
    version=constants.VERSION,
    lifespan=lifespan,
)

# CORS configuration
if constants.ALLOWED_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=constants.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Exception handlers
app.add_exception_handler(DomainException, domain_exception_handler)
app.add_exception_handler(CustomHTTPException, custom_http_exception_handler)
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)

# Register routers
app.include_router(auth_router, prefix=constants.API_V1_PREFIX)
app.include_router(users_router, prefix=constants.API_V1_PREFIX)


@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "project": constants.APP_NAME,
        "version": constants.VERSION,
        "environment": constants.APP_ENV,
    }


if __name__ == '__main__':
    uvicorn.run("src.app.main:app", host="0.0.0.0",port=9090, reload=True)