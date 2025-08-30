from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

from typing import List, Optional, Dict, Any
from datetime import datetime
import json
import logging


from app.database.database import get_db, init_db
from app.auth import verify_firebase_token, verify_jwt_token, get_current_user, get_current_user_firebase, create_access_token, get_password_hash, verify_password
from app.models import (
    MessageFilter, 
    SummaryRequest, SummaryResponse, WebhookData, UserPermission, UserLogin, UserCreate
)
from app.service_layer import (
    get_conversation, 
    add_message as add_message_service, 
    get_user_by_email, verify_user, create_user,
    get_user_permissions, check_permission, create_user_permission,
    list_user_groups
)
from app.config import settings

# 設定 logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Line Assistant API", version="1.0.0")

# CORS 設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生產環境要限制
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 掛載前端靜態檔案
frontend_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "frontend", "out")
if os.path.exists(frontend_path):
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")
    logger.info(f"前端靜態檔案已掛載: {frontend_path}")
else:
    logger.warning(f"前端靜態檔案目錄不存在: {frontend_path}")

# 安全認證
security = HTTPBearer()

@app.on_event("startup")
async def startup_event():
    """啟動時初始化資料庫和檢查必要服務"""
    try:
        # 初始化資料庫
        await init_db()
        
        # 初始化資料庫資料
        from app.service_layer import init_database_data
        await init_database_data()
        
        logger.info("Application started successfully")
        
    except Exception as e:
        logger.error(f"Application startup failed: {e}")
        raise e

@app.get("/")
async def root():
    return {"message": "Line Assistant API"}

@app.get("/health")
async def health_check():
    """健康檢查，包含各服務狀態"""
    return {
        "status": "healthy",
        "services": {
            "postgresql": True,  # 如果啟動成功，資料庫就是可用的
            "google_drive": settings.is_google_drive_accessible(),
            "firebase": settings.is_firebase_enabled(),
            "line_bot": settings.is_line_bot_enabled(),
            "openai": bool(settings.openai_api_key)
        },
        "timestamp": datetime.now().isoformat()
    }

