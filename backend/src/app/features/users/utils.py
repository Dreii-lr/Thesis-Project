from datetime import datetime
import uuid


class UsersUtils:
    @staticmethod
    def generate_student_id(next_value) -> str:
        # Extract the last two digits of the current year (e.g., '26' for 2026)
        current_year_short = str(datetime.now().year)
        prefix = f"{current_year_short[0:1]}{current_year_short[2:]}"
        # Format the final string with a hyphen and 4-digit zero-padding
        formatted_student_id = f"{prefix}-{next_value:05d}"
        return formatted_student_id

    @staticmethod
    def generate_teacher_id(next_value: int | None = None) -> str:
        current_year = str(datetime.now().year)
        if next_value is not None:
            return f"TCH-{current_year}-{next_value:04d}"
        return f"TCH-{current_year}-{str(uuid.uuid4())[:6].upper()}"

