import jwt
from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.database.models import User
from app.config import settings
import json
from typing import Optional
from passlib.context import CryptContext
from datetime import datetime, timedelta

# 密碼加密
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

security = HTTPBearer()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """驗證密碼"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """加密密碼"""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """建立 JWT token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return encoded_jwt

async def verify_firebase_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Optional[str]:
    """簡單的 Firebase JWT 驗證，只驗證 token 存在"""
    try:
        token = credentials.credentials
        if not token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing authentication token"
            )
        
        # 這裡可以加入更嚴格的 JWT 驗證邏輯
        # 目前只是簡單檢查 token 是否存在
        return token
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def verify_jwt_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Optional[dict]:
    """驗證 JWT token"""
    try:
        token = credentials.credentials
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired"
        )
    except jwt.JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

async def get_current_user(
    token_data: dict = Depends(verify_jwt_token),
    db: AsyncSession = Depends(get_db)
):
    """取得當前用戶（JWT 版本）"""
    try:
        email = token_data.get("sub")
        
        # 對於 JWT 用戶，直接返回用戶資訊，不依賴資料庫
        # 因為我們使用 Google Drive 存儲用戶資料
        class MockUser:
            def __init__(self, email: str):
                self.email = email
                self.firebase_uid = f"jwt_{email}"
        
        return MockUser(email)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting current user: {str(e)}"
        )

async def get_current_user_firebase(
    token_data: str = Depends(verify_firebase_token),
    db: AsyncSession = Depends(get_db)
):
    """取得當前用戶（Firebase 版本）"""
    try:
        # 這裡可以加入 JWT 解碼邏輯
        # 目前只是簡單返回 token 作為 firebase_uid
        firebase_uid = token_data
        
        # Check if user exists in our database
        result = await db.execute(select(User).where(User.firebase_uid == firebase_uid))
        user = result.scalar_one_or_none()
        
        if not user:
            # Create new user if not exists
            user = User(email="", firebase_uid=firebase_uid)
            db.add(user)
            await db.commit()
            await db.refresh(user)
        
        return user
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting current user: {str(e)}"
        )
