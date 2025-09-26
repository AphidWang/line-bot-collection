'use client';

import { useState, useEffect } from 'react';
import { signOut } from 'firebase/auth';
import { API_BASE_URL, authAPI, API_ENDPOINTS } from '@/app/lib/api';
import { auth } from '@/app/firebase';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { MessageSquare, LogOut, Filter, Eye, Brain, Calendar, RefreshCw, Settings } from 'lucide-react';
import MessageTable from './MessageTable';
import SummaryModal from './SummaryModal';
import ChannelManager from './ChannelManager';
import GroupList from './GroupList';
import ChatInterface from './ChatInterface';

interface Message {
  id: number;
  groupId?: string;
  groupName?: string;
  userId?: string;
  userName?: string;
  timestamp: string;
  message: string;
  channelId?: string;
}

interface Group {
  id: string;
  lineId: string;
  name: string;
  pictureUrl?: string;
  channelId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  _count: {
    messages: number;
  };
  messages: Array<{
    id: string;
    content: string;
    timestamp: string;
    type: string;
    user: {
      name: string;
    };
  }>;
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
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [userChannels, setUserChannels] = useState<any[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    groupId: ''
  });
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    // 檢查 JWT token，若有效則視為已登入
    const token = localStorage.getItem('access_token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp * 1000 > Date.now() && payload.userId) {
          setJwtUser({
            email: '',
            user_type: 'jwt'
          });
          return;
        } else {
          localStorage.removeItem('access_token');
        }
      } catch (error) {
        console.error('JWT token 解析失敗:', error);
        localStorage.removeItem('access_token');
      }
    }

    // 若沒有後端 JWT，但 Firebase 使用者存在，自動交換 JWT
    const exchangeIfFirebase = async () => {
      try {
        if (auth && auth.currentUser) {
          const idToken = await auth.currentUser.getIdToken();
          const data = await authAPI.firebaseLogin(idToken);
          localStorage.setItem('access_token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          setJwtUser({ email: data.user.email, user_type: 'jwt' });
        }
      } catch (e) {
        console.error('自動交換後端 JWT 失敗:', e);
      }
    };

    exchangeIfFirebase();
  }, []);

  // 僅當取得後端 JWT 後才獲取資料
  useEffect(() => {
    const jwt = localStorage.getItem('access_token');
    if (jwt) {
      fetchMessages();
      fetchUserChannels();
    }
  }, [jwtUser]);

  // 當選擇的頻道改變時重新載入訊息
  useEffect(() => {
    if (userChannels.length > 0) {
      fetchMessages();
    }
  }, [selectedChannel]);

  useEffect(() => {
    applyFilters();
  }, [messages, filters]);

  // 當選擇的頻道改變時，寫入 localStorage
  useEffect(() => {
    try {
      if (selectedChannel) {
        localStorage.setItem('selected_channel', selectedChannel);
      } else {
        localStorage.removeItem('selected_channel');
      }
    } catch (e) {
      // 忽略 storage 錯誤
    }
  }, [selectedChannel]);

  const fetchMessages = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        console.error('No valid token found');
        return; // 還沒換到後端 JWT，不打 API 避免 401
      }

      let url = `${API_BASE_URL}/api/messages`;
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
          groupId: msg.groupId || msg.group?.id,
          groupName: msg.group?.name || msg.groupName,
          userId: msg.userId || msg.user?.id,
          userName: msg.user?.name || msg.userName,
          timestamp: msg.timestamp,
          message: msg.content,
          channelId: msg.channelId
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
      const token = localStorage.getItem('access_token');
      if (!token) return; // 等待拿到後端 JWT

      // 自有頻道
      const respOwned = await fetch(`${API_BASE_URL}/api/user-channels`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const owned = respOwned.ok ? (await respOwned.json()).channels || [] : [];

      // 被分享的頻道
      const respShared = await fetch(API_ENDPOINTS.SHARES.GET_SHARED_CHANNELS, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const sharedRaw = respShared.ok ? await respShared.json() : { channels: [] };
      const shared = (sharedRaw.channels || []).map((c: any) => ({
        // 從後端 shared-channels 轉成下拉與後續流程需要的結構
        id: c.id, // channel.id
        channelId: c.lineId, // 下拉用的 value，後端 API 以 lineId 查找
        alias: c.name,
        status: c.status || 'active',
        webhookUrl: '',
        createdAt: c.createdAt || new Date().toISOString(),
        isShared: true,
        isOwner: false,
        sharedBy: c.sharedBy,
      }));

      const allChannels = [...(owned || []), ...shared];
      setUserChannels(allChannels);

      // 初始化選擇：優先使用 localStorage，其次預設第一個
      try {
        const saved = localStorage.getItem('selected_channel');
        const hasSaved = saved && allChannels.some((c: any) => c.channelId === saved);
        const first = allChannels.length > 0 ? allChannels[0].channelId : null;

        // 僅在目前未選擇或原本選擇不存在於新清單時才設置
        if (!selectedChannel || (selectedChannel && !allChannels.some((c: any) => c.channelId === selectedChannel))) {
          const next = (hasSaved ? saved : first) as string | null;
          if (next) {
            setSelectedChannel(next);
          } else {
            setSelectedChannel(null);
          }
        }
      } catch (e) {
        // 忽略 storage 錯誤
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
        (msg.groupId || '').includes(filters.groupId)
      );
    }

    setFilteredMessages(filtered);
  };

  const handleLogout = async () => {
    try {
      // 先嘗試登出 Firebase（若存在）
      if (auth && auth.currentUser) {
        try { await signOut(auth); } catch (e) { console.warn('Firebase signOut error (ignored):', e); }
      }

      // 一律清除本地 JWT 與使用者資料
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      
      // 強制回到登入頁
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleGenerateSummary = () => {
    setShowSummaryModal(true);
  };

  const handleRefresh = () => {
    // 刷新上方統計/舊表格資料
    fetchMessages();
    // 刷新群組清單與目前選中群組的聊天內容
    setRefreshTick((t) => t + 1);
  };

  const handleGroupSelect = (group: Group) => {
    // 點擊同一群組時觸發內容刷新
    if (selectedGroup?.id === group.id) {
      setRefreshTick((t) => t + 1);
    }
    setSelectedGroup(group);
  };

  const handleMarkAsRead = async (messageId: string) => {
    if (!selectedGroup) return;

    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      await fetch(`${API_BASE_URL}/api/groups/${selectedGroup.id}/read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ messageId })
      });
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleClearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      groupId: ''
    });
    setShowFilters(false);
    // Trigger filter apply
    setTimeout(() => {
      applyFilters();
    }, 100);
  };

  // 取得所有群組
  const getChannels = () => {
    const channels = new Set((messages || []).map(m => m.groupName || m.groupId || m.channelId));
    return (Array.from(channels).filter(Boolean) as string[]);
  };

  // 依據目前有權限觀看的範圍過濾訊息
  const getVisibleMessages = () => {
    if (selectedChannel) return messages;
    const allowed = new Set((userChannels || []).map((c: any) => c.channelId));
    return messages.filter(m => !m.channelId || allowed.has(m.channelId));
  };

  // 取得選中群組的訊息
  const getChannelMessages = (channelKey: string) => {
    return messages.filter(m => (m.groupName || m.groupId || m.channelId) === channelKey);
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
            <div className="flex items-center space-x-4">
              <MessageSquare className="h-8 w-8 text-blue-600" />
              <h1 className="text-xl font-semibold text-gray-900">LINE Assistant</h1>
              
              {/* Account Selector */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">帳號:</span>
                <select
                  className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  value={selectedChannel || ''}
                  onChange={(e) => setSelectedChannel(e.target.value || null)}
                >
                  <option value="">選擇帳號</option>
                  {userChannels.map((channel) => (
                    <option key={channel.id} value={channel.channelId}>
                      {channel.alias ? `${channel.alias} - ${channel.channelId}` : channel.channelId}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => setShowChannelManager(true)}
                variant="outline"
                size="sm"
                className="flex items-center space-x-2"
              >
                <Settings className="h-4 w-4" />
                <span>帳號設定</span>
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
              <div className="text-2xl font-bold">{getVisibleMessages().length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">群組數量</CardTitle>
              <MessageSquare className="h-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{new Set(getVisibleMessages().map(m => m.groupId).filter(Boolean)).size}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">活躍用戶</CardTitle>
              <MessageSquare className="h-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{new Set(getVisibleMessages().map(m => m.userId).filter(Boolean)).size}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters - Initially Hidden */}
        {showFilters && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <Filter className="h-5 w-5 mr-2" />
                  篩選條件
                </div>
                <div className="flex space-x-2">
                  <Button
                    onClick={() => setShowFilters(false)}
                    variant="outline"
                    size="sm"
                  >
                    篩選
                  </Button>
                  <Button
                    onClick={handleClearFilters}
                    variant="outline"
                    size="sm"
                  >
                    清除所有篩選
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
        )}

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
              onClick={() => setShowFilters(!showFilters)}
              variant="outline"
              size="sm"
            >
              <Filter className="h-4 w-4 mr-2" />
              {showFilters ? '隱藏' : '顯示'}篩選
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
            {selectedGroup ? `群組: ${selectedGroup.name}` : '請選擇帳號查看群組'}
          </div>
        </div>

        {/* Main Content Area */}
        {selectedChannel ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-300px)]">
            {/* Groups List */}
            <div className="lg:col-span-1">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>群組列表</CardTitle>
                </CardHeader>
                <CardContent className="h-[calc(100%-80px)] overflow-y-auto pt-2 pb-2">
                  <GroupList
                    selectedChannelId={selectedChannel}
                    onGroupSelect={handleGroupSelect}
                    selectedGroup={selectedGroup}
                    refreshTick={refreshTick}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Chat Interface */}
            <div className="lg:col-span-2">
              <Card className="h-full">
                <CardContent className="p-0 h-full">
                  {selectedGroup ? (
                    <ChatInterface
                      group={selectedGroup}
                      onMarkAsRead={handleMarkAsRead}
                      refreshTick={refreshTick}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <div className="text-center">
                        <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>請選擇一個群組開始聊天</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">歡迎使用 LINE Assistant</h3>
            <p className="text-gray-600 mb-4">請先選擇一個帳號來查看群組和訊息</p>
            <Button
              onClick={() => setShowChannelManager(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Settings className="h-4 w-4 mr-2" />
              管理帳號
            </Button>
          </div>
        )}

        {/* Raw Messages Display (Legacy) */}
        {showRawMessages && (
          <div className="mt-8 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>原始訊息檢視</CardTitle>
              </CardHeader>
              <CardContent>
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
                                <div className={`flex ${message.userName === getCurrentUserEmail() ? 'justify-end' : 'justify-start'}`}>
                                  <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                    message.userName === getCurrentUserEmail() 
                                      ? 'bg-white border border-gray-300' 
                                      : `${getUserColor(message.userId || message.userName || '')} text-white`
                                  }`}>
                                    <div className="text-sm font-medium mb-1">
                                      {message.userName === getCurrentUserEmail() ? '我' : (message.userName || message.userId || '未知')}
                                    </div>
                                    <div className="text-sm">{message.message}</div>
                                  </div>
                                </div>
                                <div className={`text-xs text-gray-500 mt-1 ${
                                  message.userName === getCurrentUserEmail() ? 'text-right' : 'text-left'
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
              </CardContent>
            </Card>
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
                <h2 className="text-xl font-semibold">帳號管理</h2>
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
                onChannelAdded={(channelId) => {
                  // 新增頻道後自動選擇並關閉 Modal
                  setSelectedChannel(channelId);
                  setShowChannelManager(false);
                  // 重新獲取頻道列表
                  fetchUserChannels();
                }}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
