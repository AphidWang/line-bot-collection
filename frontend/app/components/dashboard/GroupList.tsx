'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/app/components/ui/card';
import { API_BASE_URL } from '@/app/lib/api';
import { Button } from '@/app/components/ui/button';
import { MessageSquare, Users, Clock, ChevronRight } from 'lucide-react';

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

interface UnreadCount {
  groupId: string;
  groupName: string;
  channelName: string;
  unreadCount: number;
}

interface GroupListProps {
  selectedChannelId?: string;
  onGroupSelect: (group: Group) => void;
  selectedGroup?: Group | null;
}

export default function GroupList({ selectedChannelId, onGroupSelect, selectedGroup }: GroupListProps) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<UnreadCount[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchGroups = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      let url = `${API_BASE_URL}/api/groups`;
      if (selectedChannelId) {
        url += `?channelId=${selectedChannelId}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setGroups(data.groups || []);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUnreadCounts = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/api/groups/unread/count`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUnreadCounts(data.unreadCounts || []);
      }
    } catch (error) {
      console.error('Error fetching unread counts:', error);
    }
  };

  useEffect(() => {
    if (selectedChannelId) {
      fetchGroups();
      fetchUnreadCounts();
    }
  }, [selectedChannelId]);

  const getUnreadCount = (groupId: string) => {
    const unread = unreadCounts.find(u => u.groupId === groupId);
    return unread ? unread.unreadCount : 0;
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('zh-TW', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
    } else if (diffDays === 1) {
      return '昨天';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('zh-TW', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('zh-TW', { 
        month: '2-digit', 
        day: '2-digit' 
      });
    }
  };

  const truncateMessage = (content: string, maxLength: number = 50) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-3/4"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p>沒有找到群組</p>
        <p className="text-sm">請確認已選擇頻道並有訊息</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {groups.map((group) => {
        const unreadCount = getUnreadCount(group.id);
        const lastMessage = group.messages[0];
        const isSelected = selectedGroup?.id === group.id;

        return (
          <Card 
            key={group.id} 
            className={`cursor-pointer transition-all hover:shadow-md ${
              isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
            }`}
            onClick={() => onGroupSelect(group)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  {/* Group Avatar */}
                  <div className="flex-shrink-0">
                    {group.pictureUrl ? (
                      <img 
                        src={group.pictureUrl} 
                        alt={group.name || 'Group'} 
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                        <Users className="h-6 w-6 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Group Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium text-gray-900 truncate">
                        {group.name || `群組 ${group.lineId.slice(-8)}`}
                      </h3>
                      <div className="flex items-center space-x-2">
                        {lastMessage && (
                          <span className="text-xs text-gray-500 flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {formatTime(lastMessage.timestamp)}
                          </span>
                        )}
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>

                    {lastMessage && (
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600 truncate">
                          <span className="font-medium">{lastMessage.user.name}:</span>{' '}
                          {truncateMessage(lastMessage.content)}
                        </p>
                        {unreadCount > 0 && (
                          <div className="flex-shrink-0 ml-2">
                            <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                              {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {!lastMessage && (
                      <p className="text-sm text-gray-500">
                        共 {group._count.messages} 條訊息
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
