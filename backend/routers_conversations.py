"""مسیرهای مدیریت گفتگوها (CRUD) برای «دستیار»."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

import database as db
from auth import CurrentUser
from schemas import (
    ConversationCreate,
    ConversationOut,
    ConversationUpdate,
    MessageOut,
    OkOut,
)

router = APIRouter(prefix="/conversations", tags=["conversations"])

NOT_FOUND = "گفتگو پیدا نشد."


def _require_conversation(conversation_id: int, user_id: int) -> dict:
    conversation = db.get_conversation(conversation_id, user_id)
    if conversation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=NOT_FOUND)
    return conversation


@router.get("", response_model=list[ConversationOut])
def list_conversations(user: CurrentUser) -> list[ConversationOut]:
    return [ConversationOut.model_validate(item) for item in db.list_conversations(user["id"])]


@router.post("", response_model=ConversationOut)
def create_conversation(
    user: CurrentUser, payload: ConversationCreate | None = None
) -> ConversationOut:
    title = (payload.title if payload else None) or db.DEFAULT_TITLE
    conversation = db.create_conversation(user["id"], title.strip() or db.DEFAULT_TITLE)
    return ConversationOut.model_validate(conversation)


@router.get("/{conversation_id}/messages", response_model=list[MessageOut])
def list_messages(conversation_id: int, user: CurrentUser) -> list[MessageOut]:
    _require_conversation(conversation_id, user["id"])
    return [
        MessageOut.model_validate(item)
        for item in db.list_messages(conversation_id)
    ]


@router.patch("/{conversation_id}", response_model=ConversationOut)
def update_conversation(
    conversation_id: int, payload: ConversationUpdate, user: CurrentUser
) -> ConversationOut:
    conversation = db.rename_conversation(conversation_id, user["id"], payload.title)
    if conversation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=NOT_FOUND)
    return ConversationOut.model_validate(conversation)


@router.delete("/{conversation_id}", response_model=OkOut)
def delete_conversation(conversation_id: int, user: CurrentUser) -> OkOut:
    if not db.delete_conversation(conversation_id, user["id"]):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=NOT_FOUND)
    return OkOut(ok=True)
