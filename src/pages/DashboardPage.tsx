import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { firestore } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import PullToRefresh from '../components/ui/PullToRefresh';
import ActivityFeed from '../components/dashboard/ActivityFeed';
import FavoriteActors from '../components/dashboard/FavoriteActors';
import UsageStats from '../components/dashboard/UsageStats';
import FirebasePermissionTest from '../components/dashboard/FirebasePermissionTest';
import { 
  isFirebasePermissionError, 
  getUserFriendlyErrorMessage, 
  logPermissionError 
} from '../utils/errorHandling';

interface Actor {
  id: string;
  name: string;
  gender: string;
  createdAt: Timestamp | Date;
  modelStatus: 'pending' | 'training' | 'completed' | 'failed';
  imageRefs?: {
    id: string;
    path: string;
    url: string;
  }[];
}

interface LocationState {
  message?: string;
}

function DashboardPage() {
  const [actors, setActors] = useState<Actor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showPermissionTest, setShowPermissionTest] = useState(false);
  const { currentUser, logOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Wrap fetchActors with useCallback
  const fetchActors = useCallback(async () => {
    const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';
    console.log('Fetching actors, development mode:', isDevelopment);
    
    if (!currentUser && !isDevelopment) {
      console.log("No authenticated user, skipping fetch");
      return;
    }
    
    if (!isOnline) {
      console.log("Device is offline, skipping fetch");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Get user ID - in development mode, check localStorage for temp ID
      const userId = currentUser?.uid || (isDevelopment ? localStorage.getItem('devUserId') : null);
      
      // If we still don't have a userId in development mode, create one
      if (!userId && isDevelopment) {
        const tempUserId = 'dev-user-' + Date.now();
        localStorage.setItem('devUserId', tempUserId);
        console.log('Created development user ID:', tempUserId);
      }
      
      try {
        // Get the effective userId (either from auth or development)
        const effectiveUserId = currentUser?.uid || localStorage.getItem('devUserId') || 'test-user';
        console.log('Using effective user ID for query:', effectiveUserId);
        
        const actorsQuery = query(
          collection(firestore, 'actors'),
          where('userId', '==', effectiveUserId),
          orderBy('createdAt', 'desc')
        );
        
        console.log('Executing Firestore query...');
        const querySnapshot = await getDocs(actorsQuery);
        console.log('Query returned documents:', querySnapshot.size);
        const actorList: Actor[] = [];
        
        querySnapshot.forEach((doc) => {
          actorList.push({
            id: doc.id,
            name: doc.data().name,
            gender: doc.data().gender || '',
            createdAt: doc.data().createdAt,
            modelStatus: doc.data().modelStatus,
            imageRefs: doc.data().imageRefs || []
          });
        });
        
        setActors(actorList);
      } catch (err: unknown) {
      console.error("Error in initial query:", err);
          const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';
          
          if (isDevelopment) {
            // In development, try to fetch all actors if the query fails
            console.log('Development mode: Trying to fetch all actors instead');
            try {
              const allActorsQuery = query(
                collection(firestore, 'actors')
              );
              const allActorsSnapshot = await getDocs(allActorsQuery);
              const allActorsList: Actor[] = [];
              
              allActorsSnapshot.forEach((doc) => {
                allActorsList.push({
                  id: doc.id,
                  name: doc.data().name,
                  gender: doc.data().gender || '',
                  createdAt: doc.data().createdAt,
                  modelStatus: doc.data().modelStatus,
                  imageRefs: doc.data().imageRefs || []
                });
              });
              
              console.log('Found', allActorsList.length, 'actors in development mode');
              if (allActorsList.length > 0) {
                setActors(allActorsList);
                setLoading(false);
                return;
              }
            } catch (allErr) {
              console.error('Error fetching all actors in development mode:', allErr);
            }
          }
        
        // If it's an index error, try a simpler query without the orderBy
        if (err instanceof Error && err.message && err.message.includes("index") && err.message.includes("building")) {
          console.log("Index is building, using simple query as fallback");
          
          // Fallback to a simpler query without ordering
          const simpleQuery = query(
            collection(firestore, 'actors'),
            where('userId', '==', currentUser.uid)
          );
          
          const simpleSnapshot = await getDocs(simpleQuery);
          const simpleActorList: Actor[] = [];
          
          simpleSnapshot.forEach((doc) => {
            simpleActorList.push({
              id: doc.id,
              name: doc.data().name,
              gender: doc.data().gender || '',
              createdAt: doc.data().createdAt,
              modelStatus: doc.data().modelStatus,
              imageRefs: doc.data().imageRefs || []
            });
          });
          
          // Sort client-side instead of using Firestore's orderBy
          simpleActorList.sort((a, b) => {
            const dateA = a.createdAt instanceof Timestamp ? a.createdAt.toDate() : a.createdAt;
            const dateB = b.createdAt instanceof Timestamp ? b.createdAt.toDate() : b.createdAt;
            return dateB.getTime() - dateA.getTime(); // Descending order
          });
          
          setActors(simpleActorList);
          setError("Some features are temporarily limited while database indexes are being built. This may take a few minutes.");
        } else {
          // For other errors, log and report them
          if (isFirebasePermissionError(err)) {
            logPermissionError(err, 'actors', 'read');
          }
          throw err; // Re-throw for the outer catch block
        }
      }
    } catch (err) {
      console.error('Error fetching actors:', err);
      setError(getUserFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [currentUser, isOnline]); // Add any dependencies fetchActors uses
  
  // Refresh actors on mount and when location changes
  useEffect(() => {
    console.log('Dashboard mounted or location changed, fetching actors...');
    fetchActors();
  }, [fetchActors, location.pathname]);
  
  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Refresh data when coming back online
      fetchActors();
    };
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [fetchActors]);
  
  // Get message from location state if it exists
  useEffect(() => {
    const state = location.state as LocationState;
    if (state?.message) {
      setSuccessMessage(state.message);
      // Clear the location state after reading the message
      navigate(location.pathname, { replace: true });
    }
  }, [location, navigate]);
  
  // Clear success message after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [successMessage]);
  
  const handleLogout = async () => {
    try {
      await logOut();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };
  
  // Handle refresh via pull-to-refresh
  const handleRefresh = async () => {
    await fetchActors();
    // Show a quick success message when refresh is complete
    setSuccessMessage('Content refreshed');
  };
  
  // Format date for better display
  const formatDate = (timestamp: Timestamp | Date): string => {
    if (!timestamp) return 'Unknown date';
    
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Toggle the permission test visibility
  const togglePermissionTest = () => {
    setShowPermissionTest(prev => !prev);
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-xl sm:text-2xl font-bold text-primary-600">AI Actor Generator</h1>
          <div className="flex items-center">
            <span className="hidden sm:inline mr-4 text-sm text-gray-600">
              {currentUser?.email}
            </span>
            <button
              onClick={handleLogout}
              className="touch-target min-h-[44px] flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-primary-600 transition-colors"
            >
              Log out
            </button>
          </div>
        </div>
      </header>
      
      <PullToRefresh 
        onRefresh={handleRefresh} 
        className="h-full"
        refreshingText="Refreshing actors..."
        pullingText="Pull down to refresh"
        releaseText="Release to refresh"
      >
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Offline warning */}
          {!isOnline && (
            <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    You're currently offline. Some features may be unavailable until you reconnect.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Success message */}
          {successMessage && (
            <div className="mb-6 bg-green-50 border-l-4 border-green-400 p-4 transition-opacity duration-500 ease-in-out">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3 flex-grow">
                  <p className="text-sm text-green-700">{successMessage}</p>
                </div>
                <div className="pl-3">
                  <button
                    type="button"
                    onClick={() => setSuccessMessage(null)}
                    className="inline-flex rounded-full p-1.5 text-green-500 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 focus:ring-offset-green-50 touch-target"
                  >
                    <span className="sr-only">Dismiss</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Error message */}
          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3 flex-grow">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
                <div className="pl-3">
                  <button
                    type="button"
                    onClick={() => setError(null)}
                    className="inline-flex rounded-full p-1.5 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 focus:ring-offset-red-50 touch-target"
                  >
                    <span className="sr-only">Dismiss</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}
        
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 sm:gap-0">
            <h2 className="text-2xl font-bold text-gray-900">Your AI Actors</h2>
            <Link
              to="/create-actor"
              className="touch-target bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center min-h-[44px]"
              aria-label="Create a new AI actor"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Create New Actor
            </Link>
          </div>
          
          {/* Dashboard summary components */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <FavoriteActors className="lg:col-span-2" />
            <UsageStats />
          </div>
          
          {/* Activity feed */}
          <ActivityFeed className="mb-6" />
          
          {/* Loading state */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin h-8 w-8 border-4 border-gray-200 rounded-full border-t-primary-600 mb-4"></div>
              <p className="text-gray-600">Loading your actors...</p>
            </div>
          ) : actors.length === 0 ? (
            // Empty state
            <div className="bg-white shadow rounded-lg p-6 text-center">
              <div className="flex flex-col items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">You don't have any AI actors yet</h3>
                <p className="text-gray-600 mb-4 max-w-md">
                  Create your first AI actor by uploading photos of yourself or someone else.
                  Our AI will learn to generate new images of this person.
                </p>
                <Link
                  to="/create-actor"
                  className="touch-target inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors min-h-[44px]"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  Create Your First AI Actor
                </Link>
              </div>
            </div>
          ) : (
            // Actor grid
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {actors.map((actor) => (
                <div key={actor.id} className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
                  {/* Actor image preview if available */}
                  {actor.imageRefs && actor.imageRefs.length > 0 && (
                    <div className="relative bg-gray-200 aspect-[4/3] overflow-hidden">
                      <img 
                        src={actor.imageRefs[0].url} 
                        alt={`Preview of ${actor.name}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-25 flex items-center justify-center">
                        <span className="text-white font-medium px-3 py-1 bg-black bg-opacity-50 rounded-md text-sm">
                          {actor.imageRefs.length} photos
                        </span>
                      </div>
                    </div>
                  )}
                  
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-medium text-gray-900">{actor.name}</h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        actor.modelStatus === 'completed' ? 'bg-green-100 text-green-800' :
                        actor.modelStatus === 'training' ? 'bg-blue-100 text-blue-800' :
                        actor.modelStatus === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {actor.modelStatus === 'completed' ? 'Ready' :
                         actor.modelStatus === 'training' ? 'Training' :
                         actor.modelStatus === 'failed' ? 'Failed' :
                         'Pending'}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-500 mb-3">
                      Created on {formatDate(actor.createdAt)}
                    </p>
                    
                    <div className="flex space-x-3">
                      <Link
                        to={`/actors/${actor.id}`}
                        className="flex-1 touch-target inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-primary-700 bg-primary-100 hover:bg-primary-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors min-h-[44px]"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                          <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                        </svg>
                        Details
                      </Link>
                      {actor.modelStatus === 'completed' && (
                        <Link
                          to={`/generate/${actor.id}`}
                          className="flex-1 touch-target inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors min-h-[44px]"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v11a3 3 0 106 0V4a2 2 0 00-2-2H4zm1 14a1 1 0 100-2 1 1 0 000 2zm5-1.757l4.9-4.9a2 2 0 000-2.828L13.485 5.1a2 2 0 00-2.828 0L10 5.757v8.486zM16 18H9.071l6-6H16a2 2 0 012 2v2a2 2 0 01-2 2z" clipRule="evenodd" />
                          </svg>
                          Generate
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Pull to refresh info - visible only on initial page load */}
          {!loading && actors.length > 0 && (
            <div className="mt-6 text-center text-sm text-gray-500 sm:hidden">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block mr-1 animate-bounce" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Pull down to refresh
            </div>
          )}
          
          {/* Information box */}
          {actors.length > 0 && (
            <div className="mt-8 p-4 bg-blue-50 rounded-md border border-blue-100">
              <h3 className="text-sm font-medium text-blue-800">Training Process</h3>
              <p className="mt-2 text-sm text-blue-700">
                After creating an actor, our AI system begins training on your uploaded images. 
                This process typically takes 15-30 minutes. You'll see the status change from 
                "Pending" to "Training" to "Ready" when complete. Once ready, you can generate 
                new images of your AI actor!
              </p>
            </div>
          )}
          
          {/* Firebase Permission Test Toggle Button (only visible for development) */}
          <div className="mt-8 text-center">
            <button
              onClick={togglePermissionTest}
              className="text-xs font-medium text-gray-600 hover:text-primary-600 py-2 px-4 rounded-md border border-gray-300 hover:border-primary-300 transition-colors"
            >
              {showPermissionTest ? 'Hide Firebase Tests' : 'Show Firebase Tests'}
            </button>
          </div>
          
          {/* Firebase Permission Test Component */}
          {showPermissionTest && (
            <div className="mt-4 mb-8">
              <FirebasePermissionTest />
            </div>
          )}
          
          {/* Mobile navigation - fixed at bottom */}
          <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-2 px-4 flex justify-around items-center">
            <Link 
              to="/dashboard" 
              className="flex flex-col items-center justify-center min-w-[64px] min-h-[44px] touch-target text-primary-600"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
              <span className="text-xs mt-1">Home</span>
            </Link>
            
            <Link 
              to="/create-actor" 
              className="flex flex-col items-center justify-center min-w-[64px] min-h-[44px] touch-target text-gray-600"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              <span className="text-xs mt-1">Create</span>
            </Link>
            
            <button
              onClick={handleLogout}
              className="flex flex-col items-center justify-center min-w-[64px] min-h-[44px] touch-target text-gray-600"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V7.414l-5-5H3zM2 4a2 2 0 012-2h5.586a1 1 0 01.707.293l6 6a1 1 0 01.293.707V16a2 2 0 01-2 2H4a2 2 0 01-2-2V4z" clipRule="evenodd" />
                <path d="M10 9V6m0 0v3m0-3h3m-3 0H7" />
              </svg>
              <span className="text-xs mt-1">Account</span>
            </button>
          </div>
          
          {/* Space at bottom to allow for fixed mobile navigation */}
          <div className="sm:hidden h-16"></div>
        </main>
      </PullToRefresh>
    </div>
  );
}

export default DashboardPage;