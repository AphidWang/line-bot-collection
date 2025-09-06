'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Plus, Trash2, Settings, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface UserChannel {
  id: string;
  channelId: string;
  status: 'active' | 'inactive' | 'error';
  webhookUrl: string;
  createdAt: string;
}

interface ChannelManagerProps {
  onChannelSelect?: (channelId: string) => void;
}

export default function ChannelManager({ onChannelSelect }: ChannelManagerProps) {
  const [channels, setChannels] = useState<UserChannel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newChannel, setNewChannel] = useState({
    channelId: '',
    accessToken: '',
    channelSecret: ''
  });

  // 獲取用戶頻道列表
  const fetchChannels = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('https://lucentis.zeabur.app/api/user-channels', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setChannels(data.channels || []);
      }
    } catch (error) {
      console.error('Failed to fetch channels:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 添加新頻道
  const handleAddChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('https://lucentis.zeabur.app/api/user-channels', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newChannel)
      });

      if (response.ok) {
        setNewChannel({ channelId: '', accessToken: '', channelSecret: '' });
        setShowAddForm(false);
        fetchChannels(); // 重新獲取列表
      } else {
        const error = await response.json();
        alert(`添加頻道失敗: ${error.message}`);
      }
    } catch (error) {
      console.error('Failed to add channel:', error);
      alert('添加頻道失敗');
    } finally {
      setIsLoading(false);
    }
  };

  // 刪除頻道
  const handleDeleteChannel = async (channelId: string) => {
    if (!confirm('確定要刪除這個頻道嗎？')) return;

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`https://lucentis.zeabur.app/api/user-channels/${channelId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        fetchChannels(); // 重新獲取列表
      } else {
        alert('刪除頻道失敗');
      }
    } catch (error) {
      console.error('Failed to delete channel:', error);
      alert('刪除頻道失敗');
    }
  };

  // 更新頻道狀態
  const handleUpdateStatus = async (channelId: string, status: string) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`https://lucentis.zeabur.app/api/user-channels/${channelId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        fetchChannels(); // 重新獲取列表
      }
    } catch (error) {
      console.error('Failed to update channel status:', error);
    }
  };

  // 獲取狀態圖示
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'inactive':
        return <XCircle className="h-4 w-4 text-gray-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  // 獲取狀態文字
  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return '運行中';
      case 'inactive':
        return '已停用';
      case 'error':
        return '錯誤';
      default:
        return '未知';
    }
  };

  useEffect(() => {
    fetchChannels();
  }, []);

  return (
    <div className="space-y-6">
      {/* 添加頻道按鈕 */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">頻道管理</h2>
        <Button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          添加頻道
        </Button>
      </div>

      {/* 添加頻道表單 */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>添加新頻道</CardTitle>
            <CardDescription>
              輸入 LINE Bot 的憑證資訊來監控頻道
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddChannel} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Channel ID
                </label>
                <Input
                  type="text"
                  value={newChannel.channelId}
                  onChange={(e) => setNewChannel(prev => ({ ...prev, channelId: e.target.value }))}
                  placeholder="輸入 LINE Channel ID"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Access Token
                </label>
                <Input
                  type="password"
                  value={newChannel.accessToken}
                  onChange={(e) => setNewChannel(prev => ({ ...prev, accessToken: e.target.value }))}
                  placeholder="輸入 LINE Access Token"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Channel Secret
                </label>
                <Input
                  type="password"
                  value={newChannel.channelSecret}
                  onChange={(e) => setNewChannel(prev => ({ ...prev, channelSecret: e.target.value }))}
                  placeholder="輸入 LINE Channel Secret"
                  required
                />
              </div>
              
              <div className="flex space-x-2">
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? '添加中...' : '添加頻道'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddForm(false)}
                >
                  取消
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* 頻道列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {channels.map((channel) => (
          <Card key={channel.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{channel.channelId}</CardTitle>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(channel.status)}
                  <span className="text-sm text-gray-600">
                    {getStatusText(channel.status)}
                  </span>
                </div>
              </div>
              <CardDescription>
                創建於 {new Date(channel.createdAt).toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-sm">
                  <strong>Webhook URL:</strong>
                  <div className="font-mono text-xs bg-gray-100 p-2 rounded mt-1 break-all">
                    {channel.webhookUrl}
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onChannelSelect?.(channel.channelId)}
                  >
                    <Settings className="h-4 w-4 mr-1" />
                    查看訊息
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleUpdateStatus(
                      channel.channelId, 
                      channel.status === 'active' ? 'inactive' : 'active'
                    )}
                  >
                    {channel.status === 'active' ? '停用' : '啟用'}
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteChannel(channel.channelId)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {channels.length === 0 && !isLoading && (
        <div className="text-center py-8 text-gray-500">
          還沒有添加任何頻道
        </div>
      )}
    </div>
  );
}
