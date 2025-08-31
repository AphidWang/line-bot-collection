#!/usr/bin/env python3
"""
測試 LINE Bot 功能
"""

import sys
import os
import json
import asyncio

# 加入專案路徑
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.line_bot import line_bot_service
from app.config import settings

async def test_line_bot():
    """測試 LINE Bot 功能"""
    print("🧪 開始測試 LINE Bot 功能...")
    
    # 檢查設定
    print(f"\n📋 設定檢查：")
    print(f"  - Channel Secret: {'✅ 已設定' if settings.line_channel_secret else '❌ 未設定'}")
    print(f"  - Channel Access Token: {'✅ 已設定' if settings.line_channel_access_token else '❌ 未設定'}")
    
    if not settings.line_channel_secret or not settings.line_channel_access_token:
        print("\n❌ LINE Bot 設定不完整，無法進行測試")
        print("請在 .env 檔案中設定 LINE_CHANNEL_SECRET 和 LINE_CHANNEL_ACCESS_TOKEN")
        return False
    
    # 測試簽名驗證
    print(f"\n🔐 測試簽名驗證：")
    test_body = '{"events":[{"type":"message","message":{"type":"text","text":"test"}}]}'
    test_signature = "invalid_signature"
    
    is_valid = line_bot_service.verify_signature(test_body, test_signature)
    print(f"  - 無效簽名測試: {'✅ 正確拒絕' if not is_valid else '❌ 錯誤接受'}")
    
    # 測試訊息建立
    print(f"\n💬 測試訊息建立：")
    
    # 文字訊息
    text_msg = line_bot_service.create_text_message("測試訊息")
    print(f"  - 文字訊息: {text_msg}")
    
    # 快速回覆
    quick_reply = line_bot_service.create_quick_reply(
        "選擇功能：",
        [
            line_bot_service.create_quick_reply_item(
                line_bot_service.create_action("幫助", "help", "幫助")
            ),
            line_bot_service.create_quick_reply_item(
                line_bot_service.create_action("查詢", "search", "查詢")
            )
        ]
    )
    print(f"  - 快速回覆: {json.dumps(quick_reply, ensure_ascii=False, indent=2)}")
    
    # 測試智能回覆
    print(f"\n🤖 測試智能回覆：")
    
    # 群組訊息測試
    test_messages = [
        "幫助",
        "查詢",
        "分析",
        "摘要",
        "狀態",
        "你好",
        "謝謝",
        "這是一條很長的測試訊息，用來測試隨機回覆功能"
    ]
    
    for msg in test_messages:
        reply = await line_bot_service.generate_smart_reply(msg, "test_group_123")
        if reply:
            print(f"  - 「{msg}」→ 有回覆")
        else:
            print(f"  - 「{msg}」→ 無回覆")
    
    # 私聊訊息測試
    print(f"\n👤 測試私聊回覆：")
    private_messages = ["幫助", "設定", "統計", "其他訊息"]
    
    for msg in private_messages:
        reply = await line_bot_service.generate_private_reply(msg, "test_user_123")
        if reply:
            print(f"  - 「{msg}」→ 有回覆")
        else:
            print(f"  - 「{msg}」→ 無回覆")
    
    print(f"\n✅ LINE Bot 功能測試完成！")
    return True

async def test_webhook_verification():
    """測試 webhook 簽名驗證"""
    print(f"\n🔐 測試 webhook 簽名驗證：")
    
    # 模擬 LINE webhook 請求
    test_body = '{"events":[{"type":"message","message":{"type":"text","text":"test"}}]}'
    
    # 使用正確的 Channel Secret 計算簽名
    if settings.line_channel_secret:
        import hmac
        import hashlib
        import base64
        
        hash_value = hmac.new(
            settings.line_channel_secret.encode('utf-8'),
            test_body.encode('utf-8'),
            hashlib.sha256
        ).digest()
        
        valid_signature = base64.b64encode(hash_value).decode('utf-8')
        
        # 測試有效簽名
        is_valid = line_bot_service.verify_signature(test_body, valid_signature)
        print(f"  - 有效簽名測試: {'✅ 正確接受' if is_valid else '❌ 錯誤拒絕'}")
        
        # 測試無效簽名
        is_invalid = line_bot_service.verify_signature(test_body, "invalid_signature")
        print(f"  - 無效簽名測試: {'✅ 正確拒絕' if not is_invalid else '❌ 錯誤接受'}")
    else:
        print("  - ❌ Channel Secret 未設定，跳過簽名驗證測試")
    
    return True

async def main():
    """主函數"""
    print("🚀 LINE Bot 測試工具")
    print("=" * 50)
    
    try:
        # 基本功能測試
        await test_line_bot()
        
        # Webhook 驗證測試
        await test_webhook_verification()
        
        print(f"\n🎉 所有測試完成！")
        print(f"\n📝 下一步：")
        print(f"  1. 在 LINE Developers Console 設定 Webhook URL")
        print(f"  2. 使用 ngrok 建立本地隧道進行測試")
        print(f"  3. 將 Bot 加入群組測試功能")
        
    except Exception as e:
        print(f"\n❌ 測試過程中發生錯誤: {e}")
        return False
    
    return True

if __name__ == "__main__":
    success = asyncio.run(main())
    
    if success:
        print("\n✅ 測試成功！")
    else:
        print("\n❌ 測試失敗！")
        sys.exit(1)
