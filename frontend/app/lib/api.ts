// API 服務配置
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL 
  ? (process.env.NEXT_PUBLIC_API_URL.startsWith('http') 
      ? process.env.NEXT_PUBLIC_API_URL 
      : `https://${process.env.NEXT_PUBLIC_API_URL}`)
  : 'http://localhost:3001';

// 調試資訊
console.log('🔧 API Configuration Debug:');
console.log('NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);
console.log('API_BASE_URL:', API_BASE_URL);
console.log('LOGIN URL:', `${API_BASE_URL}/api/auth/login`);

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
  
  // 使用者頻道管理
  USER_CHANNELS: {
    LIST: `${API_BASE_URL}/api/user-channels`,
    DETAIL: `${API_BASE_URL}/api/user-channels`,
    STATUS: (channelId: string) => `${API_BASE_URL}/api/user-channels/${channelId}/status`,
    ALIAS: (channelId: string) => `${API_BASE_URL}/api/user-channels/${channelId}/alias`,
  },
};

// 檢查 token 是否有效
const isTokenValid = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Math.floor(Date.now() / 1000);
    return payload.exp > now;
  } catch {
    return false;
  }
};

// 自動登出函數
const logout = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('user');
  window.location.href = '/';
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
    // 檢查 token 是否有效
    if (!isTokenValid(token)) {
      console.log('Token expired, logging out...');
      logout();
      throw new Error('Token expired');
    }
    
    defaultOptions.headers = {
      ...defaultOptions.headers,
      'Authorization': `Bearer ${token}`,
    };
  }

  const response = await fetch(url, defaultOptions);
  
  // 處理認證錯誤
  if (response.status === 401) {
    console.log('Unauthorized, logging out...');
    logout();
    throw new Error('Unauthorized');
  }
  
  return response;
};

// 認證相關 API
export const authAPI = {
  // 帳密登入
  login: async (email: string, password: string) => {
    console.log('🔧 Login Debug:');
    console.log('API_ENDPOINTS.AUTH.LOGIN:', API_ENDPOINTS.AUTH.LOGIN);
    
    // 登入時不使用 apiRequest，避免添加 Authorization header
    const response = await fetch(API_ENDPOINTS.AUTH.LOGIN, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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

// 使用者頻道相關 API
export const userChannelsAPI = {
  list: async () => {
    const response = await apiRequest(API_ENDPOINTS.USER_CHANNELS.LIST);
    if (!response.ok) throw new Error('獲取頻道列表失敗');
    return response.json();
  },
  create: async (payload: { channelId: string; accessToken: string; channelSecret: string; alias?: string }) => {
    const response = await apiRequest(API_ENDPOINTS.USER_CHANNELS.LIST, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error('添加頻道失敗');
    return response.json();
  },
  remove: async (channelId: string) => {
    const response = await apiRequest(`${API_ENDPOINTS.USER_CHANNELS.DETAIL}/${channelId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('刪除頻道失敗');
    return response.json();
  },
  updateStatus: async (channelId: string, status: 'active' | 'inactive' | 'error') => {
    const response = await apiRequest(API_ENDPOINTS.USER_CHANNELS.STATUS(channelId), {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    if (!response.ok) throw new Error('更新頻道狀態失敗');
    return response.json();
  },
  updateAlias: async (channelId: string, alias?: string) => {
    const response = await apiRequest(API_ENDPOINTS.USER_CHANNELS.ALIAS(channelId), {
      method: 'PATCH',
      body: JSON.stringify({ alias }),
    });
    if (!response.ok) throw new Error('更新頻道別名失敗');
    return response.json();
  },
};