# 帳密登入相關 API
@app.post("/api/auth/login")
async def login(user_credentials: UserLogin):
    """帳密登入"""
    try:
        # 使用新的服務驗證用戶
        if await verify_user(user_credentials.email, user_credentials.password):
            # 建立 JWT token
            access_token = create_access_token(
                data={"sub": user_credentials.email}
            )
            return {
                "access_token": access_token,
                "token_type": "bearer",
                "user": {
                    "email": user_credentials.email,
                    "user_type": "jwt"
                }
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@app.post("/api/auth/register")
async def register(user_data: UserCreate):
    """用戶註冊"""
    try:
        # 使用新的服務建立用戶
        from app.auth import get_password_hash
        
        success = await create_user(
            user_data.email, 
            get_password_hash(user_data.password), 
            "jwt"
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User already exists or creation failed"
            )
        
        # 建立 JWT token
        access_token = create_access_token(
            data={"sub": user_data.email}
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "email": user_data.email,
                "user_type": "jwt"
            }
        }
        
    except Exception as e:
        logger.error(f"Registration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

# 用戶權限相關 API
@app.get("/api/user/permissions", response_model=Dict[str, Any])
async def get_user_permissions(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """取得當前用戶權限"""
    try:
        # 嘗試 JWT 認證
        try:
            firebase_uid = await verify_jwt_token(credentials)
            user_email = firebase_uid.get("sub")
            firebase_uid = f"jwt_{user_email}"
        except:
            # 如果 JWT 失敗，嘗試 Firebase
            firebase_uid = await verify_firebase_token(credentials)
        
        permissions = await get_user_permissions(firebase_uid)
        
        if not permissions:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User permissions not found"
            )
        
        return permissions
    except Exception as e:
        logger.error(f"Error getting user permissions: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@app.post("/api/user/permissions", response_model=Dict[str, str])
async def create_user_permission(
    user_permission: UserPermission,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """建立用戶權限（需要 admin 權限）"""
    try:
        # 嘗試 JWT 認證
        try:
            admin_data = await verify_jwt_token(credentials)
            admin_email = admin_data.get("sub")
            admin_uid = f"jwt_{admin_email}"
        except:
            # 如果 JWT 失敗，嘗試 Firebase
            admin_uid = await verify_firebase_token(credentials)
        
        admin_perms = await get_user_permissions(admin_uid)
        
        if not admin_perms or admin_perms.get('role') != 'admin':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin permission required"
            )
        
        success = await create_user_permission(
            user_permission.firebase_uid,
            user_permission.email,
            user_permission.role,
            user_permission.allowed_groups
        )
        
        if success:
            return {"message": "User permission created successfully"}
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create user permission"
            )
    except Exception as e:
        logger.error(f"Error creating user permission: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

# 群組相關 API
@app.get("/api/groups", response_model=List[str])
async def get_user_groups(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """取得用戶可以存取的群組"""
    try:
        # 嘗試 JWT 認證
        try:
            firebase_uid = await verify_jwt_token(credentials)
            user_email = firebase_uid.get("sub")
            firebase_uid = f"jwt_{user_email}"
        except:
            # 如果 JWT 失敗，嘗試 Firebase
            firebase_uid = await verify_firebase_token(credentials)
        
        groups = await list_user_groups(firebase_uid)
        return groups
    except Exception as e:
        logger.error(f"Error getting user groups: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

# 訊息相關 API
@app.get("/api/messages/{group_id}", response_model=Dict[str, Any])
async def get_messages(
    group_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """取得群組對話"""
    try:
        # 嘗試 JWT 認證
        try:
            firebase_uid = await verify_jwt_token(credentials)
            user_email = firebase_uid.get("sub")
            firebase_uid = f"jwt_{user_email}"
        except:
            # 如果 JWT 失敗，嘗試 Firebase
            firebase_uid = await verify_firebase_token(credentials)
        
        messages = await get_conversation(group_id)
        
        if messages is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this group"
            )
        
        return messages
    except Exception as e:
        logger.error(f"Error getting messages: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@app.post("/api/messages/{group_id}", response_model=Dict[str, str])
async def add_message(
    group_id: str,
    message_data: Dict[str, str],
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """新增訊息到群組"""
    try:
        # 嘗試 JWT 認證
        try:
            firebase_uid = await verify_jwt_token(credentials)
            user_email = firebase_uid.get("sub")
            firebase_uid = f"jwt_{user_email}"
        except:
            # 如果 JWT 失敗，嘗試 Firebase
            firebase_uid = await verify_firebase_token(credentials)
        
        user_id = message_data.get('user_id')
        message = message_data.get('message')
        
        if not user_id or not message:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="user_id and message are required"
            )
        
        success = await add_message_service(group_id, user_id, message)
        
        if success:
            return {"message": "Message added successfully"}
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied or failed to add message"
            )
    except Exception as e:
        logger.error(f"Error adding message: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

# 保留原有的 API endpoints 以維持向後相容性
@app.get("/api/messages")
async def get_messages_legacy(
    filter: MessageFilter = Depends()
):
    """取得訊息（舊版 API，維持向後相容性）"""
    # 這裡可以保留原有的 SQLite 查詢邏輯
    pass


@app.post("/webhook")
async def line_webhook(
    webhook_data: WebhookData
):
    """Receive LINE bot messages and store in database"""
    try:
        stored_messages = []
        
        for event in webhook_data.events:
            if event.get("type") == "message":
                message_data = event.get("message", {})
                source = event.get("source", {})
                
                if source.get("type") == "group":
                    group_id = source.get("groupId", "unknown")
                    user_id = event.get("userId", "unknown")
                    message_text = message_data.get("text", "")
                    
                    if message_text:
                        success = await add_message_service(
                            group_id, user_id, message_text
                        )
                        if success:
                            stored_messages.append({
                                "group_id": group_id, 
                                "user_id": user_id, 
                                "message": message_text
                            })
        
        return {"status": "success", "stored_count": len(stored_messages)}
        
    except Exception as e:
        logger.error(f"Webhook 處理失敗: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Webhook processing failed: {str(e)}"
        )

# 備份相關 API
@app.post("/api/backup/database")
async def create_database_backup(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """建立資料庫備份"""
    try:
        # 驗證權限
        try:
            user_data = await verify_jwt_token(credentials)
            user_email = user_data.get("sub")
            user_id = f"jwt_{user_email}"
        except:
            user_id = await verify_firebase_token(credentials)
        
        user_perms = await get_user_permissions(user_id)
        if user_perms.get("role") != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin permission required"
            )
        
        # 建立備份
        from app.services.backup_service import BackupService
        from app.services import get_postgresql_service
        
        db_service = await get_postgresql_service()
        backup_service = BackupService(db_service.db)
        
        result = await backup_service.create_database_backup()
        
        if result["success"]:
            return {
                "message": "Database backup created successfully",
                "filename": result["filename"],
                "size": result["size"]
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Backup failed: {result.get('error', 'Unknown error')}"
            )
            
    except Exception as e:
        logger.error(f"建立資料庫備份失敗: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Backup creation failed: {str(e)}"
        )

@app.post("/api/backup/json")
async def create_json_backup(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """建立 JSON 格式備份"""
    try:
        # 驗證權限
        try:
            user_data = await verify_jwt_token(credentials)
            user_email = user_data.get("sub")
            user_id = f"jwt_{user_email}"
        except:
            user_id = await verify_firebase_token(credentials)
        
        user_perms = await get_user_permissions(user_id)
        if user_perms.get("role") != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin permission required"
            )
        
        # 建立備份
        from app.services.backup_service import BackupService
        from app.services import get_postgresql_service
        
        db_service = await get_postgresql_service()
        backup_service = BackupService(db_service.db)
        
        result = await backup_service.create_json_backup()
        
        if result["success"]:
            return {
                "message": "JSON backup created successfully",
                "filename": result["filename"],
                "size": result["size"]
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Backup failed: {result.get('error', 'Unknown error')}"
            )
            
    except Exception as e:
        logger.error(f"建立 JSON 備份失敗: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Backup creation failed: {str(e)}"
        )

@app.get("/api/backup/list")
async def list_backups(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """列出備份檔案"""
    try:
        # 驗證權限
        try:
            user_data = await verify_jwt_token(credentials)
            user_email = user_data.get("sub")
            user_id = f"jwt_{user_email}"
        except:
            user_id = await verify_firebase_token(credentials)
        
        user_perms = await get_user_permissions(user_id)
        if user_perms.get("role") != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin permission required"
            )
        
        # 取得備份列表
        from app.services import get_postgresql_service
        
        db_service = await get_postgresql_service()
        backups = await db_service.get_backups()
        
        return {"backups": backups}
        
    except Exception as e:
        logger.error(f"取得備份列表失敗: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get backup list: {str(e)}"
        )


@app.get("/messages/raw")
async def get_raw_messages(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    group_id: Optional[str] = None,
    current_user = Depends(get_current_user)
):
    """Get raw messages with optional filters"""
    filters = MessageFilter(
        start_date=start_date,
        end_date=end_date,
        group_id=group_id
    )
    
    # 暫時返回空列表，因為我們沒有 SQLite 查詢
    return []


@app.post("/messages/summarize", response_model=SummaryResponse)
async def summarize_messages_endpoint(
    request: SummaryRequest,
    current_user = Depends(get_current_user)
):
    """Generate AI summary of messages"""
    try:
        filters = MessageFilter(
            start_date=request.start_date,
            end_date=request.end_date,
            group_id=request.group_id
        )
        
        # 暫時返回簡單回應，因為我們沒有這些函數
        return SummaryResponse(
            summary="此功能暫時不可用，請使用新的 API。",
            total_messages=0,
            date_range="N/A"
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Summary generation failed: {str(e)}"
        )
