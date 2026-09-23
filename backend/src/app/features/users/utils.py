from datetime import datetime

class UsersUtils:
    @staticmethod
    def generate_student_id(next_value) -> str:
        # Extract the last two digits of the current year (e.g., '26' for 2026)
        current_year_short = str(datetime.now().year)
        prefix = f"{current_year_short[0:1]}{current_year_short[2:]}"
        # Format the final string with a hyphen and 4-digit zero-padding
        formatted_student_id = f"{prefix}-{next_value:05d}"
        return formatted_student_id

