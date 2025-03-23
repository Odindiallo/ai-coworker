import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { currentUser } = useAuth();
  
  // Allow bypassing authentication in development mode
  const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';
  
  if (!currentUser && !isDevelopment) {
    console.log('Protected route - redirecting to login');
    return <Navigate to="/login" />;
  }
  
  if (!currentUser && isDevelopment) {
    console.log('Development mode: bypassing authentication for protected route');
  }

  return <>{children}</>;
}

export default ProtectedRoute;