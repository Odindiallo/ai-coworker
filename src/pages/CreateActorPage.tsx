import { Link } from 'react-router-dom';
import ActorCreationForm from '../components/actors/ActorCreationForm';
import { useAuth } from '../context/AuthContext';

function CreateActorPage() {
  const { currentUser, logOut } = useAuth();
  
  const handleLogout = async () => {
    try {
      await logOut();
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary-600">AI Actor Generator</h1>
          <div className="flex items-center">
            <span className="mr-4 text-sm text-gray-600">
              {currentUser?.email}
            </span>
            <button
              onClick={handleLogout}
              className="touch-target text-sm font-medium text-gray-700 hover:text-primary-600 transition-colors"
            >
              Log out
            </button>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-4">
              <li>
                <div>
                  <Link to="/dashboard" className="text-gray-500 hover:text-gray-700 text-sm">
                    Dashboard
                  </Link>
                </div>
              </li>
              <li>
                <div className="flex items-center">
                  <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                  </svg>
                  <span className="ml-4 text-sm font-medium text-gray-500">
                    Create Actor
                  </span>
                </div>
              </li>
            </ol>
          </nav>
        </div>
        
        <ActorCreationForm />
      </main>
    </div>
  );
}

export default CreateActorPage;