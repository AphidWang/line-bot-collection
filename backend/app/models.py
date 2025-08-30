from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List


class MessageBase(BaseModel):
    group_id: str
    user_id: str
    message: str


class MessageCreate(MessageBase):
    pass


class Message(MessageBase):
    id: int
    timestamp: datetime
    
    class Config:
        from_attributes = True


class MessageFilter(BaseModel):
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    group_id: Optional[str] = None


class SummaryRequest(BaseModel):
    group_id: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class SummaryResponse(BaseModel):
    summary: str
    total_messages: int
    date_range: str


class UserBase(BaseModel):
    email: str


class User(UserBase):
    id: int
    firebase_uid: str
    created_at: datetime
    
    class Config:
        from_attributes = True


class WebhookData(BaseModel):
    events: List[dict]


class UserLogin(BaseModel):
    """用戶登入模型"""
    email: str
    password: str

class UserCreate(BaseModel):
    """用戶註冊模型"""
    email: str
    password: str

class UserPermission(BaseModel):
    """用戶權限模型"""
    firebase_uid: str
    email: str
    role: str = "user"  # admin, user, readonly
    allowed_groups: Optional[List[str]] = None

class UserPermissionResponse(BaseModel):
    """用戶權限回應模型"""
    firebase_uid: str
    email: str
    role: str
    allowed_groups: List[str]
    created_at: str
