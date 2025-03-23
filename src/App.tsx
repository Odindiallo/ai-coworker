import { Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import DashboardPage from './pages/DashboardPage';
import CreateActorPage from './pages/CreateActorPage';
import ActorDetailPage from './pages/ActorDetailPage';
import GeneratePage from './pages/GeneratePage';

function App() {
  const location = useLocation();

  // Scroll to top on page navigation
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/create-actor" 
        element={
          <ProtectedRoute>
            <CreateActorPage />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/actors/:actorId" 
        element={
          <ProtectedRoute>
            <ActorDetailPage />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/generate/:actorId" 
        element={
          <ProtectedRoute>
            <GeneratePage />
          </ProtectedRoute>
        } 
      />
      
      {/* Fallback route for 404 */}
      <Route 
        path="*" 
        element={
          <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Page Not Found</h1>
            <p className="text-gray-600 mb-8">The page you are looking for does not exist.</p>
            <a 
              href="/"
              className="touch-target px-4 py-2 text-white bg-primary-600 rounded-md hover:bg-primary-700 transition-colors min-h-[44px] flex items-center"
            >
              Return to Home
            </a>
          </div>
        } 
      />
    </Routes>
  );
}

export default App;