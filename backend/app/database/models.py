from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
from .database import Base

class User(Base):
    """用戶表"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    user_type = Column(String(50), default="jwt")  # jwt, firebase
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # 關聯
    permissions = relationship("UserPermission", back_populates="user")
    messages = relationship("Message", back_populates="user")

class UserPermission(Base):
    """用戶權限表"""
    __tablename__ = "user_permissions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    role = Column(String(50), default="user")  # admin, user, readonly
    allowed_groups = Column(JSON)  # 允許存取的群組列表
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # 關聯
    user = relationship("User", back_populates="permissions")

class Group(Base):
    """群組表"""
    __tablename__ = "groups"
    
    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(String(255), unique=True, index=True, nullable=False)  # LINE 群組 ID
    name = Column(String(255))  # 群組名稱
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # 關聯
    messages = relationship("Message", back_populates="group")

class Message(Base):
    """訊息表"""
    __tablename__ = "messages"
    
    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # 關聯
    group = relationship("Group", back_populates="messages")
    user = relationship("User", back_populates="messages")

class Backup(Base):
    """備份表"""
    __tablename__ = "backups"
    
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    size = Column(Integer)  # 檔案大小 (bytes)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(String(50), default="completed")  # completed, failed, in_progress
    file_path = Column(String(500))  # Google Drive 檔案路徑
    notes = Column(Text)  # 備份說明
