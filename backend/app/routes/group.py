from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from app.schemas.group import GroupCreate, GroupResponse
from app.schemas.group_member import AddMemberRequest, MemberResponse
from app.dependencies.auth import get_current_user
from app.services.group_service import GroupService


router = APIRouter(prefix="/groups", tags=["Groups"])


@router.post("/", response_model=GroupResponse)
def create_group(
    group: GroupCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return GroupService.create_group(db, group, current_user.id)


@router.get("/", response_model=list[GroupResponse])
def get_groups(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return GroupService.get_user_groups(db, current_user.id)


@router.post("/{group_id}/members", response_model=MemberResponse)
def add_member(
    group_id: int,
    data: AddMemberRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return GroupService.add_member(db, group_id, data, current_user.id)


@router.get("/{group_id}/members", response_model=list[MemberResponse])
def list_members(
    group_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return GroupService.list_members(db, group_id, current_user.id)


@router.get("/{group_id}/summary")
def get_group_summary(
    group_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return GroupService.get_group_summary(db, group_id, current_user.id)


@router.get("/{group_id}/balances")
def get_group_balances(
    group_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return GroupService.get_group_balances(db, group_id, current_user.id)


@router.delete("/{group_id}/members/{user_id}")
def remove_member(
    group_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return GroupService.remove_member(db, group_id, user_id, current_user.id)


@router.delete("/{group_id}")
def delete_group(
    group_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return GroupService.delete_group(db, group_id, current_user.id)