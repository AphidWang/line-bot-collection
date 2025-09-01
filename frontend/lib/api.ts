// API 服務配置
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL 
  ? (process.env.NEXT_PUBLIC_API_URL.startsWith('http') 
      ? process.env.NEXT_PUBLIC_API_URL 
      : `https://${process.env.NEXT_PUBLIC_API_URL}`)
  : 'http://localhost:3001';

// API 端點
export const API_ENDPOINTS = {
  // 認證相關
  AUTH: {
    LOGIN: `${API_BASE_URL}/api/auth/login`,
    REGISTER: `${API_BASE_URL}/api/auth/register`,
    PROFILE: `${API_BASE_URL}/api/auth/profile`,
    FIREBASE_LOGIN: `${API_BASE_URL}/api/auth/firebase`,
  },
  
  // 訊息相關
  MESSAGES: {
    LIST: `${API_BASE_URL}/api/messages`,
    SEARCH: `${API_BASE_URL}/api/messages/search`,
    BY_CHANNEL: `${API_BASE_URL}/api/messages/channel`,
    BY_USER: `${API_BASE_URL}/api/messages/user`,
  },
  
  // 頻道相關
  CHANNELS: {
    LIST: `${API_BASE_URL}/api/channels`,
    DETAIL: `${API_BASE_URL}/api/channels`,
    TOGGLE_TRACKING: `${API_BASE_URL}/api/channels/toggle-tracking`,
    STATS: `${API_BASE_URL}/api/channels/stats`,
  },
  
  // 用戶相關
  USERS: {
    SEARCH: `${API_BASE_URL}/api/users/search`,
    DETAIL: `${API_BASE_URL}/api/users`,
    MESSAGES: `${API_BASE_URL}/api/users/messages`,
    STATS: `${API_BASE_URL}/api/users/stats`,
  },
  
  // 總結相關
  SUMMARIES: {
    LIST: `${API_BASE_URL}/api/summaries`,
    CREATE: `${API_BASE_URL}/api/summaries`,
    DETAIL: `${API_BASE_URL}/api/summaries`,
    DELETE: `${API_BASE_URL}/api/summaries`,
    STATS: `${API_BASE_URL}/api/summaries/stats`,
  },
  
  // Line Webhook
  LINE: {
    WEBHOOK: `${API_BASE_URL}/api/line/webhook`,
    STATUS: `${API_BASE_URL}/api/line/status`,
  },
  
  // 健康檢查
  HEALTH: `${API_BASE_URL}/health`,
};

// API 請求工具函數
export const apiRequest = async (
  url: string,
  options: RequestInit = {}
): Promise<Response> => {
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  // 添加認證 token
  const token = localStorage.getItem('access_token');
  if (token) {
    defaultOptions.headers = {
      ...defaultOptions.headers,
      'Authorization': `Bearer ${token}`,
    };
  }

  const response = await fetch(url, defaultOptions);
  
  // 處理認證錯誤
  if (response.status === 401) {
    localStorage.removeItem('access_token');
    window.location.reload();
  }
  
  return response;
};

// 認證相關 API
export const authAPI = {
  // 帳密登入
  login: async (email: string, password: string) => {
    const response = await apiRequest(API_ENDPOINTS.AUTH.LOGIN, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    if (!response.ok) {
      throw new Error('登入失敗');
    }
    
    return response.json();
  },
  
  // 註冊
  register: async (email: string, password: string, name?: string) => {
    const response = await apiRequest(API_ENDPOINTS.AUTH.REGISTER, {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
    
    if (!response.ok) {
      throw new Error('註冊失敗');
    }
    
    return response.json();
  },
  
  // 獲取用戶資料
  getProfile: async () => {
    const response = await apiRequest(API_ENDPOINTS.AUTH.PROFILE);
    
    if (!response.ok) {
      throw new Error('獲取用戶資料失敗');
    }
    
    return response.json();
  },
  
  // Firebase 登入
  firebaseLogin: async (firebaseToken: string) => {
    const response = await apiRequest(API_ENDPOINTS.AUTH.FIREBASE_LOGIN, {
      method: 'POST',
      body: JSON.stringify({ firebaseToken }),
    });
    
    if (!response.ok) {
      throw new Error('Firebase 登入失敗');
    }
    
    return response.json();
  },
};

// 訊息相關 API
export const messagesAPI = {
  // 獲取訊息列表
  getMessages: async (params?: {
    page?: number;
    limit?: number;
    channelId?: string;
    userId?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }
    
    const url = `${API_ENDPOINTS.MESSAGES.LIST}?${searchParams.toString()}`;
    const response = await apiRequest(url);
    
    if (!response.ok) {
      throw new Error('獲取訊息失敗');
    }
    
    return response.json();
  },
  
  // 搜尋訊息
  searchMessages: async (keyword: string, params?: {
    page?: number;
    limit?: number;
    channelId?: string;
    userId?: string;
  }) => {
    const searchParams = new URLSearchParams({ keyword });
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }
    
    const url = `${API_ENDPOINTS.MESSAGES.SEARCH}?${searchParams.toString()}`;
    const response = await apiRequest(url);
    
    if (!response.ok) {
      throw new Error('搜尋訊息失敗');
    }
    
    return response.json();
  },
};

// 頻道相關 API
export const channelsAPI = {
  // 獲取頻道列表
  getChannels: async () => {
    const response = await apiRequest(API_ENDPOINTS.CHANNELS.LIST);
    
    if (!response.ok) {
      throw new Error('獲取頻道列表失敗');
    }
    
    return response.json();
  },
  
  // 切換追蹤狀態
  toggleTracking: async (channelId: string) => {
    const response = await apiRequest(API_ENDPOINTS.CHANNELS.TOGGLE_TRACKING, {
      method: 'POST',
      body: JSON.stringify({ channelId }),
    });
    
    if (!response.ok) {
      throw new Error('切換追蹤狀態失敗');
    }
    
    return response.json();
  },
};

// 總結相關 API
export const summariesAPI = {
  // 創建總結
  createSummary: async (params: {
    channelIds?: string[];
    date?: string;
    type?: 'daily' | 'weekly' | 'monthly';
  }) => {
    const response = await apiRequest(API_ENDPOINTS.SUMMARIES.CREATE, {
      method: 'POST',
      body: JSON.stringify(params),
    });
    
    if (!response.ok) {
      throw new Error('創建總結失敗');
    }
    
    return response.json();
  },
  
  // 獲取總結列表
  getSummaries: async (params?: {
    page?: number;
    limit?: number;
    channelId?: string;
    date?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }
    
    const url = `${API_ENDPOINTS.SUMMARIES.LIST}?${searchParams.toString()}`;
    const response = await apiRequest(url);
    
    if (!response.ok) {
      throw new Error('獲取總結列表失敗');
    }
    
    return response.json();
  },
};

// 健康檢查
export const healthCheck = async () => {
  const response = await fetch(API_ENDPOINTS.HEALTH);
  return response.ok;
};
