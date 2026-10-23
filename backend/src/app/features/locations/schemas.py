"""DTOs for Philippine address selections."""
from pydantic import BaseModel


class LocationRead(BaseModel):
    code: str
    name: str
