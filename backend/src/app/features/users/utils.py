from datetime import datetime


class UsersUtils:
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
