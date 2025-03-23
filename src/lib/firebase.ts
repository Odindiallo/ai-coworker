import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

// Helper function to get environment variables with fallbacks
const getEnvVariable = (viteKey: string, reactKey: string): string => {
  // Check for Vite-style env vars first
  if (import.meta.env[viteKey]) {
    return import.meta.env[viteKey];
  }
  // Fall back to React-style env vars
  if (process.env && process.env[reactKey]) {
    return process.env[reactKey];
  }
  // Log a warning if neither is found
  console.warn(`Environment variable ${viteKey} or ${reactKey} not found`);
  return '';
};

const firebaseConfig = {
  apiKey: getEnvVariable('VITE_FIREBASE_API_KEY', 'REACT_APP_FIREBASE_API_KEY'),
  authDomain: getEnvVariable('VITE_FIREBASE_AUTH_DOMAIN', 'REACT_APP_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnvVariable('VITE_FIREBASE_PROJECT_ID', 'REACT_APP_FIREBASE_PROJECT_ID'),
  storageBucket: getEnvVariable('VITE_FIREBASE_STORAGE_BUCKET', 'REACT_APP_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnvVariable('VITE_FIREBASE_MESSAGING_SENDER_ID', 'REACT_APP_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnvVariable('VITE_FIREBASE_APP_ID', 'REACT_APP_FIREBASE_APP_ID'),
  measurementId: getEnvVariable('VITE_FIREBASE_MEASUREMENT_ID', 'REACT_APP_FIREBASE_MEASUREMENT_ID'),
};

// Check if Firebase config is properly loaded
const isFirebaseConfigValid = (): boolean => {
  return Boolean(
    firebaseConfig.apiKey && 
    firebaseConfig.authDomain && 
    firebaseConfig.projectId
  );
};

// Log config status 
if (!isFirebaseConfigValid()) {
  console.error('Firebase configuration is incomplete. Check your environment variables.');
} else {
  console.log('Firebase configuration loaded successfully.');
}

// Initialize Firebase with better error handling
console.log('Initializing Firebase with config:', firebaseConfig);
let app;
try {
  app = initializeApp(firebaseConfig);
  console.log('Firebase app initialized successfully:', app);
} catch (error) {
  console.error('Error initializing Firebase app:', error);
  // Provide a fallback configuration for testing if needed
  if (!isFirebaseConfigValid()) {
    console.warn('Using fallback Firebase configuration for testing');
    const fallbackConfig = {
      apiKey: "AIzaSyDummy-fallback-key-for-testing",
      authDomain: "test-app.firebaseapp.com",
      projectId: "test-app",
      storageBucket: "test-app.appspot.com",
      messagingSenderId: "123456789",
      appId: "1:123456789:web:abcdef123456",
    };
    app = initializeApp(fallbackConfig, 'fallback-app');
  }
}

// Initialize Firebase services with error handling
let auth, firestore, storage, functions, db;
try {
  console.log('Initializing Firebase services...');
  auth = getAuth(app);
  console.log('Auth service initialized');
  
  firestore = getFirestore(app);
  console.log('Firestore service initialized');
  
  db = firestore;
  
  storage = getStorage(app);
  console.log('Storage service initialized');
  
  functions = getFunctions(app);
  console.log('Functions service initialized');
  
  console.log('All Firebase services initialized successfully');
} catch (error) {
  console.error('Error initializing Firebase services:', error);
}

// Export Firebase services
export { auth, firestore, db, storage, functions };

// Import emulator connection functions
import { connectFirestoreEmulator } from 'firebase/firestore';
import { connectAuthEmulator } from 'firebase/auth';
import { connectStorageEmulator } from 'firebase/storage';
import { connectFunctionsEmulator } from 'firebase/functions';

// Connect to emulators in development environment
if (import.meta.env.DEV || import.meta.env.MODE === 'development') {
  console.log('Connecting to Firebase emulators in development mode...');
  
  // Connect to emulators - commenting out as they may not be running correctly
  // connectFirestoreEmulator(firestore, '127.0.0.1', 8080);
  // connectAuthEmulator(auth, 'http://127.0.0.1:9099');
  // connectStorageEmulator(storage, '127.0.0.1', 9199);
  // connectFunctionsEmulator(functions, '127.0.0.1', 5001);
  
  console.log('Using Firebase production environment for development (emulators not connected)');
}

export { isFirebaseConfigValid };
export default app;