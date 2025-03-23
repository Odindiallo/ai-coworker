import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import LoginForm from '../LoginForm';

// Mock Firebase auth
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
}));

describe('LoginForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('renders login form', () => {
    render(<LoginForm />);
    
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });
  
  test('shows validation errors for empty fields', async () => {
    render(<LoginForm />);
    
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    });
  });
  
  test('shows error message on invalid credentials', async () => {
    // Mock the Firebase auth to reject the sign in
    (signInWithEmailAndPassword as jest.Mock).mockRejectedValueOnce({
      code: 'auth/invalid-credential',
      message: 'Invalid email or password',
    });
    
    render(<LoginForm />);
    
    // Fill in the form
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'wrongpassword' },
    });
    
    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    
    // Check for error message
    await waitFor(() => {
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
    });
  });
  
  test('calls onSuccess after successful login', async () => {
    // Mock the Firebase auth to resolve successfully
    (signInWithEmailAndPassword as jest.Mock).mockResolvedValueOnce({
      user: { uid: 'test-user-123' },
    });
    
    // Create mock for onSuccess callback
    const onSuccessMock = jest.fn();
    
    render(<LoginForm onSuccess={onSuccessMock} />);
    
    // Fill in the form
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' },
    });
    
    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    
    // Check that signInWithEmailAndPassword was called with the right arguments
    await waitFor(() => {
      expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        'test@example.com',
        'password123'
      );
      expect(onSuccessMock).toHaveBeenCalled();
    });
  });
  
  test('calls onError when login fails', async () => {
    const error = new Error('Authentication failed');
    
    // Mock the Firebase auth to reject
    (signInWithEmailAndPassword as jest.Mock).mockRejectedValueOnce(error);
    
    // Create mock for onError callback
    const onErrorMock = jest.fn();
    
    render(<LoginForm onError={onErrorMock} />);
    
    // Fill in the form
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' },
    });
    
    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    
    // Check that onError was called with the error
    await waitFor(() => {
      expect(onErrorMock).toHaveBeenCalledWith(error);
    });
  });
  
  test('disables button while loading', async () => {
    // Mock the Firebase auth with a delayed resolution
    (signInWithEmailAndPassword as jest.Mock).mockImplementationOnce(() => {
      return new Promise(resolve => {
        setTimeout(() => {
          resolve({ user: { uid: 'test-user-123' } });
        }, 100);
      });
    });
    
    render(<LoginForm />);
    
    // Fill in the form
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' },
    });
    
    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    
    // Button should be disabled and showing loading state
    expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled();
    
    // After the login resolves, button should be enabled again
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sign in/i })).not.toBeDisabled();
    });
  });
});
