import { httpsCallable } from 'firebase/functions';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  serverTimestamp 
} from 'firebase/firestore';
import { functions, firestore } from './firebase';
import { GenerationSettings } from '../components/generation/PromptForm';

/**
 * Checks if the device is currently online
 * @returns boolean indicating online status
 */
const isOnline = (): boolean => {
  return navigator.onLine;
};

/**
 * Checks if the device is on a metered connection (like mobile data)
 * Note: This is not fully supported in all browsers
 * @returns boolean indicating if on metered connection, or undefined if cannot detect
 */
const isMeteredConnection = (): boolean | undefined => {
  if ('connection' in navigator && 'effectiveType' in navigator.connection) {
    const connection = navigator.connection as any;
    // 'slow-2g', '2g', '3g', or '4g'
    return ['slow-2g', '2g', '3g'].includes(connection.effectiveType);
  }
  return undefined;
};

/**
 * Generates an image for an AI actor
 * @param actorId The ID of the actor to generate an image for
 * @param prompt The text prompt for image generation
 * @param settings Additional generation settings
 * @returns A promise resolving to the generated image details
 */
export async function generateImage(actorId: string, prompt: string, settings: GenerationSettings) {
  // Check if online first
  if (!isOnline()) {
    throw new Error('Cannot generate images while offline. Please connect to the internet and try again.');
  }

  // Warn about metered connections
  const metered = isMeteredConnection();
  if (metered === true) {
    console.warn('Generating images on a metered connection (like mobile data). This may use significant data.');
  }
  
  // Check for development mode
  const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';
  if (isDevelopment) {
    console.log('Development mode: Using simulated image generation');
    return simulateGeneration(actorId, prompt, settings);
  }
  
  try {
    // Call the Firebase Function to generate the image
    const generateImageFn = httpsCallable(functions, 'generateImage');
    const result = await generateImageFn({
      actorId,
      prompt,
      negativePrompt: settings.negativePrompt,
      guidanceScale: settings.guidanceScale,
      numInferenceSteps: settings.numInferenceSteps
    });
    
    const generationResult = result.data as {
      id: string;
      imageUrl: string;
      prompt: string;
    };

    // Add the generated image to Firestore for history tracking
    try {
      await addDoc(collection(firestore, 'generatedImages'), {
        userId: (await firestore._getAuthToken()).uid,
        actorId,
        imageUrl: generationResult.imageUrl,
        prompt,
        settings,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Error saving generation to history:', err);
      // We don't throw here - generation was successful, just history saving failed
    }
    
    return generationResult;
  } catch (error: any) {
    console.error('Error generating image:', error);

    // Check for network error after initial connection
    if (!isOnline()) {
      throw new Error('Connection lost while generating image. Please check your connection and try again.');
    }

    // Provide more specific error messages based on error codes
    if (error.code === 'functions/resource-exhausted') {
      throw new Error('Generation limit reached. Please try again later when system resources are available.');
    } else if (error.code === 'functions/deadline-exceeded') {
      throw new Error('Image generation took too long. Please try a simpler prompt or try again later.');
    } else if (error.code === 'functions/invalid-argument') {
      throw new Error('Invalid generation parameters. Please check your prompt and settings.');
    } else {
      throw new Error(error.message || 'Failed to generate image. Please try again.');
    }
  }
}

/**
 * Gets all generated images for an actor
 * @param actorId The ID of the actor to get images for
 * @param limit Optional limit on number of images to fetch (default: 20)
 * @returns A promise resolving to the list of generated images
 */
export async function getGeneratedImages(actorId: string, limit = 20) {
  // Check if online first
  if (!isOnline()) {
    throw new Error('Cannot fetch generated images while offline. Please connect to the internet and try again.');
  }
  
  try {
    // Get the current user's ID safely
    const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';
    let userId;
    
    if (isDevelopment) {
      // In development mode, get from localStorage
      userId = localStorage.getItem('devUserId') || 'test-user';
      console.log('Using development user ID for fetching images:', userId);
    } else {
      // In production, try to get from auth
      try {
        userId = (await firestore._getAuthToken()).uid;
      } catch (authError) {
        console.error('Error getting auth token:', authError);
        throw new Error('Authentication error. Please sign in again.');
      }
    }
    
    // Create query options with error handling
    try {
      // Query for generated images from Firestore directly
      console.log(`Querying for images with actorId=${actorId} and userId=${userId}`);
      const imagesQuery = query(
        collection(firestore, 'generatedImages'),
        where('actorId', '==', actorId),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(imagesQuery);
      console.log(`Query returned ${querySnapshot.size} documents`);
      const images = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        images.push({
          id: doc.id,
          imageUrl: data.imageUrl,
          prompt: data.prompt,
          createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
          settings: data.settings || {}
        });
      });
      
      // In development mode, if no images are found, generate some mock ones
      if (isDevelopment && images.length === 0) {
        console.log('Development mode: Generating mock images since none were found');
        const mockImages = Array(5).fill(0).map((_, i) => ({
          id: `mock_img_${i}`,
          imageUrl: `https://picsum.photos/seed/${actorId}_${i}/512/512`,
          prompt: `Mock image ${i + 1} of ${actorId}`,
          createdAt: new Date(Date.now() - i * 3600000),
          settings: {}
        }));
        return { images: mockImages };
      }
      
      return { images: images.slice(0, limit) };
    } catch (queryError) {
      console.error('Error querying Firestore:', queryError);
      
      // In development mode, generate mock images on error
      if (isDevelopment) {
        console.log('Development mode: Generating mock images due to query error');
        const mockImages = Array(3).fill(0).map((_, i) => ({
          id: `fallback_img_${i}`,
          imageUrl: `https://picsum.photos/seed/fallback_${actorId}_${i}/512/512`,
          prompt: `Fallback image ${i + 1} due to query error`,
          createdAt: new Date(Date.now() - i * 3600000),
          settings: {}
        }));
        return { images: mockImages };
      }
      
      throw queryError;
    }
  } catch (error) {
    console.error('Error fetching generated images:', error);
    
    // Check for network error after initial connection
    if (!isOnline()) {
      throw new Error('Connection lost while fetching images. Please check your connection and try again.');
    }
    
    throw error;
  }
}

/**
 * Simulates image generation for development and testing
 * This is used when actual generation infrastructure is not available
 * 
 * @param actorId The ID of the actor to simulate generation for
 * @param prompt The text prompt for generation
 * @param settings The generation settings
 * @returns A promise that resolves to a simulated generation result
 */
export async function simulateGeneration(actorId: string, prompt: string, settings: GenerationSettings) {
  return new Promise<{
    id: string;
    imageUrl: string;
    prompt: string;
  }>((resolve) => {
    // Simulate network delay
    const delay = Math.random() * 2000 + 1000;
    
    setTimeout(() => {
      // Generate a random ID
      const id = `sim_${Math.random().toString(36).substring(2, 15)}`;
      
      // Use placeholder image URL
      const imageUrl = `https://picsum.photos/seed/${id}/512/512`;
      
      // Add the generated image to Firestore for history - with error handling for development mode
      try {
        const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';
        // Get user ID safely
        let userId = 'test-user';
        if (isDevelopment) {
          // In development mode, get from localStorage
          userId = localStorage.getItem('devUserId') || 'test-user';
          console.log('Using development user ID for generated image:', userId);
        }
        
        addDoc(collection(firestore, 'generatedImages'), {
          userId: userId,
          actorId,
          imageUrl,
          prompt,
          settings,
          createdAt: serverTimestamp()
        }).then(() => {
          console.log('Simulated image saved to Firestore successfully');
        }).catch(err => {
          console.error('Error saving simulated image to Firestore:', err);
        });
      } catch (err) {
        console.error('Error in simulateGeneration while storing to Firestore:', err);
      }
      
      resolve({
        id,
        imageUrl,
        prompt
      });
    }, delay);
  });
}

/**
 * Deletes a generated image
 * @param imageId The ID of the generated image to delete
 * @returns A promise that resolves when the image is deleted
 */
export async function deleteGeneratedImage(imageId: string) {
  // Check if online first
  if (!isOnline()) {
    throw new Error('Cannot delete image while offline. Please connect to the internet and try again.');
  }
  
  try {
    const deleteImageFn = httpsCallable(functions, 'deleteGeneratedImage');
    await deleteImageFn({ imageId });
    return { success: true };
  } catch (error) {
    console.error('Error deleting generated image:', error);
    
    // Check for network error after initial connection
    if (!isOnline()) {
      throw new Error('Connection lost while deleting image. Please check your connection and try again.');
    }
    
    throw error;
  }
}

/**
 * Optimizes the prompt for better generation results based on user's intent
 * @param prompt The original user prompt
 * @param actorName The name of the AI actor
 * @returns An optimized prompt with enhanced details
 */
export function optimizePrompt(prompt: string, actorName: string): string {
  // Simple prompt optimization
  let optimizedPrompt = prompt;
  
  // Ensure prompt starts with the actor's name if not already mentioned
  if (!prompt.toLowerCase().includes(actorName.toLowerCase())) {
    optimizedPrompt = `Photo of ${actorName}, ${prompt}`;
  }
  
  // Add quality enhancers if they don't exist in the prompt already
  const qualityTerms = [
    'high quality', 'detailed', 'professional', 'sharp', '4k', 'hd',
    'professional photo', 'high resolution'
  ];
  
  const hasQualityTerm = qualityTerms.some(term => 
    prompt.toLowerCase().includes(term.toLowerCase())
  );
  
  if (!hasQualityTerm) {
    optimizedPrompt += ', high quality, professional photo';
  }
  
  return optimizedPrompt;
}

/**
 * Generate appropriate negative prompts based on the positive prompt
 * @param positivePrompt The user's prompt for what they want to see
 * @returns A suggested negative prompt for what to avoid
 */
export function suggestNegativePrompt(positivePrompt: string): string {
  // Standard negative prompt to start with
  let negativePrompt = 'blurry, low quality, distorted face, deformed, disfigured, extra limbs, bad anatomy';
  
  // If the prompt mentions outdoor/nature scenes
  if (/outdoor|nature|landscape|forest|beach|mountain|garden|park|sky|cloud/i.test(positivePrompt)) {
    negativePrompt += ', oversaturated, unrealistic lighting';
  }
  
  // If the prompt seems to be about a professional/formal setting
  if (/professional|business|office|formal|suit|corporate|work/i.test(positivePrompt)) {
    negativePrompt += ', casual clothing, unprofessional setting';
  }
  
  // If the prompt is about a specific style
  if (/painting|drawing|sketch|cartoon|anime|3d|render|digital art/i.test(positivePrompt)) {
    negativePrompt += ', photorealistic, photograph';
  }
  
  return negativePrompt;
}
