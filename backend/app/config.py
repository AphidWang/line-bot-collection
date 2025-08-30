from pydantic_settings import BaseSettings
from typing import Optional
import json
import os


class Settings(BaseSettings):
    # Database
    database_url: str = "sqlite+aiosqlite:///./line_assistant.db"
    
    # Google Drive
    google_credentials_path: str = "./google-credentials.json"
    google_drive_folder_id: Optional[str] = None
    google_credentials_json: Optional[str] = None  # 從環境變數讀取 JSON 字串
    
    # Firebase (後端不需要，但保留以防萬一)
    firebase_project_id: Optional[str] = None
    firebase_private_key_id: Optional[str] = None
    firebase_private_key: Optional[str] = None
    firebase_client_email: Optional[str] = None
    firebase_client_id: Optional[str] = None
    firebase_auth_uri: str = "https://accounts.google.com/o/oauth2/auth"
    firebase_token_uri: str = "https://oauth2.googleapis.com/token"
    firebase_auth_provider_x509_cert_url: str = "https://www.googleapis.com/oauth2/v1/certs"
    firebase_client_x509_cert_url: Optional[str] = None
    
    # OpenAI (可選)
    openai_api_key: Optional[str] = None
    
    # Security
    secret_key: str = "your-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # LINE Bot (可選，但建議設定)
    line_channel_id: Optional[str] = None
    line_channel_secret: Optional[str] = None
    line_channel_access_token: Optional[str] = None
    
    class Config:
        env_file = ".env"
    
    def get_google_credentials_path(self) -> str:
        """取得 Google 認證檔案路徑，如果沒有檔案就動態生成"""
        if os.path.exists(self.google_credentials_path):
            return self.google_credentials_path
        
        if self.google_credentials_json:
            # 從環境變數生成 JSON 檔案
            try:
                credentials_data = json.loads(self.google_credentials_json)
                with open(self.google_credentials_path, 'w') as f:
                    json.dump(credentials_data, f, indent=2)
                return self.google_credentials_path
            except Exception as e:
                raise ValueError(f"Invalid Google credentials JSON: {e}")
        
        return self.google_credentials_path
    
    def is_firebase_enabled(self) -> bool:
        """檢查 Firebase 是否已啟用（可選）"""
        return bool(
            self.firebase_project_id and 
            self.firebase_private_key and 
            self.firebase_client_email
        )
    
    def is_google_drive_enabled(self) -> bool:
        """檢查 Google Drive 是否已啟用（必要）"""
        return bool(self.google_drive_folder_id)
    
    def is_google_drive_accessible(self) -> bool:
        """檢查 Google Drive 是否可存取（必要）"""
        if not self.is_google_drive_enabled():
            return False
        
        # 檢查是否有認證檔案或環境變數
        if os.path.exists(self.google_credentials_path):
            return True
        
        if self.google_credentials_json:
            return True
        
        return False
    
    def is_line_bot_enabled(self) -> bool:
        """檢查 LINE Bot 是否已啟用（可選）"""
        return bool(self.line_channel_secret and self.line_channel_access_token)


settings = Settings()
