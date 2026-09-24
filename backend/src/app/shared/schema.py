from typing import Any, List, Optional

from pydantic import BaseModel


class AdditionalData(BaseModel):
    resources : Optional[Any] = None
    token : Optional[Any] = None



class SuccessfulResponseSchema(BaseModel):
    message : str | None
    message_status : str = "OK"
    status_code : int = 200
    data : AdditionalData | None = None

