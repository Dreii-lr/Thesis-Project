from starlette.responses import JSONResponse

from app.core.exceptions import UnprocessableEntity
from app.shared.schema import SuccessfulResponseSchema


class SharedUtils:

    @staticmethod
    def SuccessfulResponse(success_response_schema : SuccessfulResponseSchema):
        message_content = success_response_schema.model_dump(exclude_none=True,exclude_unset=True)
        return JSONResponse(status_code=success_response_schema.status_code,content=message_content)


    @staticmethod
    def capitalized_first_letter(data : str):
        if not data:
            return data

        if not isinstance(data, str):
            raise UnprocessableEntity("Invalid type of data. It must be string only.")

        #split the text
        split_text = data.lower().split(" ")
        process_data = []
        for split in split_text:
            cleaned_data = split[0].capitalize() + split[1:]
            process_data.append(cleaned_data)

        return " ".join(process_data)
