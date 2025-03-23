import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { firestore } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import TrainingStatus from '../components/actors/TrainingStatus';
import { initiateTraining } from '../lib/training';

interface Actor {
  id: string;
  name: string;
  gender: string;
  createdAt: any;
  modelStatus: 'pending' | 'training' | 'completed' | 'failed';
  trainingJobId?: string;
  modelId?: string;
  imageRefs: Array<{
    id: string;
    url: string;
    path: string;
    name?: string;
  }>;
  userId: string;
}

function ActorDetailPage() {
  const { actorId } = useParams<{ actorId: string }>();
  const [actor, setActor] = useState<Actor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trainingLoading, setTrainingLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null);
  const { currentUser, logOut } = useAuth();
  const navigate = useNavigate();

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Refresh data when coming back online
      fetchActor();
    };
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  const fetchActor = async () => {
    if (!actorId || !currentUser) return;
    
    try {
      const actorDocRef = doc(firestore, 'actors', actorId);
      const actorDoc = await getDoc(actorDocRef);
      
      if (!actorDoc.exists()) {
        setError('Actor not found');
        setLoading(false);
        return;
      }
      
      const actorData = actorDoc.data() as Omit<Actor, 'id'>;
      
      // Check if actor belongs to current user
      if (actorData.userId !== currentUser?.uid) {
        setError('You do not have permission to view this actor');
        setLoading(false);
        return;
      }
      
      setActor({
        id: actorId,
        ...actorData
      });
    } catch (err) {
      console.error('Error fetching actor:', err);
      setError('Failed to load actor details');
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch actor when component mounts
  useEffect(() => {
    console.log('ActorDetailPage mounted, fetching actor data');
    fetchActor();
  }, [actorId]);
  
  // Development mode: auto-update model status for testing
  useEffect(() => {
    const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';
    
    if (isDevelopment && actor && actor.modelStatus === 'pending' && !actor.trainingJobId) {
      // After 2 seconds, update status to training in development mode
      console.log('Development mode: Auto-starting training after delay');
      const timer = setTimeout(() => {
        handleStartTraining();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [actor]);
  
  const handleStartTraining = async () => {
    if (!actor || !isOnline) return;
    
    const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';
    console.log('Starting training for actor:', actor.id, 'Development mode:', isDevelopment);
    
    try {
      setTrainingLoading(true);
      setError(null);
      
      // Call the training function
      console.log('Initiating training via training service');
      const result = await initiateTraining(actor.id);
      console.log('Training initiated successfully:', result);
      
      // Update the actor in state
      setActor({
        ...actor,
        modelStatus: 'training',
        trainingJobId: result.jobId
      });
      
      // Also update Firestore document
      try {
        console.log('Updating Firestore document with training status');
        await updateDoc(doc(firestore, 'actors', actor.id), {
          modelStatus: 'training',
          trainingJobId: result.jobId
        });
        console.log('Firestore document updated successfully');
      } catch (updateErr) {
        console.error('Error updating Firestore:', updateErr);
        
        // In development mode, continue despite Firestore errors
        if (!isDevelopment) {
          throw updateErr;
        }
      }
      
    } catch (err: any) {
      console.error('Error starting training:', err);
      setError(err.message || 'Failed to start training');
    } finally {
      setTrainingLoading(false);
    }
  };
  
  const handleLogout = async () => {
    try {
      await logOut();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };
  
  // Format date for better display
  const formatDate = (timestamp: any): string => {
    if (!timestamp) return 'Unknown date';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Image viewer handlers
  const openImageViewer = (index: number) => {
    setActiveImageIndex(index);
    // Prevent body scrolling when modal is open
    document.body.style.overflow = 'hidden';
  };
  
  const closeImageViewer = () => {
    setActiveImageIndex(null);
    // Restore body scrolling
    document.body.style.overflow = 'auto';
  };
  
  const nextImage = () => {
    if (activeImageIndex === null || !actor) return;
    setActiveImageIndex((activeImageIndex + 1) % actor.imageRefs.length);
  };
  
  const prevImage = () => {
    if (activeImageIndex === null || !actor) return;
    setActiveImageIndex((activeImageIndex - 1 + actor.imageRefs.length) % actor.imageRefs.length);
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
                    Actor Details
                  </span>
                </div>
              </li>
            </ol>
          </nav>
        </div>
        
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}
        
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin h-8 w-8 border-4 border-gray-200 rounded-full border-t-primary-600 mb-4"></div>
            <p className="text-gray-600">Loading actor details...</p>
          </div>
        ) : actor ? (
          <div className="bg-white shadow overflow-hidden rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{actor.name}</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Created on {formatDate(actor.createdAt)}
                  </p>
                </div>
                
                {actor.modelStatus === 'completed' && (
                  <Link
                    to={`/generate/${actor.id}`}
                    className="touch-target inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 min-h-[44px]"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v11a3 3 0 106 0V4a2 2 0 00-2-2H4zm1 14a1 1 0 100-2 1 1 0 000 2zm5-1.757l4.9-4.9a2 2 0 000-2.828L13.485 5.1a2 2 0 00-2.828 0L10 5.757v8.486zM16 18H9.071l6-6H16a2 2 0 012 2v2a2 2 0 01-2 2z" clipRule="evenodd" />
                    </svg>
                    Generate Images
                  </Link>
                )}
              </div>
            </div>
            
            <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500">Gender</dt>
                  <dd className="mt-1 text-sm text-gray-900 capitalize">{actor.gender}</dd>
                </div>
                
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500">Total Images</dt>
                  <dd className="mt-1 text-sm text-gray-900">{actor.imageRefs.length} photos</dd>
                </div>
                
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Model Status</dt>
                  <dd className="mt-1">
                    {actor.trainingJobId ? (
                      <TrainingStatus 
                        actorId={actor.id} 
                        trainingJobId={actor.trainingJobId} 
                        initialStatus={actor.modelStatus} 
                        onComplete={() => {
                          setActor({
                            ...actor,
                            modelStatus: 'completed'
                          });
                        }}
                      />
                    ) : (
                      <div className="flex items-center flex-wrap gap-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          actor.modelStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                          actor.modelStatus === 'failed' ? 'bg-red-100 text-red-800' : ''
                        }`}>
                          {actor.modelStatus.charAt(0).toUpperCase() + actor.modelStatus.slice(1)}
                        </span>
                        
                        {actor.modelStatus === 'pending' && (
                          <button
                            onClick={handleStartTraining}
                            disabled={trainingLoading || !isOnline}
                            className="touch-target inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                          >
                            {trainingLoading ? 'Starting...' : 'Start Training Now'}
                          </button>
                        )}
                      </div>
                    )}
                  </dd>
                </div>
                
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500 mb-2">Reference Images</dt>
                  <dd className="text-sm text-gray-900">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {actor.imageRefs.map((image, index) => (
                        <div 
                          key={image.id} 
                          className="relative rounded-lg overflow-hidden border border-gray-200 group cursor-pointer touch-target"
                          onClick={() => openImageViewer(index)}
                        >
                          <img 
                            src={image.url} 
                            alt={image.name || `Reference ${index + 1}`}
                            className="w-full h-32 object-cover"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-30 transition-opacity"></div>
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">View</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </dd>
                </div>
              </dl>
            </div>
            
            <div className="border-t border-gray-200 px-4 py-5 sm:px-6 bg-gray-50">
              {actor.modelStatus === 'pending' && (
                <div className="text-sm text-gray-700">
                  <h3 className="font-semibold">What happens during training?</h3>
                  <p className="mt-1">
                    When you start training, our AI will learn the features of your actor from the uploaded images.
                    This process typically takes 15-30 minutes. You'll be notified when it's complete and ready to 
                    generate new images.
                  </p>
                </div>
              )}
              
              {actor.modelStatus === 'training' && (
                <div className="text-sm text-gray-700">
                  <h3 className="font-semibold">Training in progress</h3>
                  <p className="mt-1">
                    Your AI actor is currently being trained. This process typically takes 15-30 minutes.
                    You can leave this page and come back later, or stay and watch the progress.
                  </p>
                </div>
              )}
              
              {actor.modelStatus === 'completed' && (
                <div className="text-sm text-gray-700">
                  <h3 className="font-semibold">Training complete!</h3>
                  <p className="mt-1">
                    Your AI actor is ready to generate images. Click the "Generate Images" button to create
                    amazing new images of your actor in different styles and settings.
                  </p>
                </div>
              )}
              
              {actor.modelStatus === 'failed' && (
                <div className="text-sm text-gray-700">
                  <h3 className="font-semibold">Training failed</h3>
                  <p className="mt-1">
                    Unfortunately, the training process failed. This could be due to issues with the uploaded images
                    or temporary system problems. You can try again or contact support for assistance.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600">Actor not found</p>
          </div>
        )}
        
        {/* Image Viewer Modal */}
        {actor && activeImageIndex !== null && (
          <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4">
            <div className="relative w-full max-w-3xl">
              {/* Close button */}
              <button 
                onClick={closeImageViewer}
                className="absolute top-0 right-0 -mt-12 -mr-4 text-white p-2 touch-target z-10"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              
              {/* Image */}
              <div className="relative">
                <img 
                  src={actor.imageRefs[activeImageIndex].url} 
                  alt={actor.imageRefs[activeImageIndex].name || `Image ${activeImageIndex + 1}`}
                  className="max-h-[80vh] mx-auto object-contain"
                />
                
                {/* Navigation buttons */}
                <button 
                  onClick={prevImage}
                  className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-r touch-target"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                
                <button 
                  onClick={nextImage}
                  className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-l touch-target"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              
              {/* Image counter */}
              <div className="text-center text-white mt-4">
                {activeImageIndex + 1} / {actor.imageRefs.length}
              </div>
            </div>
          </div>
        )}
        
        {/* Mobile navigation - fixed at bottom */}
        <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-2 px-4 flex justify-around items-center">
          <Link 
            to="/dashboard" 
            className="flex flex-col items-center justify-center min-w-[64px] min-h-[44px] touch-target text-gray-600"
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
    </div>
  );
}

export default ActorDetailPage;