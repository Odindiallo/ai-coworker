import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import AuthProvider, { useAuth } from '../AuthContext';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';

// Mock Firebase auth
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  onAuthStateChanged: jest.fn()
}));

// Test component that uses the auth context
const TestComponent = () => {
  const { currentUser, loading, login, register, logout, error } = useAuth();
  
  return (
    <div>
      {loading ? (
        <p>Loading...</p>
      ) : currentUser ? (
        <>
          <p>User authenticated: {currentUser.email}</p>
          <button onClick={logout}>Logout</button>
        </>
      ) : (
        <>
          <p>User not authenticated</p>
          <button onClick={() => login('test@example.com', 'password')}>Login</button>
          <button onClick={() => register('new@example.com', 'password')}>Register</button>
        </>
      )}
      {error && <p>Error: {error.message}</p>}
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('should show loading state initially', () => {
    // Mock the auth state change listener but don't trigger it yet
    (getAuth as jest.Mock).mockReturnValue({});
    (onAuthStateChanged as unknown as jest.Mock).mockImplementation(() => {
      // Return the unsubscribe function
      return jest.fn();
    });
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    // Should show loading initially
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
  
  test('should handle unauthenticated state', async () => {
    // Mock the auth state change listener to report no user
    (getAuth as jest.Mock).mockReturnValue({});
    (onAuthStateChanged as unknown as jest.Mock).mockImplementation((auth, callback) => {
      // Call with null to indicate no user
      callback(null);
      // Return the unsubscribe function
      return jest.fn();
    });
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    // Should show unauthenticated state
    await waitFor(() => {
      expect(screen.getByText('User not authenticated')).toBeInTheDocument();
    });
    
    // Login and Register buttons should be available
    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.getByText('Register')).toBeInTheDocument();
  });
  
  test('should handle authenticated state', async () => {
    // Mock user object
    const mockUser = {
      uid: 'test-user-123',
      email: 'test@example.com'
    };
    
    // Mock the auth state change listener to report an authenticated user
    (getAuth as jest.Mock).mockReturnValue({});
    (onAuthStateChanged as unknown as jest.Mock).mockImplementation((auth, callback) => {
      // Call with mock user to indicate authenticated state
      callback(mockUser);
      // Return the unsubscribe function
      return jest.fn();
    });
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    // Should show authenticated state
    await waitFor(() => {
      expect(screen.getByText(`User authenticated: ${mockUser.email}`)).toBeInTheDocument();
    });
    
    // Logout button should be available
    expect(screen.getByText('Logout')).toBeInTheDocument();
  });
  
  test('should handle login function', async () => {
    // Mock the auth state change listener
    (getAuth as jest.Mock).mockReturnValue({});
    (onAuthStateChanged as unknown as jest.Mock).mockImplementation((auth, callback) => {
      // Initially report no user
      callback(null);
      // Return the unsubscribe function
      return jest.fn();
    });
    
    // Mock successful login
    (signInWithEmailAndPassword as jest.Mock).mockResolvedValue({
      user: {
        uid: 'test-user-123',
        email: 'test@example.com'
      }
    });
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    // Wait for the component to finish loading
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
    
    // Click login button
    screen.getByText('Login').click();
    
    // Should call signInWithEmailAndPassword
    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
      expect.anything(),
      'test@example.com',
      'password'
    );
    
    // Mock auth state change after login
    await act(async () => {
      const authStateCallback = (onAuthStateChanged as unknown as jest.Mock).mock.calls[0][1];
      authStateCallback({
        uid: 'test-user-123',
        email: 'test@example.com'
      });
    });
    
    // Should show authenticated state
    await waitFor(() => {
      expect(screen.getByText('User authenticated: test@example.com')).toBeInTheDocument();
    });
  });
  
  test('should handle login errors', async () => {
    // Mock the auth state change listener
    (getAuth as jest.Mock).mockReturnValue({});
    (onAuthStateChanged as unknown as jest.Mock).mockImplementation((auth, callback) => {
      // Report no user
      callback(null);
      // Return the unsubscribe function
      return jest.fn();
    });
    
    // Mock failed login
    const loginError = new Error('Invalid credentials');
    (signInWithEmailAndPassword as jest.Mock).mockRejectedValue(loginError);
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    // Wait for the component to finish loading
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
    
    // Click login button
    screen.getByText('Login').click();
    
    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(`Error: ${loginError.message}`)).toBeInTheDocument();
    });
  });
  
  test('should handle register function', async () => {
    // Mock the auth state change listener
    (getAuth as jest.Mock).mockReturnValue({});
    (onAuthStateChanged as unknown as jest.Mock).mockImplementation((auth, callback) => {
      // Initially report no user
      callback(null);
      // Return the unsubscribe function
      return jest.fn();
    });
    
    // Mock successful registration
    (createUserWithEmailAndPassword as jest.Mock).mockResolvedValue({
      user: {
        uid: 'new-user-123',
        email: 'new@example.com'
      }
    });
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    // Wait for the component to finish loading
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
    
    // Click register button
    screen.getByText('Register').click();
    
    // Should call createUserWithEmailAndPassword
    expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
      expect.anything(),
      'new@example.com',
      'password'
    );
    
    // Mock auth state change after registration
    await act(async () => {
      const authStateCallback = (onAuthStateChanged as unknown as jest.Mock).mock.calls[0][1];
      authStateCallback({
        uid: 'new-user-123',
        email: 'new@example.com'
      });
    });
    
    // Should show authenticated state
    await waitFor(() => {
      expect(screen.getByText('User authenticated: new@example.com')).toBeInTheDocument();
    });
  });
  
  test('should handle logout function', async () => {
    // Mock user object
    const mockUser = {
      uid: 'test-user-123',
      email: 'test@example.com'
    };
    
    // Mock the auth state change listener to initially report an authenticated user
    (getAuth as jest.Mock).mockReturnValue({});
    (onAuthStateChanged as unknown as jest.Mock).mockImplementation((auth, callback) => {
      // Call with mock user to indicate authenticated state
      callback(mockUser);
      // Return the unsubscribe function
      return jest.fn();
    });
    
    // Mock successful logout
    (signOut as jest.Mock).mockResolvedValue(undefined);
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    // Wait for authenticated state
    await waitFor(() => {
      expect(screen.getByText(`User authenticated: ${mockUser.email}`)).toBeInTheDocument();
    });
    
    // Click logout button
    screen.getByText('Logout').click();
    
    // Should call signOut
    expect(signOut).toHaveBeenCalled();
    
    // Mock auth state change after logout
    await act(async () => {
      const authStateCallback = (onAuthStateChanged as unknown as jest.Mock).mock.calls[0][1];
      authStateCallback(null);
    });
    
    // Should show unauthenticated state
    await waitFor(() => {
      expect(screen.getByText('User not authenticated')).toBeInTheDocument();
    });
  });
  
  test('should handle logout errors', async () => {
    // Mock user object
    const mockUser = {
      uid: 'test-user-123',
      email: 'test@example.com'
    };
    
    // Mock the auth state change listener
    (getAuth as jest.Mock).mockReturnValue({});
    (onAuthStateChanged as unknown as jest.Mock).mockImplementation((auth, callback) => {
      // Call with mock user to indicate authenticated state
      callback(mockUser);
      // Return the unsubscribe function
      return jest.fn();
    });
    
    // Mock failed logout
    const logoutError = new Error('Logout failed');
    (signOut as jest.Mock).mockRejectedValue(logoutError);
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    // Wait for authenticated state
    await waitFor(() => {
      expect(screen.getByText(`User authenticated: ${mockUser.email}`)).toBeInTheDocument();
    });
    
    // Click logout button
    screen.getByText('Logout').click();
    
    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(`Error: ${logoutError.message}`)).toBeInTheDocument();
    });
  });
  
  test('should unsubscribe from auth state changes on unmount', () => {
    // Mock unsubscribe function
    const mockUnsubscribe = jest.fn();
    
    // Mock the auth state change listener
    (getAuth as jest.Mock).mockReturnValue({});
    (onAuthStateChanged as unknown as jest.Mock).mockImplementation(() => {
      // Return the unsubscribe function
      return mockUnsubscribe;
    });
    
    const { unmount } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    // Unmount the component
    unmount();
    
    // Should call the unsubscribe function
    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});
