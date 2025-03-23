import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { firestore, storage } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { triggerHapticFeedback } from '../lib/hapticFeedback';
import { generateImage, checkModelStatus, MOBILE_SETTINGS } from '../lib/huggingFaceAPI';
import PromptForm from '../components/image-generation/PromptForm';
import MobileErrorHandler from '../components/ui/MobileErrorHandler';
import ResponsiveImage from '../components/ui/ResponsiveImage';
import HapticButton from '../components/ui/HapticButton';
import { getOptimizationSettings } from '../lib/bundleOptimizer';

// Define UI states for image generation
type GenerationStatus = 'idle' | 'checking' | 'generating' | 'completed' | 'error';

// Suggested prompts to help users
const SUGGESTED_PROMPTS = [
  "A professional headshot with a white background",
  "A photo of the person hiking in a forest",
  "A cinematic portrait in low light",
  "A casual photo at a beach during sunset",
  "A formal portrait in business attire"
];

/**
 * Page for generating new images of an AI actor
 */
const GenerateImagePage: React.FC = () => {
  const { actorId } = useParams<{ actorId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  // States
  const [actor, setActor] = useState<any>(null);
  const [status, setStatus] = useState<GenerationStatus>('idle');
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isModelReady, setIsModelReady] = useState<boolean>(false);
  const [estimatedTime, setEstimatedTime] = useState<number | null>(null);
  const [generatedImages, setGeneratedImages] = useState<any[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Load actor data
  useEffect(() => {
    if (!actorId || !currentUser) return;
    
    const fetchActor = async () => {
      try {
        const actorRef = doc(firestore, 'actors', actorId);
        const actorSnap = await getDoc(actorRef);
        
        if (!actorSnap.exists()) {
          setError(new Error('Actor not found'));
          return;
        }
        
        // Check if the actor belongs to the current user
        const actorData = actorSnap.data();
        if (actorData.userId !== currentUser.uid) {
          setError(new Error('You do not have permission to access this actor'));
          return;
        }
        
        // Check if the actor model is ready
        if (actorData.modelStatus !== 'completed') {
          setError(new Error('This actor is not ready for image generation yet'));
          return;
        }
        
        // Set actor data
        setActor(actorData);
        
        // Check if model is ready on Hugging Face
        await checkActorModelStatus(actorData.modelId);
        
        // Fetch previously generated images
        const generationsRef = collection(firestore, 'actors', actorId, 'generations');
        const generationsSnap = await getDoc(generationsRef);
        if (generationsSnap.exists()) {
          setGeneratedImages(generationsSnap.data().images || []);
        }
      } catch (err) {
        console.error('Error fetching actor:', err);
        setError(err instanceof Error ? err : new Error('Failed to load actor data'));
      }
    };
    
    fetchActor();
  }, [actorId, currentUser]);
  
  // Check network status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // Check if the actor model is ready on Hugging Face
  const checkActorModelStatus = async (modelId: string) => {
    setStatus('checking');
    
    try {
      const result = await checkModelStatus(modelId);
      
      if (result.isReady) {
        setIsModelReady(true);
        setStatus('idle');
      } else {
        setIsModelReady(false);
        if (result.estimatedTime) {
          setEstimatedTime(result.estimatedTime);
        }
        setStatus('idle');
      }
    } catch (err) {
      console.error('Error checking model status:', err);
      setError(err instanceof Error ? err : new Error('Failed to check model status'));
      setStatus('error');
    }
  };
  
  // Handle image generation
  const handleGenerateImage = async (prompt: string) => {
    if (!actor || !isModelReady || !isOnline) return;
    
    setStatus('generating');
    setError(null);
    
    try {
      // Provide haptic feedback
      triggerHapticFeedback('BUTTON_PRESS');
      
      // Check if we should use mobile-optimized settings
      const optimizationSettings = getOptimizationSettings();
      const isMobile = window.innerWidth < 768 || optimizationSettings.reduceRenderQuality;
      
      // Generate the image using the Hugging Face API
      const result = await generateImage(
        prompt,
        actor.modelId,
        {}, // Use default settings
        isMobile // Pass device info for optimization
      );
      
      // Upload the generated image to Firebase Storage
      const imageId = Date.now().toString();
      const storageRef = ref(storage, `users/${currentUser!.uid}/actors/${actorId}/generations/${imageId}.jpg`);
      
      // Remove the data:image/jpeg;base64, prefix
      const base64Image = result.image.split(',')[1];
      
      // Upload the image
      await uploadString(storageRef, base64Image, 'base64');
      
      // Get the download URL
      const downloadURL = await getDownloadURL(storageRef);
      
      // Store the generation in Firestore
      const generationRef = collection(firestore, 'actors', actorId, 'generations');
      await addDoc(generationRef, {
        prompt,
        imageUrl: downloadURL,
        seed: result.seed,
        createdAt: serverTimestamp(),
        userId: currentUser!.uid
      });
      
      // Update state with the new image
      setGeneratedImageUrl(downloadURL);
      setGeneratedImages([
        {
          id: imageId,
          prompt,
          imageUrl: downloadURL,
          createdAt: new Date()
        },
        ...generatedImages
      ]);
      
      // Success haptic feedback
      triggerHapticFeedback('SUCCESS');
      
      // Update status
      setStatus('completed');
    } catch (err) {
      console.error('Error generating image:', err);
      setError(err instanceof Error ? err : new Error('Failed to generate image'));
      setStatus('error');
      
      // Error haptic feedback
      triggerHapticFeedback('ERROR');
    }
  };
  
  // Handle sharing a generated image
  const handleShareImage = async (imageUrl: string, prompt: string) => {
    if (!imageUrl) return;
    
    try {
      // Check if Web Share API is available
      if (navigator.share) {
        await navigator.share({
          title: 'AI Generated Image',
          text: `Check out this AI-generated image: "${prompt}"`,
          url: imageUrl
        });
        
        // Success haptic feedback
        triggerHapticFeedback('SUCCESS');
      } else {
        // Fallback for browsers that don't support sharing
        navigator.clipboard.writeText(imageUrl);
        alert('Image URL copied to clipboard!');
      }
    } catch (err) {
      console.error('Error sharing image:', err);
    }
  };
  
  // Handle downloading a generated image
  const handleDownloadImage = async (imageUrl: string, prompt: string) => {
    if (!imageUrl) return;
    
    try {
      // Create a link element
      const link = document.createElement('a');
      
      // Set link properties
      link.href = imageUrl;
      link.download = `ai-generated-${Date.now()}.jpg`;
      
      // Append the link to the document
      document.body.appendChild(link);
      
      // Trigger the download
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      
      // Success haptic feedback
      triggerHapticFeedback('SUCCESS');
    } catch (err) {
      console.error('Error downloading image:', err);
    }
  };
  
  // If actor is not loaded yet, show loading state
  if (!actor && !error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center">
            <button
              onClick={() => navigate(-1)}
              className="mr-4 touch-target min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl font-bold text-primary-600">Generate Images</h1>
          </div>
        </header>
        
        <div className="flex flex-col items-center justify-center flex-1 p-6">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-primary-600 rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600">Loading actor data...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center">
          <button
            onClick={() => navigate(-1)}
            className="mr-4 touch-target min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-primary-600">Generate Images</h1>
        </div>
      </header>
      
      <main className="max-w-4xl mx-auto px-4 py-6 flex-1">
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
                  You're currently offline. Image generation requires an internet connection.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Error display */}
        {error && (
          <MobileErrorHandler
            error={error}
            title="Generation Error"
            actions={[
              {
                label: 'Try Again',
                onClick: () => {
                  setError(null);
                  setStatus('idle');
                },
                primary: true
              },
              {
                label: 'Go Back',
                onClick: () => navigate(-1)
              }
            ]}
            showConnectionStatus
          />
        )}
        
        {/* Model not ready warning */}
        {!isModelReady && !error && (
          <div className="mb-6 bg-blue-50 border-l-4 border-blue-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  The AI model is currently warming up. 
                  {estimatedTime ? ` It should be ready in about ${Math.ceil(estimatedTime)} seconds.` : ' Please try again in a moment.'}
                </p>
                <div className="mt-3">
                  <HapticButton
                    onClick={() => checkActorModelStatus(actor.modelId)}
                    variant="outline"
                    size="sm"
                    disabled={status === 'checking'}
                  >
                    {status === 'checking' ? 'Checking...' : 'Check Again'}
                  </HapticButton>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Actor info */}
        {actor && (
          <div className="mb-6 bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="flex items-center">
              {actor.imageRefs && actor.imageRefs[0] && (
                <div className="flex-shrink-0 mr-4">
                  <img
                    src={actor.imageRefs[0].url}
                    alt={actor.name}
                    className="h-16 w-16 object-cover rounded-full"
                  />
                </div>
              )}
              <div>
                <h2 className="text-lg font-medium text-gray-900">{actor.name}</h2>
                <p className="text-sm text-gray-500">
                  {actor.modelStatus === 'completed' ? 'Ready to generate images' : 'Model training in progress'}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Prompt form */}
        {actor && isModelReady && isOnline && (
          <PromptForm
            onSubmit={handleGenerateImage}
            isGenerating={status === 'generating'}
            suggestedPrompts={SUGGESTED_PROMPTS}
          />
        )}
        
        {/* Generation in progress */}
        {status === 'generating' && (
          <div className="mt-6 bg-white rounded-lg shadow-sm p-6 border border-gray-200 text-center">
            <div className="w-16 h-16 border-4 border-gray-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Generating your image</h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Our AI is creating a unique image based on your prompt. This typically takes 10-20 seconds.
            </p>
          </div>
        )}
        
        {/* Generated image display */}
        {status === 'completed' && generatedImageUrl && (
          <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="relative aspect-square">
              <ResponsiveImage
                src={generatedImageUrl}
                alt="Generated image"
                className="w-full h-full"
                placeholder="blur"
              />
            </div>
            <div className="p-4">
              <div className="flex justify-between space-x-2">
                <HapticButton
                  onClick={() => handleShareImage(generatedImageUrl, '')}
                  variant="outline"
                  className="flex-1"
                  icon={
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                    </svg>
                  }
                >
                  Share
                </HapticButton>
                <HapticButton
                  onClick={() => handleDownloadImage(generatedImageUrl, '')}
                  variant="outline"
                  className="flex-1"
                  icon={
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  }
                >
                  Download
                </HapticButton>
              </div>
            </div>
          </div>
        )}
        
        {/* Previously generated images */}
        {generatedImages.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Previously Generated Images</h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {generatedImages.map((image) => (
                <div key={image.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div className="aspect-square relative">
                    <ResponsiveImage
                      src={image.imageUrl}
                      alt="Generated image"
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-3">
                    <p className="text-xs text-gray-500 truncate">
                      {new Date(image.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Help tips */}
        <div className="mt-8 bg-blue-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-800 mb-2">Tips for better results</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Be specific about settings, clothing, and poses</li>
            <li>• Add details about lighting and camera angles</li>
            <li>• Mention specific styles like "portrait" or "cinematic"</li>
            <li>• Describe the background or scene in detail</li>
          </ul>
        </div>
      </main>
      
      {/* Mobile bottom spacing for fixed nav */}
      <div className="h-16 sm:hidden"></div>
    </div>
  );
};

export default GenerateImagePage;
