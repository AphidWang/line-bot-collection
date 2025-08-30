'use client';

import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';

interface Message {
  id: number;
  group_id: string;
  user_id: string;
  timestamp: string;
  message: string;
}

interface MessageTableProps {
  messages: Message[];
}

export default function MessageTable({ messages }: MessageTableProps) {
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
                <div className="truncate" title={message.message}>
                  {message.message}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
