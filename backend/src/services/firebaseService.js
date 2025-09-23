const admin = require('firebase-admin');

let firebaseApp = null;

const initializeFirebase = () => {
  // Check if Firebase is already initialized
  if (firebaseApp) {
    return firebaseApp;
  }

  // Check if Firebase credentials are available
  if (!process.env.FIREBASE_PROJECT_ID || 
      !process.env.FIREBASE_PRIVATE_KEY || 
      !process.env.FIREBASE_CLIENT_EMAIL) {
    console.log('⚠️ Firebase credentials not found. Firebase authentication will be disabled.');
    return null;
  }

  try {
    // Parse private key (handle newlines)
    const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: privateKey,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
    });

    console.log('✅ Firebase initialized successfully');
    return firebaseApp;
  } catch (error) {
    console.error('❌ Failed to initialize Firebase:', error);
    return null;
  }
};

/**
 * Ensure firebase is initialized and verify an ID token
 */
const verifyIdToken = async (idToken) => {
  const app = initializeFirebase();
  if (!app) {
    throw new Error('Firebase not initialized');
  }
  return admin.auth().verifyIdToken(idToken);
};

const isFirebaseEnabled = () => {
  return firebaseApp !== null;
};

const getFirebaseApp = () => {
  if (!firebaseApp) {
    throw new Error('Firebase is not initialized');
  }
  return firebaseApp;
};

module.exports = {
  initializeFirebase,
  isFirebaseEnabled,
  getFirebaseApp,
  verifyIdToken
};
