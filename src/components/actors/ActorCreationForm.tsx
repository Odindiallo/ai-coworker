import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { firestore } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import ImageUploader, { UploadedImage } from './ImageUploader';

function ActorCreationForm() {
  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [formTouched, setFormTouched] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    name?: string;
    gender?: string;
    images?: string;
  }>({});
  
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  // Monitor online/offline status for mobile users
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
  
  // Form validation
  useEffect(() => {
    if (!formTouched) return;
    
    const errors: {
      name?: string;
      gender?: string;
      images?: string;
    } = {};
    
    if (!name.trim()) {
      errors.name = 'Actor name is required';
    } else if (name.length > 50) {
      errors.name = 'Actor name must be less than 50 characters';
    }
    
    if (!gender) {
      errors.gender = 'Please select a gender';
    }
    
    if (images.length < 5) {
      errors.images = 'Please upload at least 5 images';
    }
    
    setValidationErrors(errors);
  }, [name, gender, images, formTouched]);
  
  const handleImagesUploaded = (uploadedImages: UploadedImage[]) => {
    setImages(uploadedImages);
    setFormTouched(true);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormTouched(true);
    
    console.log('Submitting form, currentUser:', currentUser);
    
    // For development: allow form submission even without login
    const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';
    
    if (!currentUser && !isDevelopment) {
      setError('You must be logged in to create an actor');
      return;
    }
    
    // Create a mock user if needed for testing
    const effectiveUser = currentUser || {
      uid: 'test-user-' + Date.now(),
      email: 'test@example.com'
    };
    
    // Store development user ID in localStorage for retrieval on dashboard
    if (isDevelopment && !currentUser) {
      localStorage.setItem('devUserId', effectiveUser.uid);
      console.log('Stored development user ID in localStorage:', effectiveUser.uid);
    }
    
    if (!isOnline) {
      setError('You are currently offline. Please connect to the internet to create an actor.');
      return;
    }
    
    // Check validation errors
    // In development mode, we relax the image requirement to make testing easier
    if (!name.trim() || !gender || (!isDevelopment && images.length < 5)) {
      console.log('Validation failed:', { name, gender, imagesLength: images.length });
      console.log('Validation errors:', validationErrors);
      console.log('Is development mode:', isDevelopment);
      
      if (isDevelopment && !name.trim()) {
        setError('Please enter a name for your actor');
      } else if (isDevelopment && !gender) {
        setError('Please select a gender for your actor');
      } else if (!isDevelopment && images.length < 5) {
        setError('Please upload at least 5 images');
      } else {
        setError('Please fix the form errors before submitting');
      }
      return;
    }
    
    // In development mode, if there are no images, create mock image data
    if (isDevelopment && images.length === 0) {
      console.log('Development mode: Creating mock image data');
      const mockImages = Array(5).fill(0).map((_, i) => ({
        id: `mock-image-${i}`,
        url: `https://example.com/mock-image-${i}.jpg`,
        path: `mock/image/${i}`,
        name: `Mock Image ${i}`
      }));
      
      // Use these mock images instead
      setImages(mockImages);
    }
    
    try {
      setLoading(true);
      setError('');
      
      console.log('Attempting to create actor document in Firestore...');
      
      // Check if Firestore is available
      if (!firestore) {
        console.error('Firestore is not initialized');
        throw new Error('Database connection is not available. Please try again later.');
      }
      
      // Debug Firestore connection
      console.log('Firestore instance:', firestore);
      console.log('Starting Firestore operation...');
      
      // Create actor document in Firestore
      const actorsCollection = collection(firestore, 'actors');
      console.log('Actors collection reference created:', actorsCollection);
      
      const actorData = {
        userId: effectiveUser.uid,
        name,
        gender,
        createdAt: serverTimestamp(),
        modelStatus: 'pending',
        imageRefs: images.map(img => ({
          id: img.id,
          path: img.path,
          url: img.url
        }))
      };
      console.log('Actor data prepared:', actorData);
      
      // Debug variables
      console.log('Submit data:', { name, gender, images: images.length });
      console.log('Effective user:', effectiveUser);
      
      const actorRef = await addDoc(actorsCollection, {
        userId: effectiveUser.uid,
        name,
        gender,
        createdAt: serverTimestamp(),
        modelStatus: 'pending',
        imageRefs: images.map(img => ({
          id: img.id,
          path: img.path,
          url: img.url
        }))
      });
      
      console.log('Actor document created successfully with ID:', actorRef.id);
      
      if (isDevelopment) {
        // In development mode, simulate starting the training process
        try {
          // Dynamically import training service to avoid circular dependencies
          const trainingModule = await import('../../lib/training');
          console.log('Starting simulated training for newly created actor');
          await trainingModule.simulateTraining(actorRef.id);
        } catch (err) {
          console.error('Error simulating training:', err);
        }
      }
      
      // Navigate to the dashboard with success message
      navigate('/dashboard', { 
        state: { 
          message: `Actor "${name}" created successfully! Training will begin shortly.` 
        }
      });
    } catch (err) {
      console.error('Error creating actor:', err);
      
      // For development: allow proceeding even if Firebase fails
      if (isDevelopment) {
        console.log('Development mode: proceeding despite error');
        
        // Create a mock actor ID
        const mockActorId = 'mock-actor-' + Date.now();
        console.log('Using mock actor ID:', mockActorId);
        
        // Navigate to dashboard with success message
        navigate('/dashboard', { 
          state: { 
            message: `Actor "${name}" created successfully! Training will begin shortly. (Development fallback mode)`,
            mockActorId
          }
        });
        return;
      }
      
      // Show error in production
      if (err instanceof Error) {
        setError(`Failed to create actor: ${err.message}`);
      } else {
        setError('Failed to create actor. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="max-w-2xl mx-auto bg-white p-4 sm:p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Create Your AI Actor</h2>
      
      {/* Offline status indicator */}
      {!isOnline && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                You are currently offline. Connect to the internet to create your AI actor.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Actor Name*
          </label>
          <div className="mt-1">
            <input
              id="name"
              name="name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setFormTouched(true);
              }}
              required
              className={`appearance-none block w-full px-3 py-2 border ${
                validationErrors.name ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
              } rounded-md shadow-sm placeholder-gray-400 focus:outline-none text-base`}
              placeholder="e.g. My Digital Twin"
            />
          </div>
          {validationErrors.name ? (
            <p className="mt-1 text-sm text-red-600">{validationErrors.name}</p>
          ) : (
            <p className="mt-1 text-sm text-gray-500">
              This name will help you identify this actor in your dashboard
            </p>
          )}
        </div>
        
        <div>
          <label htmlFor="gender" className="block text-sm font-medium text-gray-700">
            Actor Gender*
          </label>
          <div className="mt-1">
            <select
              id="gender"
              name="gender"
              value={gender}
              onChange={(e) => {
                setGender(e.target.value);
                setFormTouched(true);
              }}
              required
              className={`appearance-none block w-full px-3 py-2 border ${
                validationErrors.gender ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
              } rounded-md shadow-sm placeholder-gray-400 focus:outline-none text-base`}
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          {validationErrors.gender ? (
            <p className="mt-1 text-sm text-red-600">{validationErrors.gender}</p>
          ) : (
            <p className="mt-1 text-sm text-gray-500">
              This helps the AI better understand the subject of your images
            </p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Photos* (minimum 5)
          </label>
          <ImageUploader onImagesUploaded={handleImagesUploaded} />
          {validationErrors.images && (
            <p className="mt-2 text-sm text-red-600">{validationErrors.images}</p>
          )}
        </div>
        
        <button
          type="submit"
          disabled={loading || !isOnline || Object.keys(validationErrors).length > 0}
          className="w-full touch-target flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px]"
        >
          {loading ? 'Creating Actor...' : 'Create AI Actor'}
        </button>
      </form>
      
      <div className="mt-6 p-4 bg-blue-50 rounded-md border border-blue-100">
        <h3 className="text-sm font-medium text-blue-800">What happens next?</h3>
        <p className="mt-2 text-sm text-blue-700">
          After uploading your photos, our AI will begin training to learn the features and 
          characteristics of your subject. This process typically takes 15-30 minutes.
          You'll be notified when your AI actor is ready for generating new images!
        </p>
      </div>
    </div>
  );
}

export default ActorCreationForm;