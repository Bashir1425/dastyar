"""مسیرهای پروفایل کاربر «دستیار»."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, status

import database as db
from auth import CurrentUser
from schemas import ProfileUpdate, UserOut

router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("", response_model=UserOut)
def get_profile(user: CurrentUser) -> UserOut:
    return UserOut.model_validate(user)


@router.patch("", response_model=UserOut)
def update_profile(payload: ProfileUpdate, user: CurrentUser) -> UserOut:
    fields: dict[str, Any] = payload.model_dump(exclude_unset=True)

    # avatar_url با مقدار null پاک می‌شود؛ بقیه فیلدها فقط وقتی مقدار دارند اعمال شوند.
    fields = {
        key: value
        for key, value in fields.items()
        if value is not None or key == "avatar_url"
    }

    if not fields:
        return UserOut.model_validate(user)

    updated = db.update_user(user["id"], **fields)
    if updated is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="کاربر پیدا نشد.")
    return UserOut.model_validate(updated)
