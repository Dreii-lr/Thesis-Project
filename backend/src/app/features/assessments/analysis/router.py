"""
router.py — REST API endpoints for Assessment Cohort Struggle Analysis.
Follows clean router architecture: zero business logic, service dependency injection,
and response formatting via SharedUtils.SuccessfulResponse.
"""
from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from starlette.responses import JSONResponse

from app.core.dependencies import (
    get_cohort_analysis_service,
    require_admin_teacher,
)
from app.features.assessments.analysis.service import CohortAnalysisService
from app.features.users.schemas import UserRead
from app.shared.utils import SharedUtils

router = APIRouter(prefix="/assessments/analysis", tags=["Assessment Cohort Analysis"])


# ══════════════════════════════════════════════════════════════════════════════
# COHORT STRUGGLE ANALYSIS ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════

@router.post("", status_code=status.HTTP_200_OK)
@router.post("/", status_code=status.HTTP_200_OK)
@router.post("/cohort-analysis", status_code=status.HTTP_200_OK)
async def generate_cohort_struggle_analysis_query(
    assessment_id: str = Query(..., description="ID of the completed assessment to analyze"),
    user_category: str = Query(..., description="Target user category (case-insensitive, e.g. Elementary, Secondary, BLP)"),
    current_user: UserRead = Depends(require_admin_teacher),
    service: CohortAnalysisService = Depends(get_cohort_analysis_service),
) -> JSONResponse:
    """
    Generate or refresh cohort-wide quiz struggle analysis using query parameters.
    Query parameters:
      - assessment_id: ID of the assessment (must be COMPLETED)
      - user_category: Category from user_categories table (case-insensitive)
    Workflow:
      1. Query category in database (case-insensitive).
      2. If valid, query assessment in database (must be COMPLETED).
      3. If valid, query submissions strictly for that category.
      4. Feed aggregated data to document-processing-ms via HTTP API and return diagnosis.
    """
    response = await service.generate_cohort_struggle_analysis(
        assessment_id=str(assessment_id).strip(),
        user_category=str(user_category).strip(),
        current_user=current_user,
    )
    response.status_code = status.HTTP_200_OK
    return SharedUtils.SuccessfulResponse(response)


@router.get("", status_code=status.HTTP_200_OK)
@router.get("/", status_code=status.HTTP_200_OK)
@router.get("/cohort-analysis", status_code=status.HTTP_200_OK)
async def get_cohort_struggle_analysis_query(
    assessment_id: str = Query(..., description="ID of the assessment"),
    user_category: Optional[str] = Query(None, description="Optional user category filter"),
    current_user: UserRead = Depends(require_admin_teacher),
    service: CohortAnalysisService = Depends(get_cohort_analysis_service),
) -> JSONResponse:
    """
    Retrieve previously generated and cached cohort struggle analysis using query parameters.
    """
    response = await service.get_cohort_struggle_analysis(
        assessment_id=str(assessment_id).strip(),
        current_user=current_user,
        user_category=str(user_category).strip() if user_category else None,
    )
    response.status_code = status.HTTP_200_OK
    return SharedUtils.SuccessfulResponse(response)


@router.post("/{assessment_id}", status_code=status.HTTP_200_OK)
@router.post("/{assessment_id}/cohort-analysis", status_code=status.HTTP_200_OK)
async def generate_cohort_struggle_analysis_path(
    assessment_id: str,
    user_category: str = Query(..., alias="category", description="Target user category (case-insensitive)"),
    current_user: UserRead = Depends(require_admin_teacher),
    service: CohortAnalysisService = Depends(get_cohort_analysis_service),
) -> JSONResponse:
    """Path-parameter variant for generating cohort struggle analysis."""
    response = await service.generate_cohort_struggle_analysis(
        assessment_id=str(assessment_id).strip(),
        user_category=str(user_category).strip(),
        current_user=current_user,
    )
    response.status_code = status.HTTP_200_OK
    return SharedUtils.SuccessfulResponse(response)


@router.get("/{assessment_id}", status_code=status.HTTP_200_OK)
@router.get("/{assessment_id}/cohort-analysis", status_code=status.HTTP_200_OK)
async def get_cohort_struggle_analysis_path(
    assessment_id: str,
    user_category: Optional[str] = Query(None, alias="category", description="Optional user category filter"),
    current_user: UserRead = Depends(require_admin_teacher),
    service: CohortAnalysisService = Depends(get_cohort_analysis_service),
) -> JSONResponse:
    """Path-parameter variant for retrieving cohort struggle analysis."""
    response = await service.get_cohort_struggle_analysis(
        assessment_id=str(assessment_id).strip(),
        current_user=current_user,
        user_category=str(user_category).strip() if user_category else None,
    )
    response.status_code = status.HTTP_200_OK
    return SharedUtils.SuccessfulResponse(response)
