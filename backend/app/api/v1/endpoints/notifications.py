"""Notifications endpoints — in-app notifications for platform operators."""
from fastapi import APIRouter, Depends

from app.core.auth import get_current_user

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("")
async def list_notifications(user: dict = Depends(get_current_user)):
    return []


@router.post("/{notification_id}/read", status_code=200)
async def mark_read(notification_id: str, user: dict = Depends(get_current_user)):
    return {"ok": True}


@router.post("/read-all", status_code=200)
async def mark_all_read(user: dict = Depends(get_current_user)):
    return {"ok": True}
