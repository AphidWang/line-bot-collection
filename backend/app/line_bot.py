"""
LINE Bot 服務模組
處理 LINE Bot webhook 驗證和訊息回覆
"""

import hmac
import hashlib
import base64
import json
import logging
from typing import Dict, Any, List
from datetime import datetime
import httpx
from app.config import settings

logger = logging.getLogger(__name__)

class LineBotService:
    def __init__(self):
        self.channel_secret = settings.line_channel_secret
        self.channel_access_token = settings.line_channel_access_token
        self.api_base_url = "https://api.line.me/v2"
        
        if not self.channel_secret or not self.channel_access_token:
            logger.warning("LINE Bot 未完全設定，某些功能可能無法使用")
    
    def verify_signature(self, body: str, signature: str) -> bool:
        """驗證 LINE webhook 簽名"""
        if not self.channel_secret:
            logger.error("LINE Channel Secret 未設定")
            return False
        
        try:
            # 計算 HMAC-SHA256 簽名
            hash_value = hmac.new(
                self.channel_secret.encode('utf-8'),
                body.encode('utf-8'),
                hashlib.sha256
            ).digest()
            
            calculated_signature = base64.b64encode(hash_value).decode('utf-8')
            return hmac.compare_digest(calculated_signature, signature)
        except Exception as e:
            logger.error(f"簽名驗證失敗: {e}")
            return False
    
    async def reply_message(self, reply_token: str, messages: List[Dict[str, Any]]) -> bool:
        """回覆訊息到 LINE"""
        if not self.channel_access_token:
            logger.error("LINE Channel Access Token 未設定")
            return False
        
        try:
            url = f"{self.api_base_url}/bot/message/reply"
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.channel_access_token}"
            }
            
            data = {
                "replyToken": reply_token,
                "messages": messages
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(url, headers=headers, json=data)
                
                if response.status_code == 200:
                    logger.info(f"訊息回覆成功: {reply_token}")
                    return True
                else:
                    logger.error(f"訊息回覆失敗: {response.status_code} - {response.text}")
                    return False
                    
        except Exception as e:
            logger.error(f"回覆訊息時發生錯誤: {e}")
            return False
    
    async def push_message(self, to: str, messages: List[Dict[str, Any]]) -> bool:
        """推送訊息到指定用戶或群組"""
        if not self.channel_access_token:
            logger.error("LINE Channel Access Token 未設定")
            return False
        
        try:
            url = f"{self.api_base_url}/bot/message/push"
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.channel_access_token}"
            }
            
            data = {
                "to": to,
                "messages": messages
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(url, headers=headers, json=data)
                
                if response.status_code == 200:
                    logger.info(f"訊息推送成功: {to}")
                    return True
                else:
                    logger.error(f"訊息推送失敗: {response.status_code} - {response.text}")
                    return False
                    
        except Exception as e:
            logger.error(f"推送訊息時發生錯誤: {e}")
            return False
    
    def create_text_message(self, text: str) -> Dict[str, Any]:
        """建立文字訊息"""
        return {
            "type": "text",
            "text": text
        }
    
    def create_flex_message(self, alt_text: str, contents: Dict[str, Any]) -> Dict[str, Any]:
        """建立 Flex 訊息"""
        return {
            "type": "flex",
            "altText": alt_text,
            "contents": contents
        }
    
    def create_quick_reply(self, text: str, items: List[Dict[str, Any]]) -> Dict[str, Any]:
        """建立快速回覆訊息"""
        return {
            "type": "text",
            "text": text,
            "quickReply": {
                "items": items
            }
        }
    
    def create_quick_reply_item(self, action: Dict[str, Any], image_url: str = None) -> Dict[str, Any]:
        """建立快速回覆項目"""
        item = {"action": action}
        if image_url:
            item["imageUrl"] = image_url
        return item
    
    def create_action(self, label: str, data: str, text: str = None) -> Dict[str, Any]:
        """建立動作"""
        action = {
            "type": "postback",
            "label": label,
            "data": data
        }
        if text:
            action["text"] = text
        return action
    
    async def generate_smart_reply(self, message: str, group_id: str) -> Dict[str, Any]:
        """生成群組訊息的智能回覆"""
        message_lower = message.lower().strip()
        
        # 關鍵字觸發的回覆
        if "幫助" in message or "help" in message_lower:
            return self.create_quick_reply(
                "📚 我可以幫您做什麼？",
                [
                    self.create_quick_reply_item(
                        self.create_action("功能說明", "help", "功能說明"),
                        "https://example.com/help-icon.png"
                    ),
                    self.create_quick_reply_item(
                        self.create_action("查詢訊息", "search", "查詢訊息"),
                        "https://example.com/search-icon.png"
                    ),
                    self.create_quick_reply_item(
                        self.create_action("群組分析", "analyze", "群組分析"),
                        "https://example.com/analyze-icon.png"
                    )
                ]
            )
        
        elif "查詢" in message or "search" in message_lower:
            return self.create_text_message(
                "🔍 請輸入查詢條件：\n"
                "• 日期範圍：例如「2025-08-30 到 2025-08-31」\n"
                "• 關鍵字：例如「包含 AI 的訊息」\n"
                "• 用戶：例如「user123 的訊息」"
            )
        
        elif "分析" in message or "analyze" in message_lower:
            return self.create_text_message(
                "📊 群組分析功能：\n"
                "• 訊息統計：總數、活躍時段\n"
                "• 用戶分析：活躍用戶排行\n"
                "• 話題趨勢：熱門關鍵字\n"
                "• 互動分析：回覆率、參與度"
            )
        
        elif "摘要" in message or "summary" in message_lower:
            return self.create_text_message(
                "🤖 AI 摘要功能：\n"
                "• 自動生成群組對話摘要\n"
                "• 識別重要話題和決策\n"
                "• 提供行動項目建議\n"
                "• 支援多種時間範圍"
            )
        
        elif "狀態" in message or "status" in message_lower:
            return self.create_text_message(
                "✅ Bot 狀態：正常運行\n"
                f"📅 當前時間：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
                f"🏷️ 群組 ID：{group_id}\n"
                "💾 訊息儲存：Google Drive\n"
                "🔐 認證狀態：已驗證"
            )
        
        # 問候語回覆
        elif any(word in message for word in ["你好", "hi", "hello", "早安", "晚安"]):
            greetings = ["你好！", "Hi！", "Hello！", "早安！", "晚安！"]
            import random
            greeting = random.choice(greetings)
            return self.create_text_message(f"{greeting} 我是 LINE Assistant Bot 🤖")
        
        # 感謝回覆
        elif any(word in message for word in ["謝謝", "感謝", "thank", "thanks"]):
            return self.create_text_message("不客氣！很高興能幫到您 😊")
        
        # 預設回覆（機率性）
        elif len(message) > 10:  # 長訊息才回覆
            import random
            if random.random() < 0.3:  # 30% 機率
                return self.create_text_message(
                    "💡 小提示：輸入「幫助」查看我的完整功能！"
                )
        
        return None  # 不回覆
    
    async def generate_private_reply(self, message: str, user_id: str) -> Dict[str, Any]:
        """生成私聊訊息的智能回覆"""
        message_lower = message.lower().strip()
        
        if "幫助" in message or "help" in message_lower:
            return self.create_text_message(
                "👋 私聊功能說明：\n\n"
                "🔐 帳號管理：\n"
                "• 查看個人資料\n"
                "• 修改設定\n"
                "• 登出帳號\n\n"
                "📊 個人統計：\n"
                "• 訊息發送統計\n"
                "• 群組參與度\n"
                "• 活躍時段分析\n\n"
                "🤖 AI 助手：\n"
                "• 個人化建議\n"
                "• 學習進度追蹤\n"
                "• 智能提醒\n\n"
                "輸入「設定」查看更多選項"
            )
        
        elif "設定" in message or "settings" in message_lower:
            return self.create_quick_reply(
                "⚙️ 個人設定選項：",
                [
                    self.create_quick_reply_item(
                        self.create_action("通知設定", "notifications", "通知設定")
                    ),
                    self.create_quick_reply_item(
                        self.create_action("隱私設定", "privacy", "隱私設定")
                    ),
                    self.create_quick_reply_item(
                        self.create_action("語言設定", "language", "language")
                    )
                ]
            )
        
        elif "統計" in message or "stats" in message_lower:
            return self.create_text_message(
                f"📊 您的個人統計：\n\n"
                f"🆔 用戶 ID：{user_id}\n"
                f"📅 註冊時間：2025-08-30\n"
                f"💬 總訊息數：計算中...\n"
                f"👥 參與群組：計算中...\n"
                f"⭐ 活躍度：計算中...\n\n"
                f"更多詳細統計請訪問 Web 管理介面"
            )
        
        else:
            return self.create_text_message(
                "👋 您好！我是您的個人 LINE Assistant Bot\n\n"
                "💡 我可以幫您：\n"
                "• 管理個人設定\n"
                "• 查看使用統計\n"
                "• 提供個人化建議\n\n"
                "輸入「幫助」查看完整功能說明"
            )

# 全域 LINE Bot 服務實例
line_bot_service = LineBotService()
