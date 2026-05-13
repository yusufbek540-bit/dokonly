from fastapi import APIRouter, Depends

from app.core.auth import get_current_user

router = APIRouter()


@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    return {"user_id": user["sub"], "email": user.get("email")}
