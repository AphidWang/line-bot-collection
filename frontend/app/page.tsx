'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, isFirebaseEnabled } from './firebase';
import LoginForm from './components/auth/LoginForm';
import Dashboard from './components/dashboard/Dashboard';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [jwtUser, setJwtUser] = useState<{email: string, user_type: string} | null>(null);
  const [loading, setLoading] = useState(true);
  const [firebaseEnabled, setFirebaseEnabled] = useState(false);

  useEffect(() => {
    // 檢查 JWT token
    const checkJwtToken = () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          // 簡單的 JWT 解碼（只取 payload 部分）
          const payload = JSON.parse(atob(token.split('.')[1]));
          if (payload.exp * 1000 > Date.now()) {
            setJwtUser({
              email: payload.sub,
              user_type: 'jwt'
            });
            return true;
          } else {
            // Token 過期，清除
            localStorage.removeItem('access_token');
          }
        } catch (error) {
          console.error('JWT token 解析失敗:', error);
          localStorage.removeItem('access_token');
        }
      }
      return false;
    };

    // 檢查 Firebase 是否可用
    const checkFirebase = async () => {
      const enabled = isFirebaseEnabled();
      setFirebaseEnabled(!!enabled);
      
      if (enabled && auth) {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          setUser(user);
          setLoading(false);
        });
        return unsubscribe;
      } else {
        // Firebase 不可用，檢查 JWT token
        const hasValidJwt = checkJwtToken();
        setLoading(false);
        return () => {};
      }
    };

    checkFirebase();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">載入中...</p>
        </div>
      </div>
    );
  }

  // 如果有有效的 JWT token，顯示 dashboard
  if (jwtUser) {
    return <Dashboard />;
  }

  // 如果 Firebase 可用，檢查用戶狀態
  if (firebaseEnabled && user) {
    return <Dashboard />;
  }

  // 顯示登入表單
  return <LoginForm />;
}
