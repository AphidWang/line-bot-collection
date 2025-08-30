import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// 檢查是否有 Firebase 設定
const hasFirebaseConfig = process.env.NEXT_PUBLIC_FIREBASE_API_KEY && 
                         process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== 'your-firebase-api-key';

let app: any = null;
let auth: any = null;

if (hasFirebaseConfig) {
  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    console.log('Firebase 初始化成功');
  } catch (error) {
    console.warn('Firebase 初始化失敗:', error);
    app = null;
    auth = null;
  }
} else {
  console.log('Firebase 未設定，使用帳密登入模式');
}

export { auth, app };
export const isFirebaseEnabled = () => hasFirebaseConfig && !!auth;
