#!/usr/bin/env python3
"""
測試 Google Drive 存取
"""

import sys
import os

# 加入專案路徑
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.config import settings
from app.google_drive import GoogleDriveService

def test_google_drive():
    """測試 Google Drive 存取"""
    try:
        print("🚀 開始測試 Google Drive...")
        
        # 檢查設定
        print(f"📁 資料夾 ID: {settings.google_drive_folder_id}")
        print(f"🔑 認證檔案: {settings.get_google_credentials_path()}")
        
        # 初始化服務
        credentials_path = settings.get_google_credentials_path()
        google_drive_service = GoogleDriveService(
            credentials_path=credentials_path,
            folder_id=settings.google_drive_folder_id
        )
        
        print("✅ Google Drive 服務初始化成功")
        
        # 先測試讀取現有檔案
        print("📖 測試讀取現有檔案...")
        
        # 列出資料夾中的所有檔案
        try:
            results = google_drive_service.service.files().list(
                q=f"'{settings.google_drive_folder_id}' in parents and trashed=false",
                fields="files(id, name, mimeType)"
            ).execute()
            
            files = results.get('files', [])
            print(f"📁 資料夾中找到 {len(files)} 個檔案:")
            for file in files:
                print(f"  - {file['name']} (ID: {file['id']}, 類型: {file['mimeType']})")
        except Exception as e:
            print(f"❌ 列出檔案失敗: {e}")
        
        # 嘗試讀取你建立的檔案
        print("\n📖 測試讀取你建立的檔案...")
        try:
            # 先檢查是否有 test.json 或類似的檔案
            test_file_id = google_drive_service._get_file_id_by_name('test.json')
            if test_file_id:
                print(f"✅ 找到 test.json，ID: {test_file_id}")
                content = google_drive_service._read_file_content('test.json')
                if content:
                    print(f"✅ 檔案內容: {content}")
                else:
                    print("⚠️  檔案是空的或讀取失敗")
            else:
                print("⚠️  沒有找到 test.json")
        except Exception as e:
            print(f"❌ 讀取檔案失敗: {e}")
        
        # 測試建立簡單檔案
        print("\n📝 測試建立新檔案...")
        try:
            test_content = {
                'test': True,
                'message': '這是一個測試檔案',
                'timestamp': '2025-08-30T00:00:00'
            }
            
            file_id = google_drive_service._create_file_if_not_exists('test2.json', test_content)
            print(f"✅ 測試檔案建立成功，ID: {file_id}")
        except Exception as e:
            print(f"❌ 建立檔案失敗: {e}")
        
        print("\n🎉 Google Drive 測試完成！")
        return True
        
    except Exception as e:
        print(f"❌ 測試失敗: {e}")
        return False

if __name__ == "__main__":
    success = test_google_drive()
    
    if success:
        print("\n✅ 測試成功！")
    else:
        print("\n❌ 測試失敗！請檢查設定和錯誤訊息。")
        sys.exit(1)
