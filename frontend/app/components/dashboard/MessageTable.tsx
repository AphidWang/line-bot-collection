'use client';

import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { API_ENDPOINTS } from '@/app/lib/api';

interface Message {
  id: string | number;
  group_id: string;
  user_id: string;
  timestamp: string;
  message: string;
}

interface MessageTableProps {
  messages: Message[];
}

export default function MessageTable({ messages }: MessageTableProps) {
  const openSignedUrl = async (id: string) => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return alert('尚未登入');
      const resp = await fetch(API_ENDPOINTS.MESSAGES.SIGNED_URL(id), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!resp.ok) return alert('取得下載連結失敗');
      const data = await resp.json();
      window.open(data.url, '_blank');
    } catch (e) {
      console.error('openSignedUrl error:', e);
      alert('開啟連結失敗');
    }
  };

  const isAttachmentLike = (text: string) => {
    return /\[(圖片|影片|語音|檔案)\]/.test(text);
  };
  if (messages.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        沒有找到符合條件的訊息
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              時間
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              群組 ID
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              用戶 ID
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              訊息內容
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {messages.map((message) => (
            <tr key={message.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {format(new Date(message.timestamp), 'yyyy-MM-dd HH:mm:ss', { locale: zhTW })}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                {message.group_id}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                {message.user_id}
              </td>
              <td className="px-6 py-4 text-sm text-gray-900 max-w-md">
                <div className="truncate flex items-center gap-2" title={message.message}>
                  <span className="flex-1 truncate">{message.message}</span>
                  {/* 下載/預覽：當內容看起來是附件占位符或包含 R2 key/url 時顯示 */}
                  {isAttachmentLike(message.message) && (
                    <button
                      className="text-blue-600 hover:underline whitespace-nowrap"
                      onClick={() => openSignedUrl(String(message.id))}
                    >
                      下載/預覽
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
