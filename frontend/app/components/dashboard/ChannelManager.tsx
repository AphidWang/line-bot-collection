'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Plus, Trash2, Settings, CheckCircle, XCircle, AlertCircle, Copy, ExternalLink, Share2, Users, X } from 'lucide-react';
import { userChannelsAPI, sharesAPI } from '@/app/lib/api';

interface UserChannel {
  id: string;
  channelId: string;
  alias?: string;
  status: 'active' | 'inactive' | 'error';
  webhookUrl: string;
  createdAt: string;
  isOwner?: boolean;
  isShared?: boolean;
  sharedBy?: {
    id: string;
    email: string;
    name?: string;
  };
}

interface ChannelManagerProps {
  onChannelSelect?: (channelId: string) => void;
}

export default function ChannelManager({ onChannelSelect }: ChannelManagerProps) {
  const [channels, setChannels] = useState<UserChannel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showShareForm, setShowShareForm] = useState<string | null>(null);
  const [shareEmail, setShareEmail] = useState('');
  const [showSharesList, setShowSharesList] = useState<string | null>(null);
  const [shares, setShares] = useState<any[]>([]);
  const [newChannel, setNewChannel] = useState({
    channelId: '',
    accessToken: '',
    channelSecret: '',
    alias: ''
  });

  // 獲取用戶頻道列表
  const fetchChannels = async () => {
    setIsLoading(true);
    try {
      const data = await userChannelsAPI.list();
      setChannels(data.channels || []);
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
      await userChannelsAPI.create(newChannel);
      setNewChannel({ channelId: '', accessToken: '', channelSecret: '', alias: '' });
      setShowAddForm(false);
      fetchChannels();
    } catch (error: any) {
      console.error('Failed to add channel:', error);
      alert(`添加頻道失敗${error?.message ? `: ${error.message}` : ''}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 刪除頻道
  const handleDeleteChannel = async (channelId: string) => {
    if (!confirm('確定要刪除這個頻道嗎？')) return;

    try {
      await userChannelsAPI.remove(channelId);
      fetchChannels();
    } catch (error) {
      console.error('Failed to delete channel:', error);
      alert('刪除頻道失敗');
    }
  };

  // 更新頻道狀態
  const handleUpdateStatus = async (channelId: string, status: string) => {
    try {
      await userChannelsAPI.updateStatus(channelId, status as any);
      fetchChannels();
    } catch (error) {
      console.error('Failed to update channel status:', error);
    }
  };

  // 更新別名
  const handleUpdateAlias = async (channelId: string) => {
    const alias = prompt('輸入別名（留空可清除）：') ?? undefined;
    try {
      await userChannelsAPI.updateAlias(channelId, alias);
      fetchChannels();
    } catch (error) {
      console.error('Failed to update alias:', error);
      alert('更新別名失敗');
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

  // 複製 Webhook URL
  const copyWebhookUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      alert('Webhook URL 已複製到剪貼板');
    } catch (error) {
      console.error('Failed to copy:', error);
      alert('複製失敗，請手動複製');
    }
  };

  // 分享頻道
  const handleShareChannel = async (channelId: string) => {
    if (!shareEmail.trim()) {
      alert('請輸入 email');
      return;
    }

    try {
      await sharesAPI.shareChannel(channelId, shareEmail);
      alert('頻道分享成功');
      setShareEmail('');
      setShowShareForm(null);
      fetchChannelShares(channelId);
    } catch (error: any) {
      console.error('Failed to share channel:', error);
      alert(`分享失敗: ${error.message}`);
    }
  };

  // 取消分享頻道
  const handleUnshareChannel = async (channelId: string, userId: string) => {
    if (!confirm('確定要取消分享嗎？')) return;

    try {
      await sharesAPI.unshareChannel(channelId, userId);
      alert('已取消分享');
      fetchChannelShares(channelId);
    } catch (error) {
      console.error('Failed to unshare channel:', error);
      alert('取消分享失敗');
    }
  };

  // 獲取頻道分享列表
  const fetchChannelShares = async (channelId: string) => {
    try {
      const data = await sharesAPI.getChannelShares(channelId);
      setShares(data.shares || []);
    } catch (error) {
      console.error('Failed to fetch channel shares:', error);
    }
  };

  // 移除被分享的頻道
  const handleRemoveSharedChannel = async (channelId: string) => {
    if (!confirm('確定要移除這個分享的頻道嗎？')) return;

    try {
      await sharesAPI.removeSharedChannel(channelId);
      alert('已移除分享的頻道');
      fetchChannels();
    } catch (error) {
      console.error('Failed to remove shared channel:', error);
      alert('移除失敗');
    }
  };

  useEffect(() => {
    fetchChannels();
  }, []);

  return (
    <div className="space-y-6">
      {/* 添加頻道按鈕 */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">帳號管理</h2>
          <p className="text-sm text-gray-600 mt-1">
            管理您的 LINE Bot 帳號，每個帳號都有獨立的 Webhook URL
          </p>
        </div>
        <Button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          添加帳號
        </Button>
      </div>

      {/* 添加帳號表單 */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>添加新帳號</CardTitle>
            <CardDescription>
              輸入 LINE Bot 的憑證資訊來監控帳號。添加後會生成專屬的 Webhook URL，請將其配置到 LINE 開發者後台。
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  別名（可選）
                </label>
                <Input
                  type="text"
                  value={newChannel.alias}
                  onChange={(e) => setNewChannel(prev => ({ ...prev, alias: e.target.value }))}
                  placeholder="顯示名稱，如：公司客服 Bot"
                />
              </div>
              
              <div className="flex space-x-2">
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? '添加中...' : '添加帳號'}
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

      {/* 配置說明 */}
      {channels.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <ExternalLink className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-900">如何配置 Webhook URL</h3>
                <p className="text-sm text-blue-700 mt-1">
                  1. 複製下方頻道的 Webhook URL<br/>
                  2. 前往 <a href="https://developers.line.biz/console/" target="_blank" rel="noopener noreferrer" className="underline">LINE 開發者後台</a><br/>
                  3. 選擇對應的 Bot，進入「Messaging API」設定<br/>
                  4. 將 Webhook URL 貼到「Webhook URL」欄位並啟用
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 帳號列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {channels.map((channel) => (
          <Card key={channel.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {channel.alias ? `${channel.alias} (${channel.channelId})` : channel.channelId}
                  {channel.isShared && (
                    <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      分享自 {channel.sharedBy?.name || channel.sharedBy?.email}
                    </span>
                  )}
                </CardTitle>
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
              {/* 動作按鈕移到狀態下方，避免超出格子 */}
              <div className="flex flex-wrap gap-2 mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onChannelSelect?.(channel.channelId)}
                >
                  <Settings className="h-4 w-4 mr-1" />
                  查看訊息
                </Button>
                
                {/* 只有擁有者才能看到管理按鈕 */}
                {channel.isOwner !== false && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUpdateAlias(channel.channelId)}
                    >
                      設定別名
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
                      onClick={() => setShowShareForm(channel.channelId)}
                    >
                      <Share2 className="h-4 w-4 mr-1" />
                      分享
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setShowSharesList(channel.channelId);
                        fetchChannelShares(channel.channelId);
                      }}
                    >
                      <Users className="h-4 w-4 mr-1" />
                      分享列表
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteChannel(channel.channelId)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
                
                {/* 被分享的頻道只能移除 */}
                {channel.isShared && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRemoveSharedChannel(channel.channelId)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="h-4 w-4 mr-1" />
                    移除
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-sm">
                  <div className="flex items-center justify-between mb-2">
                    <strong>Webhook URL:</strong>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyWebhookUrl(channel.webhookUrl)}
                      className="h-6 px-2 text-xs"
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      複製
                    </Button>
                  </div>
                  <div className="font-mono text-xs bg-gray-100 p-2 rounded break-all">
                    {channel.webhookUrl}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    請將此 URL 配置到 LINE 開發者後台的 Webhook URL 設定中
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {channels.length === 0 && !isLoading && (
        <div className="text-center py-8 text-gray-500">
          還沒有添加任何帳號
        </div>
      )}

      {/* 分享表單 Modal */}
      {showShareForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>分享頻道</CardTitle>
              <CardDescription>
                輸入對方的 email 來分享頻道
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <Input
                    type="email"
                    value={shareEmail}
                    onChange={(e) => setShareEmail(e.target.value)}
                    placeholder="輸入對方的 email"
                    required
                  />
                </div>
                <div className="flex space-x-2">
                  <Button
                    onClick={() => handleShareChannel(showShareForm)}
                    disabled={!shareEmail.trim()}
                  >
                    分享
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowShareForm(null);
                      setShareEmail('');
                    }}
                  >
                    取消
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 分享列表 Modal */}
      {showSharesList && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg mx-4">
            <CardHeader>
              <CardTitle>分享列表</CardTitle>
              <CardDescription>
                管理此頻道的分享對象
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {shares.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">還沒有分享給任何人</p>
                ) : (
                  <div className="space-y-2">
                    {shares.map((share) => (
                      <div key={share.id} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <p className="font-medium">{share.sharedWith.name || share.sharedWith.email}</p>
                          <p className="text-sm text-gray-500">
                            分享於 {new Date(share.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUnshareChannel(showSharesList, share.sharedWith.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          取消分享
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setShowSharesList(null)}
                  >
                    關閉
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
