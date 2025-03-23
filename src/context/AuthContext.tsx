import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  User, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, increment } from 'firebase/firestore';
import { db } from '../lib/firebase';

// Constants for lockout
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<User>;
  signIn: (email: string, password: string) => Promise<User>;
  logOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  isAccountLocked: (email: string) => Promise<{ locked: boolean; remainingTime?: number }>;
  resetFailedAttempts: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    
    return unsubscribe;
  }, []);

  // Check if an account is locked due to too many failed login attempts
  async function isAccountLocked(email: string): Promise<{ locked: boolean; remainingTime?: number }> {
    try {
      // Check if we're in development mode
      const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';
      
      // Skip lockout check in development mode
      if (isDevelopment) {
        console.log('Development mode: Skipping account lockout check');
        return { locked: false };
      }
      
      const safeEmail = email.toLowerCase().replace(/\./g, ',');
      const lockoutRef = doc(db, 'account_lockouts', safeEmail);
      const lockoutDoc = await getDoc(lockoutRef);
      
      if (lockoutDoc.exists()) {
        const data = lockoutDoc.data();
        
        // Check if user has too many failed attempts
        if (data.failedAttempts >= MAX_FAILED_ATTEMPTS) {
          const lockoutTime = data.lastFailedAttempt?.toDate() || new Date();
          const lockoutExpiry = new Date(lockoutTime.getTime() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
          const now = new Date();
          
          // Check if lockout period has expired
          if (now < lockoutExpiry) {
            // Still locked out
            const remainingTime = Math.ceil((lockoutExpiry.getTime() - now.getTime()) / (60 * 1000));
            return { locked: true, remainingTime };
          } else {
            // Lockout expired, reset the failed attempts
            await updateDoc(lockoutRef, {
              failedAttempts: 0,
              lastFailedAttempt: null
            });
            return { locked: false };
          }
        }
      }
      
      // No lockout record or not enough failed attempts
      return { locked: false };
    } catch (error) {
      console.error('Error checking account lockout:', error);
      // Default to not locked if there's an error checking
      return { locked: false };
    }
  }

  // Record a failed login attempt
  async function recordFailedAttempt(email: string): Promise<void> {
    try {
      // Skip in development mode
      const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';
      if (isDevelopment) {
        console.log('Development mode: Skipping recording failed attempts');
        return;
      }
      
      const safeEmail = email.toLowerCase().replace(/\./g, ',');
      const lockoutRef = doc(db, 'account_lockouts', safeEmail);
      const lockoutDoc = await getDoc(lockoutRef);
      
      if (lockoutDoc.exists()) {
        // Increment failed attempts
        await updateDoc(lockoutRef, {
          failedAttempts: increment(1),
          lastFailedAttempt: serverTimestamp()
        });
      } else {
        // Create new lockout record
        await setDoc(lockoutRef, {
          email: email.toLowerCase(),
          failedAttempts: 1,
          lastFailedAttempt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Error recording failed attempt:', error);
    }
  }

  // Reset failed login attempts after successful login
  async function resetFailedAttempts(email: string): Promise<void> {
    try {
      // Skip in development mode
      const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';
      if (isDevelopment) {
        console.log('Development mode: Skipping reset of failed attempts');
        return;
      }
      
      const safeEmail = email.toLowerCase().replace(/\./g, ',');
      const lockoutRef = doc(db, 'account_lockouts', safeEmail);
      
      await setDoc(lockoutRef, {
        email: email.toLowerCase(),
        failedAttempts: 0,
        lastFailedAttempt: null
      }, { merge: true });
    } catch (error) {
      console.error('Error resetting failed attempts:', error);
    }
  }

  function signUp(email: string, password: string): Promise<User> {
    return createUserWithEmailAndPassword(auth, email, password)
      .then((userCredential) => userCredential.user);
  }

  async function signIn(email: string, password: string): Promise<User> {
    // Check if we're in development mode
    const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';
    console.log('SignIn attempt:', { email, isDevelopment });
    
    // Development mode shortcut for testing
    if (isDevelopment && email.toLowerCase() === 'test@example.com') {
      console.log('Development mode: Using test account login');
      // Return a mock user for testing
      const mockUser = {
        uid: 'test-user-id',
        email: 'test@example.com',
        displayName: 'Test User',
        emailVerified: true,
        isAnonymous: false,
        metadata: {},
        providerData: [],
        refreshToken: '',
        tenantId: null,
        delete: async () => {},
        getIdToken: async () => 'mock-token',
        getIdTokenResult: async () => ({ token: 'mock-token', claims: {}, authTime: '', issuedAtTime: '', expirationTime: '', signInProvider: null, signInSecondFactor: null }),
        reload: async () => {},
        toJSON: () => ({}),
        phoneNumber: null,
        photoURL: null,
        providerId: 'password'
      } as unknown as User;
      
      // Set as current user
      setCurrentUser(mockUser);
      console.log('Mock user set:', mockUser);
      return mockUser;
    }
    
    // Regular authentication flow for production
    // Check if the account is locked before attempting login
    const lockStatus = await isAccountLocked(email);
    
    if (lockStatus.locked) {
      throw new Error(`Account temporarily locked due to too many failed login attempts. Please try again in ${lockStatus.remainingTime} minutes.`);
    }
    
    try {
      // Attempt to sign in
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // If successful, reset failed attempts
      await resetFailedAttempts(email);
      
      return userCredential.user;
    } catch (error) {
      // Record the failed attempt
      await recordFailedAttempt(email);
      
      // Recheck lock status to see if this attempt triggered a lockout
      const newLockStatus = await isAccountLocked(email);
      if (newLockStatus.locked) {
        throw new Error(`Account temporarily locked due to too many failed login attempts. Please try again in ${newLockStatus.remainingTime} minutes.`);
      }
      
      // Otherwise, rethrow the original error
      throw error;
    }
  }

  function logOut(): Promise<void> {
    return signOut(auth);
  }

  function resetPassword(email: string): Promise<void> {
    return sendPasswordResetEmail(auth, email);
  }

  const value = {
    currentUser,
    loading,
    signUp,
    signIn,
    logOut,
    resetPassword,
    isAccountLocked,
    resetFailedAttempts
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}