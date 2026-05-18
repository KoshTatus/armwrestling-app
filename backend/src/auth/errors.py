from fastapi import HTTPException
from fastapi import status

class AuthErrors:
    @staticmethod
    def get_login_occupied_error() -> HTTPException:
        return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Login is occupied!")

    @staticmethod
    def get_login_not_found_error() -> HTTPException:
        return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect login!")

    @staticmethod
    def get_password_not_found_error() -> HTTPException:
        return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect password!")