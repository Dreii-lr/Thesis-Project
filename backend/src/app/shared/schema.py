from typing import Any, List

from pydantic import BaseModel


class AdditionalData(BaseModel):
    resources : Any



class SuccessfulResponseSchema(BaseModel):
    message : str | None
    message_status : str = "OK"
    status_code : int = 200
    data : AdditionalData | None = None

