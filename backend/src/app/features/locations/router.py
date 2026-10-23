"""Read-only PSGC address endpoints."""
from typing import Annotated

from fastapi import APIRouter, Path
from starlette.responses import JSONResponse

from app.features.locations.service import LocationService
from app.features.locations.schemas import LocationRead
from app.shared.schema import AdditionalData, SuccessfulResponseSchema
from app.shared.utils import SharedUtils

router = APIRouter(prefix="/locations", tags=["Locations"])
LocationCode = Annotated[str, Path(pattern=r"^[0-9]{9}$")]


def location_response(locations: list[LocationRead]) -> JSONResponse:
    return SharedUtils.SuccessfulResponse(SuccessfulResponseSchema(
        status_code=200,
        message="Successfully retrieved locations.",
        data=AdditionalData(resources=[location.model_dump() for location in locations]),
    ))


@router.get("/provinces")
async def list_provinces() -> JSONResponse:
    return location_response(await LocationService.list_provinces())


@router.get("/provinces/{province_code}/cities-municipalities")
async def list_cities(province_code: LocationCode) -> JSONResponse:
    return location_response(await LocationService.list_cities(province_code))


@router.get("/cities-municipalities/{municipality_code}/barangays")
async def list_barangays(municipality_code: LocationCode) -> JSONResponse:
    return location_response(await LocationService.list_barangays(municipality_code))
