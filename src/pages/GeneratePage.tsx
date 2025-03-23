import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { firestore } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import PromptForm, { GenerationSettings } from '../components/generation/PromptForm';
import GeneratedImage from '../components/generation/GeneratedImage';
import { generateImage, getGeneratedImages } from '../lib/generation';
import PullToRefresh from '../components/ui/PullToRefresh';
import BatteryStatus from '../components/ui/BatteryStatus';
import useBattery from '../hooks/useBattery';

interface Actor {
  id: string;
  name: string;
  gender: string;
  modelId: string;
  modelStatus: 'pending' | 'training' | 'completed' | 'failed';
  userId: string;
}

interface GeneratedImageType {
  id: string;
  imageUrl: string;
  prompt: string;
  createdAt: any;
}

function GeneratePage() {
  const { actorId } = useParams<{ actorId: string }>();
  const [actor, setActor] = useState<Actor | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImageType[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null);
  const [promptHistory, setPromptHistory] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { currentUser, logOut } = useAuth();
  const navigate = useNavigate();
  const { imageGenerationSettings, shouldShowWarning } = useBattery();

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Refresh data when coming back online
      fetchActor();
      fetchGeneratedImages();
    };
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // Clear success message after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [successMessage]);
  
  const fetchActor = async () => {
    if (!actorId) return;
    
    // Check for development mode
    const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';
    
    // In strict production mode, require auth and online status
    if (!currentUser && !isDevelopment) {
      console.log('No authenticated user and not in development mode');
      setError('You must be logged in to access this feature');
      setLoading(false);
      return;
    }
    
    if (!isOnline && !isDevelopment) {
      console.log('Device is offline and not in development mode');
      setLoading(false);
      return;
    }
    
    try {
      console.log('Fetching actor details:', actorId);
      
      // Try to get from Firestore
      try {
        const actorDocRef = doc(firestore, 'actors', actorId);
        const actorDoc = await getDoc(actorDocRef);
        
        if (actorDoc.exists()) {
          const actorData = actorDoc.data() as Omit<Actor, 'id'>;
          
          // Check if actor belongs to current user in production mode
          if (currentUser && actorData.userId !== currentUser.uid && !isDevelopment) {
            setError('You do not have permission to access this actor');
            setLoading(false);
            return;
          }
          
          // Check if actor model is ready for generation
          if (actorData.modelStatus !== 'completed' && !isDevelopment) {
            setError('This actor model is not ready for image generation');
            setLoading(false);
            return;
          }
          
          setActor({
            id: actorId,
            ...actorData
          });
          console.log('Actor data loaded successfully');
        } else {
          console.log('Actor document not found');
          
          // In development mode, create a mock actor
          if (isDevelopment) {
            console.log('Development mode: Creating mock actor');
            setActor({
              id: actorId,
              name: 'Development Actor',
              gender: 'other',
              modelId: 'mock-model-id',
              modelStatus: 'completed',
              userId: localStorage.getItem('devUserId') || 'test-user'
            });
          } else {
            setError('Actor not found');
          }
        }
      } catch (firestoreErr) {
        console.error('Firestore error:', firestoreErr);
        
        // In development mode, create a mock actor
        if (isDevelopment) {
          console.log('Development mode: Creating mock actor due to Firestore error');
          setActor({
            id: actorId,
            name: 'Error Fallback Actor',
            gender: 'other',
            modelId: 'mock-model-id',
            modelStatus: 'completed',
            userId: localStorage.getItem('devUserId') || 'test-user'
          });
        } else {
          throw firestoreErr;
        }
      }
    } catch (err) {
      console.error('Error fetching actor:', err);
      setError('Failed to load actor details');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchGeneratedImages = async () => {
    if (!actorId) return;
    
    // Check for online status but allow development mode to continue
    const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';
    if (!isOnline && !isDevelopment) return;
    
    try {
      console.log('Fetching generated images for actor:', actorId);
      
      // Use our improved getGeneratedImages function
      const result = await getGeneratedImages(actorId);
      console.log('Fetched generated images:', result.images.length);
      
      setGeneratedImages(result.images);
      
      // Extract prompts from images
      const prompts: string[] = [];
      result.images.forEach(img => {
        if (img.prompt && !prompts.includes(img.prompt)) {
          prompts.push(img.prompt);
        }
      });
      
      setPromptHistory(prompts.slice(0, 5));
    } catch (err) {
      console.error('Error fetching generated images:', err);
      
      // In development mode, create mock images
      if (isDevelopment) {
        console.log('Development mode: Creating mock images due to error');
        const mockImages = Array(3).fill(0).map((_, i) => ({
          id: `error_mock_${i}`,
          imageUrl: `https://picsum.photos/seed/error_${actorId}_${i}/512/512`,
          prompt: `Mock image ${i+1} created after error`,
          createdAt: new Date(Date.now() - i * 3600000)
        }));
        
        setGeneratedImages(mockImages);
        setPromptHistory(['A happy person', 'Portrait photo', 'Professional headshot']);
      }
    }
  };
  
  // Fetch data when component mounts
  useEffect(() => {
    fetchActor();
    fetchGeneratedImages();
  }, [actorId, currentUser]);
  
  const handleGenerateImage = async (prompt: string, settings: GenerationSettings) => {
    if (!actor || !isOnline) return;
    
    try {
      setGenerating(true);
      setError(null);
      
      // Apply battery optimization if needed
      const optimizedSettings = {
        ...settings,
        // Use a more conservative approach for inference steps if battery is low
        numInferenceSteps: settings.numInferenceSteps || imageGenerationSettings.inferenceSteps,
        useLowMemoryMode: settings.useLowMemoryMode || imageGenerationSettings.useLowMemoryMode
      };
      
      const result = await generateImage(actor.id, prompt, optimizedSettings);
      
      // Add the new image to the top of the list
      setGeneratedImages(prevImages => [
        {
          id: result.id,
          imageUrl: result.imageUrl,
          prompt: prompt,
          createdAt: new Date()
        },
        ...prevImages
      ]);
      
      // Add prompt to history if not already included
      if (!promptHistory.includes(prompt)) {
        setPromptHistory(prevHistory => [
          prompt,
          ...prevHistory.slice(0, 4) // Keep only the 5 most recent prompts
        ]);
      }
      
      // Show success message
      setSuccessMessage('Image generated successfully!');
    } catch (err: any) {
      console.error('Error generating image:', err);
      setError(err.message || 'Failed to generate image. Please try again.');
    } finally {
      setGenerating(false);
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
  
  // Pull-to-refresh handler
  const handleRefresh = async () => {
    if (!isOnline) return;
    
    await Promise.all([
      fetchActor(),
      fetchGeneratedImages()
    ]);
    
    setSuccessMessage('Content refreshed');
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
    if (activeImageIndex === null || generatedImages.length === 0) return;
    setActiveImageIndex((activeImageIndex + 1) % generatedImages.length);
  };
  
  const prevImage = () => {
    if (activeImageIndex === null || generatedImages.length === 0) return;
    setActiveImageIndex((activeImageIndex - 1 + generatedImages.length) % generatedImages.length);
  };
  
  const handleDownloadImage = (imageUrl: string, prompt: string) => {
    // Create an anchor element and set download attributes
    const link = document.createElement('a');
    link.href = imageUrl;
    
    // Create a sanitized filename from the prompt
    const sanitizedPrompt = prompt.substring(0, 20)
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase();
    
    link.download = `ai-actor-${sanitizedPrompt}-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleShareImage = async (imageUrl: string, prompt: string) => {
    // Check if Web Share API is available
    if (navigator.share) {
      try {
        // Use Web Share API for mobile
        await navigator.share({
          title: 'My Generated AI Image',
          text: prompt,
          url: imageUrl
        });
      } catch (error) {
        // User likely canceled the share, no need to handle
        console.log('Share cancelled');
      }
    } else {
      // Fallback - copy image URL to clipboard
      navigator.clipboard.writeText(imageUrl)
        .then(() => {
          alert('Image URL copied to clipboard!');
        })
        .catch((err) => {
          console.error('Failed to copy URL:', err);
          alert('Could not copy URL to clipboard');
        });
    }
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
        refreshingText="Refreshing images..."
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
                  You're currently offline. Image generation is unavailable until you reconnect.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Battery warning - only show when needed */}
        {shouldShowWarning && (
          <div className="mb-6">
            <BatteryStatus />
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
                  <Link to={`/actors/${actorId}`} className="ml-4 text-gray-500 hover:text-gray-700 text-sm">
                    Actor Details
                  </Link>
                </div>
              </li>
              <li>
                <div className="flex items-center">
                  <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                  </svg>
                  <span className="ml-4 text-sm font-medium text-gray-500">
                    Generate Images
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left column - Prompt form */}
            <div>
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Generate Images of {actor.name}</h2>
                
                <PromptForm 
                  onSubmit={handleGenerateImage} 
                  isLoading={generating || !isOnline}
                />
                
                {/* Previous prompts */}
                {promptHistory.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Previous prompts</h3>
                    <div className="space-y-2">
                      {promptHistory.map((prompt, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            // Find a sample prompt element and set its value
                            const promptTextarea = document.getElementById('prompt') as HTMLTextAreaElement;
                            if (promptTextarea) {
                              promptTextarea.value = prompt;
                              // Trigger an input event to update the form state
                              const event = new Event('input', { bubbles: true });
                              promptTextarea.dispatchEvent(event);
                            }
                          }}
                          className="block w-full text-left px-3 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-md text-sm text-gray-700 truncate transition-colors touch-target text-ellipsis overflow-hidden"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Right column - Generated images */}
            <div>
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  {generatedImages.length > 0 ? 'Generated Images' : 'Your Generated Images'}
                </h2>
                
                {generating && (
                  <div className="mb-6 p-6 border border-gray-200 rounded-lg bg-gray-50 flex items-center justify-center">
                    <div className="flex flex-col items-center">
                      <svg className="animate-spin h-10 w-10 text-primary-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <p className="text-gray-700 font-medium">Generating your image...</p>
                      <p className="text-sm text-gray-500 mt-2">This may take up to 30 seconds</p>
                    </div>
                  </div>
                )}
                
                {generatedImages.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {generatedImages.map((image, index) => (
                      <div 
                        key={image.id} 
                        className="cursor-pointer"
                        onClick={() => openImageViewer(index)}
                      >
                        <GeneratedImage
                          imageUrl={image.imageUrl}
                          prompt={image.prompt}
                          onDownload={() => handleDownloadImage(image.imageUrl, image.prompt)}
                          onShare={() => handleShareImage(image.imageUrl, image.prompt)}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-8 border border-gray-200 rounded-lg bg-gray-50">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No images generated yet</h3>
                    <p className="text-gray-600">
                      Use the form to create your first AI-generated image of {actor.name}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="bg-white shadow rounded-lg p-8 max-w-md mx-auto">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h2 className="text-xl font-medium text-gray-900 mb-2">Actor Not Available</h2>
              <p className="text-gray-600 mb-6">
                The AI actor you're trying to access is not available or not ready for image generation.
              </p>
              <Link
                to="/dashboard"
                className="touch-target w-full inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 min-h-[44px]"
              >
                Return to Dashboard
              </Link>
            </div>
          </div>
        )}
        
        {/* Image Viewer Modal */}
        {generatedImages.length > 0 && activeImageIndex !== null && (
          <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4">
            <div className="relative w-full max-w-3xl">
              {/* Close button */}
              <button 
                onClick={closeImageViewer}
                className="absolute top-0 right-0 -mt-12 -mr-4 text-white p-2 touch-target z-10 min-h-[44px] min-w-[44px]"
                aria-label="Close image viewer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              
              {/* Image */}
              <div className="relative">
                <img 
                  src={generatedImages[activeImageIndex].imageUrl} 
                  alt={generatedImages[activeImageIndex].prompt}
                  className="max-h-[80vh] mx-auto object-contain"
                />
                
                {/* Navigation buttons */}
                <button 
                  onClick={prevImage}
                  className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-r touch-target min-h-[44px] min-w-[44px]"
                  aria-label="Previous image"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                
                <button 
                  onClick={nextImage}
                  className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-l touch-target min-h-[44px] min-w-[44px]"
                  aria-label="Next image"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              
              {/* Image information */}
              <div className="text-white mt-4 max-w-2xl mx-auto">
                <p className="text-sm break-words">{generatedImages[activeImageIndex].prompt}</p>
                <div className="mt-2 flex justify-between items-center">
                  <span className="text-sm text-gray-300">
                    {activeImageIndex + 1} / {generatedImages.length}
                  </span>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleDownloadImage(
                        generatedImages[activeImageIndex].imageUrl,
                        generatedImages[activeImageIndex].prompt
                      )}
                      className="touch-target inline-flex items-center px-3 py-1 bg-white text-black rounded-md text-sm min-h-[44px]"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                      Download
                    </button>
                    <button
                      onClick={() => handleShareImage(
                        generatedImages[activeImageIndex].imageUrl,
                        generatedImages[activeImageIndex].prompt
                      )}
                      className="touch-target inline-flex items-center px-3 py-1 bg-white text-black rounded-md text-sm min-h-[44px]"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                      </svg>
                      Share
                    </button>
                  </div>
                </div>
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
            to={`/actors/${actorId}`}
            className="flex flex-col items-center justify-center min-w-[64px] min-h-[44px] touch-target text-gray-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
            </svg>
            <span className="text-xs mt-1">Details</span>
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
        </div>
        
        {/* Pull to refresh info - visible only on initial page load */}
        {!loading && generatedImages.length > 0 && (
          <div className="mt-6 text-center text-sm text-gray-500 sm:hidden">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block mr-1 animate-bounce" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Pull down to refresh
          </div>
        )}
        
        {/* Space at bottom to allow for fixed mobile navigation */}
        <div className="sm:hidden h-16"></div>
      </main>
      </PullToRefresh>
    </div>
  );
}

export default GeneratePage;