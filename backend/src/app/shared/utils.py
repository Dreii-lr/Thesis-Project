from starlette.responses import JSONResponse

from app.shared.schema import SuccessfulResponseSchema


class SharedUtils:

    @staticmethod
    def SuccessfulResponse(success_response_schema : SuccessfulResponseSchema):
        message_content = success_response_schema.model_dump(exclude_none=True,exclude_unset=True)
        return JSONResponse(status_code=success_response_schema.status_code,content=message_content)
