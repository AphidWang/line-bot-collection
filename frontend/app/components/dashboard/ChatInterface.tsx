'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { ArrowDown, Users, Clock, Image, Video, Mic, File, MapPin, Sticker } from 'lucide-react';
import { API_BASE_URL } from '@/app/lib/api';

interface Message {
  id: string;
  content: string;
  timestamp: string;
  type: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
}

interface Group {
  id: string;
  name: string;
  pictureUrl?: string;
}

interface ChatInterfaceProps {
  group: Group;
  onMarkAsRead: (messageId: string) => void;
}

export default function ChatInterface({ group, onMarkAsRead }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const lastReadMessageId = useRef<string | null>(null);

  const fetchMessages = async (pageNum: number = 1, append: boolean = false) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      const response = await fetch(
        `${API_BASE_URL}/api/groups/${group.id}/messages?page=${pageNum}&limit=50`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        const newMessages = data.messages || [];
        
        if (append) {
          setMessages(prev => [...newMessages, ...prev]);
        } else {
          setMessages(newMessages);
        }
        
        setHasMore(data.pagination.pages > pageNum);
        
        // Auto scroll to bottom for new messages
        if (!append && newMessages.length > 0) {
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMoreMessages = () => {
    if (hasMore && !isLoading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchMessages(nextPage, true);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    // Mark as read when scrolling to bottom
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && lastMessage.id !== lastReadMessageId.current) {
        onMarkAsRead(lastMessage.id);
        lastReadMessageId.current = lastMessage.id;
      }
    }
  };

  const handleScroll = () => {
    const container = chatContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    
    setShowScrollToBottom(!isNearBottom);

    // Load more messages when scrolling to top
    if (scrollTop === 0 && hasMore && !isLoading) {
      loadMoreMessages();
    }
  };

  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <Image className="h-4 w-4" />;
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'audio':
        return <Mic className="h-4 w-4" />;
      case 'file':
        return <File className="h-4 w-4" />;
      case 'location':
        return <MapPin className="h-4 w-4" />;
      case 'sticker':
        return <Sticker className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-TW', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return '今天';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return '昨天';
    } else {
      return date.toLocaleDateString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        weekday: 'short'
      });
    }
  };

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

  useEffect(() => {
    setMessages([]);
    setPage(1);
    setHasMore(true);
    fetchMessages(1, false);
  }, [group.id]);

  // Group messages by date
  const groupedMessages = messages.reduce((acc, message, index) => {
    const date = new Date(message.timestamp).toDateString();
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push({ ...message, index });
    return acc;
  }, {} as Record<string, Array<Message & { index: number }>>);

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white">
        <div className="flex items-center space-x-3">
          {group.pictureUrl ? (
            <img 
              src={group.pictureUrl} 
              alt={group.name} 
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
              <Users className="h-5 w-5 text-white" />
            </div>
          )}
          <div>
            <h2 className="font-semibold text-gray-900">{group.name}</h2>
            <p className="text-sm text-gray-500">{messages.length} 條訊息</p>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
        onScroll={handleScroll}
      >
        {isLoading && page === 1 && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}

        {Object.entries(groupedMessages).map(([date, dayMessages]) => (
          <div key={date}>
            {/* Date Separator */}
            <div className="flex items-center justify-center my-4">
              <div className="bg-gray-200 text-gray-600 px-3 py-1 rounded-full text-sm">
                {formatDate(dayMessages[0].timestamp)}
              </div>
            </div>

            {/* Messages for this date */}
            {dayMessages.map((message, msgIndex) => {
              const isConsecutive = msgIndex > 0 && 
                dayMessages[msgIndex - 1].user.id === message.user.id &&
                new Date(message.timestamp).getTime() - new Date(dayMessages[msgIndex - 1].timestamp).getTime() < 300000; // 5 minutes

              return (
                <div key={message.id} className={`flex ${!isConsecutive ? 'mt-4' : 'mt-1'}`}>
                  <div className="flex-1">
                    {!isConsecutive && (
                      <div className="flex items-center space-x-2 mb-1">
                        {message.user.avatar ? (
                          <img 
                            src={message.user.avatar} 
                            alt={message.user.name} 
                            className="w-6 h-6 rounded-full object-cover"
                          />
                        ) : (
                          <div className={`w-6 h-6 rounded-full ${getUserColor(message.user.id)} flex items-center justify-center`}>
                            <span className="text-white text-xs font-medium">
                              {message.user.name.charAt(0)}
                            </span>
                          </div>
                        )}
                        <span className="text-sm font-medium text-gray-700">
                          {message.user.name}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatTime(message.timestamp)}
                        </span>
                      </div>
                    )}

                    <div className={`ml-8 ${isConsecutive ? 'mt-0' : ''}`}>
                      <div className="flex items-center space-x-2">
                        {getMessageIcon(message.type)}
                        <span className="text-gray-800 break-words">
                          {message.content}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Users className="h-12 w-12 mb-4 text-gray-300" />
            <p>還沒有訊息</p>
            <p className="text-sm">等待群組中的第一條訊息...</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to Bottom Button */}
      {showScrollToBottom && (
        <div className="absolute bottom-20 right-6">
          <Button
            onClick={scrollToBottom}
            size="sm"
            className="rounded-full shadow-lg"
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
