from datetime import datetime

from starlette.responses import JSONResponse
from typing_extensions import Any

from app.core.exceptions import DomainUnprocessableEntity
from app.shared.schema import SuccessfulResponseSchema


class SharedUtils:

    @staticmethod
    def SuccessfulResponse(success_response_schema : SuccessfulResponseSchema):
        message_content = success_response_schema.model_dump(mode="json", exclude_none=True, exclude_unset=True)
        return JSONResponse(status_code=success_response_schema.status_code,content=message_content)


    @staticmethod
    def capitalized_first_letter(data : str):
        if not data:
            return data

        if not isinstance(data, str):
            raise DomainUnprocessableEntity("Invalid type of data. It must be string only.")

        words = data.strip().split()
        if not words:
            return ""

        return " ".join(word.capitalize() for word in words)

    @staticmethod
    def to_json_dict(val: Any) -> dict | None:
        if val is None:
            return None
        if hasattr(val, "model_dump"):
            return val.model_dump(exclude_unset=False, exclude_none=True)
        if isinstance(val, dict):
            return val
        return None

    @staticmethod
    def to_json_list(val: Any ) -> list:
        if not val:
            return []
        res = []
        for item in val:
            if hasattr(item, "model_dump"):
                res.append(item.model_dump(exclude_unset=False, exclude_none=True))
            elif isinstance(item, dict):
                res.append(item)
        return res

    @staticmethod
    def generate_account_id(role: str = "STUDENT", next_value: int = 1) -> str:
        role_str = getattr(role, "value", str(role)).upper()
        current_year = str(datetime.now().year)
        if role_str == "TEACHER":
            return f"TCH-{current_year}-{next_value:04d}"
        elif role_str == "ADMIN":
            return f"ADM-{current_year}-{next_value:04d}"
        else:
            prefix = f"{current_year[0:1]}{current_year[2:]}"
            return f"{prefix}-{next_value:05d}"