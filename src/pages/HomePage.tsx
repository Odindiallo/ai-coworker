import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function HomePage() {
  const { currentUser } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary-600">AI Actor Generator</h1>
          <nav>
            {currentUser ? (
              <Link 
                to="/dashboard" 
                className="touch-target ml-4 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Dashboard
              </Link>
            ) : (
              <div className="space-x-4">
                <Link 
                  to="/login" 
                  className="touch-target text-gray-700 hover:text-primary-600 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Login
                </Link>
                <Link 
                  to="/register" 
                  className="touch-target bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </nav>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Hero Section */}
        <section className="py-12 md:py-20">
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Create AI-Generated Images of Yourself
            </h2>
            <p className="text-lg text-gray-600 mb-8 max-w-3xl mx-auto">
              Upload your photos and generate amazing new images of yourself in different styles, 
              settings, and scenarios using advanced AI technology.
            </p>
            <Link 
              to={currentUser ? "/dashboard" : "/register"} 
              className="touch-target inline-block bg-primary-600 hover:bg-primary-700 text-white py-3 px-8 rounded-md text-lg font-medium transition-colors"
            >
              {currentUser ? "Go to Dashboard" : "Get Started"}
            </Link>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-12 md:py-16">
          <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">How It Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-primary-600 text-xl font-bold mb-2">1. Upload Photos</div>
              <p className="text-gray-600">
                Upload 10-20 photos of yourself from different angles and in different settings.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-primary-600 text-xl font-bold mb-2">2. Train Your AI Actor</div>
              <p className="text-gray-600">
                Our system automatically trains an AI model that learns your facial features and expressions.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-primary-600 text-xl font-bold mb-2">3. Generate Images</div>
              <p className="text-gray-600">
                Use text prompts to create brand new images of yourself in any style or scenario you can imagine.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-500 text-sm">
          <p>© {new Date().getFullYear()} AI Actor Generator. All rights reserved.</p>
          <p className="mt-2">Powered by React, Firebase, and Hugging Face AI.</p>
        </div>
      </footer>
    </div>
  );
}

export default HomePage;