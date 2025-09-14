'use client';

import { useState, useEffect } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '@/app/firebase';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { MessageSquare, LogOut, Filter, Eye, Brain, Calendar, RefreshCw, Settings } from 'lucide-react';
import MessageTable from './MessageTable';
import SummaryModal from './SummaryModal';
import ChannelManager from './ChannelManager';

interface Message {
  id: number;
  group_id: string;
  user_id: string;
  timestamp: string;
  message: string;
}

interface JwtUser {
  email: string;
  user_type: string;
}

export default function Dashboard() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [filteredMessages, setFilteredMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showRawMessages, setShowRawMessages] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showChannelManager, setShowChannelManager] = useState(false);
  const [jwtUser, setJwtUser] = useState<JwtUser | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [userChannels, setUserChannels] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    groupId: ''
  });

  useEffect(() => {
    // 檢查 JWT token
    const checkJwtToken = () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          if (payload.exp * 1000 > Date.now()) {
            setJwtUser({
              email: payload.sub,
              user_type: 'jwt'
            });
            return true;
          } else {
            localStorage.removeItem('access_token');
            window.location.reload();
          }
        } catch (error) {
          console.error('JWT token 解析失敗:', error);
          localStorage.removeItem('access_token');
          window.location.reload();
        }
      }
      return false;
    };

    checkJwtToken();
  }, []);

  // 當 jwtUser 或 auth.currentUser 改變時才獲取訊息和頻道
  useEffect(() => {
    if (jwtUser || (auth && auth.currentUser)) {
      fetchMessages();
      fetchUserChannels();
    }
  }, [jwtUser, auth?.currentUser]);

  // 當選擇的頻道改變時重新載入訊息
  useEffect(() => {
    if (userChannels.length > 0) {
      fetchMessages();
    }
  }, [selectedChannel]);

  useEffect(() => {
    applyFilters();
  }, [messages, filters]);

  const fetchMessages = async () => {
    setIsLoading(true);
    try {
      let token;
      if (jwtUser) {
        // JWT 用戶
        token = localStorage.getItem('access_token');
      } else if (auth && auth.currentUser) {
        // Firebase 用戶
        token = await auth.currentUser.getIdToken();
      }

      if (!token) {
        console.error('No valid token found');
        return;
      }

      let url = 'https://lucentis.zeabur.app/api/messages';
      if (selectedChannel) {
        url += `?channelId=${selectedChannel}`;
      }
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        // 轉換 API 回應格式到組件期望的格式
        const formattedMessages = data.messages.map((msg: any) => ({
          id: msg.id,
          group_id: msg.channel?.name || msg.channelId,
          user_id: msg.user?.name || msg.userId,
          timestamp: msg.timestamp,
          message: msg.content
        }));
        setMessages(formattedMessages);
      } else {
        console.error('Failed to fetch messages:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserChannels = async () => {
    try {
      let token;
      if (jwtUser) {
        token = localStorage.getItem('access_token');
      } else if (auth && auth.currentUser) {
        token = await auth.currentUser.getIdToken();
      }

      if (!token) return;

      const response = await fetch('https://lucentis.zeabur.app/api/user-channels', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUserChannels(data.channels || []);
      }
    } catch (error) {
      console.error('Error fetching user channels:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...messages];

    if (filters.startDate) {
      filtered = filtered.filter(msg => 
        new Date(msg.timestamp) >= new Date(filters.startDate)
      );
    }

    if (filters.endDate) {
      filtered = filtered.filter(msg => 
        new Date(msg.timestamp) <= new Date(filters.endDate)
      );
    }

    if (filters.groupId) {
      filtered = filtered.filter(msg => 
        msg.group_id.includes(filters.groupId)
      );
    }

    setFilteredMessages(filtered);
  };

  const handleLogout = async () => {
    try {
      if (jwtUser) {
        // JWT 用戶登出
        localStorage.removeItem('access_token');
        window.location.reload();
      } else if (auth && auth.currentUser) {
        // Firebase 用戶登出
        await signOut(auth);
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleGenerateSummary = () => {
    setShowSummaryModal(true);
  };

  const handleRefresh = () => {
    fetchMessages();
  };

  // 取得所有群組
  const getChannels = () => {
    const channels = new Set(messages.map(m => m.group_id));
    return Array.from(channels);
  };

  // 取得選中群組的訊息
  const getChannelMessages = (channelId: string) => {
    return messages.filter(m => m.group_id === channelId);
  };

  // 根據頻道名稱找到對應的 channelId
  const getChannelIdByName = (channelName: string) => {
    const channel = userChannels.find(c => c.channelId === channelName);
    return channel ? channel.channelId : null;
  };

  // 取得用戶顏色
  const getUserColor = (userId: string) => {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500',
      'bg-indigo-500', 'bg-yellow-500', 'bg-red-500', 'bg-teal-500',
      'bg-orange-500', 'bg-cyan-500'
    ];
    const hash = userId.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return colors[Math.abs(hash) % colors.length];
  };

  // 取得當前用戶 email
  const getCurrentUserEmail = () => {
    if (jwtUser) {
      return jwtUser.email;
    } else if (auth && auth.currentUser) {
      return auth.currentUser.email;
    }
    return '';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <MessageSquare className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">LINE Assistant</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => setShowChannelManager(true)}
                variant="outline"
                size="sm"
                className="flex items-center space-x-2"
              >
                <Settings className="h-4 w-4" />
                <span>頻道設定</span>
              </Button>
              <span className="text-sm text-gray-600">
                {getCurrentUserEmail()}
              </span>
              <Button onClick={handleLogout} variant="outline" size="sm">
                <LogOut className="h-4 w-4 mr-2" />
                登出
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">總訊息數</CardTitle>
              <MessageSquare className="h-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{messages.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">群組數量</CardTitle>
              <MessageSquare className="h-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Set(messages.map(m => m.group_id)).size}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">活躍用戶</CardTitle>
              <MessageSquare className="h-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Set(messages.map(m => m.user_id)).size}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="h-5 w-5 mr-2" />
              篩選條件
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  選擇頻道
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={selectedChannel || ''}
                  onChange={(e) => setSelectedChannel(e.target.value || null)}
                >
                  <option value="">所有頻道</option>
                  {userChannels.map((channel) => (
                    <option key={channel.id} value={channel.channelId}>
                      {channel.channelId} ({channel.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  開始日期
                </label>
                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  結束日期
                </label>
                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  群組 ID
                </label>
                <Input
                  type="text"
                  placeholder="輸入群組 ID"
                  value={filters.groupId}
                  onChange={(e) => setFilters(prev => ({ ...prev, groupId: e.target.value }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex space-x-4">
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              重新整理
            </Button>
            
            <Button
              onClick={() => setShowRawMessages(!showRawMessages)}
              variant="outline"
              size="sm"
            >
              <Eye className="h-4 w-4 mr-2" />
              {showRawMessages ? '隱藏' : '顯示'}原始訊息
            </Button>
            
            <Button
              onClick={handleGenerateSummary}
              size="sm"
              className="bg-green-600 hover:bg-green-700"
            >
              <Brain className="h-4 w-4 mr-2" />
              生成摘要
            </Button>
          </div>
          
          <div className="text-sm text-gray-500">
            共 {filteredMessages.length} 條訊息
          </div>
        </div>

        {/* Messages Display */}
        {showRawMessages && (
          <div className="space-y-6">
            {getChannels().map((channelId) => (
              <Card key={channelId}>
                <CardHeader>
                  <CardTitle 
                    className="cursor-pointer hover:text-blue-600"
                    onClick={() => {
                      const actualChannelId = getChannelIdByName(channelId);
                      setSelectedChannel(selectedChannel === actualChannelId ? null : actualChannelId);
                    }}
                  >
                    {channelId}
                    <span className="ml-2 text-sm text-gray-500">
                      ({getChannelMessages(channelId).length} 條訊息)
                    </span>
                  </CardTitle>
                </CardHeader>
                {selectedChannel === getChannelIdByName(channelId) && (
                  <CardContent>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {getChannelMessages(channelId).map((message) => (
                        <div key={message.id} className="flex flex-col">
                          <div className={`flex ${message.user_id === getCurrentUserEmail() ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                              message.user_id === getCurrentUserEmail() 
                                ? 'bg-white border border-gray-300' 
                                : `${getUserColor(message.user_id)} text-white`
                            }`}>
                              <div className="text-sm font-medium mb-1">
                                {message.user_id === getCurrentUserEmail() ? '我' : message.user_id}
                              </div>
                              <div className="text-sm">{message.message}</div>
                            </div>
                          </div>
                          <div className={`text-xs text-gray-500 mt-1 ${
                            message.user_id === getCurrentUserEmail() ? 'text-right' : 'text-left'
                          }`}>
                            {new Date(message.timestamp).toLocaleDateString('zh-TW', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              weekday: 'short'
                            }).replace(/\//g, '/')} {new Date(message.timestamp).toLocaleTimeString('zh-TW', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: false
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* Summary Modal */}
        <SummaryModal
          isOpen={showSummaryModal}
          onClose={() => setShowSummaryModal(false)}
          filters={filters}
        />

        {/* Channel Manager Modal */}
        {showChannelManager && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">頻道管理</h2>
                <Button
                  onClick={() => setShowChannelManager(false)}
                  variant="outline"
                  size="sm"
                >
                  關閉
                </Button>
              </div>
              <ChannelManager 
                onChannelSelect={(channelId) => {
                  setSelectedChannel(channelId);
                  setShowChannelManager(false);
                }}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
