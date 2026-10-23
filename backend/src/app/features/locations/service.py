"""PSGC lookups and address validation, cached to reduce upstream requests."""
from __future__ import annotations

from time import monotonic
from typing import TYPE_CHECKING

import httpx
from pydantic import TypeAdapter, ValidationError

from app.core.exceptions import DomainUnprocessableEntity, DomainValidationDomainException
from app.features.locations.schemas import LocationRead

if TYPE_CHECKING:
    from app.features.users.schemas import ContactDetailsInput


class LocationService:
    BASE_URL = "https://psgc.gitlab.io/api"
    METRO_MANILA_CODE = "130000000"
    CACHE_SECONDS = 86400
    _cache: dict[str, tuple[float, list[LocationRead]]] = {}

    @classmethod
    async def _get_locations(cls, path: str) -> list[LocationRead]:
        cached = cls._cache.get(path)
        if cached and monotonic() - cached[0] < cls.CACHE_SECONDS:
            return cached[1]
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(f"{cls.BASE_URL}/{path}/")
                response.raise_for_status()
                locations = TypeAdapter(list[LocationRead]).validate_python(response.json())
        except (httpx.HTTPError, ValueError, ValidationError) as exc:
            raise DomainUnprocessableEntity(
                "Address selections are temporarily unavailable. Please try again."
            ) from exc
        locations = sorted(locations, key=lambda item: item.name.casefold())
        cls._cache[path] = (monotonic(), locations)
        return locations

    @classmethod
    async def list_provinces(cls) -> list[LocationRead]:
        provinces = await cls._get_locations("provinces")
        # NCR has no province, so use its region as the province-level selection.
        return sorted(
            [*provinces, LocationRead(code=cls.METRO_MANILA_CODE, name="Metro Manila")],
            key=lambda item: item.name.casefold(),
        )

    @classmethod
    async def list_cities(cls, province_code: str) -> list[LocationRead]:
        parent = "regions" if province_code == cls.METRO_MANILA_CODE else "provinces"
        return await cls._get_locations(f"{parent}/{province_code}/cities-municipalities")

    @classmethod
    async def list_barangays(cls, municipality_code: str) -> list[LocationRead]:
        return await cls._get_locations(f"cities-municipalities/{municipality_code}/barangays")

    @classmethod
    async def validate_address(cls, details: ContactDetailsInput | None) -> None:
        if not details or not details.province_code:
            return
        provinces = await cls.list_provinces()
        province = next((p for p in provinces if p.code == details.province_code), None)
        if not province:
            raise DomainValidationDomainException("Please select a valid province.")
        cities = await cls.list_cities(province.code)
        city = next((c for c in cities if c.code == details.municipality_code), None)
        if not city:
            raise DomainValidationDomainException("The municipality/city does not belong to this province.")
        barangays = await cls.list_barangays(city.code)
        barangay = next((b for b in barangays if b.code == details.barangay_code), None)
        if not barangay:
            raise DomainValidationDomainException("The barangay does not belong to this municipality/city.")
        details.province = province.name
        details.municipality = city.name
        details.barangay = barangay.name
