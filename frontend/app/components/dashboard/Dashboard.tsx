'use client';

import { useState, useEffect } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '@/app/firebase';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { MessageSquare, LogOut, Filter, Eye, Brain, Calendar } from 'lucide-react';
import MessageTable from './MessageTable';
import SummaryModal from './SummaryModal';

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
  const [jwtUser, setJwtUser] = useState<JwtUser | null>(null);
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

  // 當 jwtUser 或 auth.currentUser 改變時才獲取訊息
  useEffect(() => {
    if (jwtUser || (auth && auth.currentUser)) {
      fetchMessages();
    }
  }, [jwtUser, auth?.currentUser]);

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

      const response = await fetch('http://localhost:8000/messages/raw', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setIsLoading(false);
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

        {/* Actions */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex space-x-4">
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

        {/* Messages Table */}
        {showRawMessages && (
          <Card>
            <CardHeader>
              <CardTitle>原始訊息</CardTitle>
              <CardDescription>
                顯示所有篩選後的訊息內容
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MessageTable messages={filteredMessages} />
            </CardContent>
          </Card>
        )}

        {/* Summary Modal */}
        <SummaryModal
          isOpen={showSummaryModal}
          onClose={() => setShowSummaryModal(false)}
          filters={filters}
        />
      </main>
    </div>
  );
}
