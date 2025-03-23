/**
 * Hugging Face API Integration
 * 
 * This module handles communication with Hugging Face for image generation
 */

// Default model settings for image generation
export const DEFAULT_SETTINGS = {
  steps: 30,              // Number of inference steps
  width: 768,             // Generated image width
  height: 768,            // Generated image height
  guidance_scale: 7.5,    // How closely to follow the prompt
  negative_prompt: "blurry, deformed, distorted, low quality",
  num_outputs: 1          // Number of images to generate
};

// Custom settings for mobile (reduced sizes to save bandwidth and processing)
export const MOBILE_SETTINGS = {
  ...DEFAULT_SETTINGS,
  width: 512,
  height: 512,
  steps: 25
};

interface GenerationSettings {
  steps?: number;
  width?: number;
  height?: number;
  guidance_scale?: number;
  negative_prompt?: string;
  num_outputs?: number;
}

interface ImageGenerationResult {
  image: string;  // Base64 encoded image
  seed: number;   // Seed used for generation (useful for reproducibility)
}

/**
 * Generate an image using the Hugging Face API and a fine-tuned model
 * 
 * @param prompt Text prompt to generate image from
 * @param modelId Hugging Face model ID to use (custom fine-tuned model)
 * @param settings Optional generation settings
 * @returns Promise with the generated image data
 */
export async function generateImage(
  prompt: string,
  modelId: string,
  settings: GenerationSettings = {},
  isMobile: boolean = false
): Promise<ImageGenerationResult> {
  // Choose appropriate settings based on device
  const baseSettings = isMobile ? MOBILE_SETTINGS : DEFAULT_SETTINGS;
  
  // Combine default settings with any custom settings
  const mergedSettings = {
    ...baseSettings,
    ...settings
  };
  
  // API endpoint for the model
  const endpoint = `https://api-inference.huggingface.co/models/${modelId}`;
  
  try {
    // Get API key from environment
    const apiKey = process.env.REACT_APP_HUGGINGFACE_API_KEY;
    
    if (!apiKey) {
      throw new Error('Hugging Face API key is missing');
    }
    
    // Prepare request payload
    const payload = {
      inputs: prompt,
      parameters: mergedSettings
    };
    
    // Make API request
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    // Check for HTTP errors
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Format error message based on response
      const errorMessage = errorData.error 
        ? `Hugging Face API error: ${errorData.error}` 
        : `Hugging Face API returned status ${response.status}`;
      
      throw new Error(errorMessage);
    }
    
    // Get image data
    const imageBlob = await response.blob();
    
    // Convert the blob to a base64 string
    const base64Image = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(imageBlob);
    });
    
    // Extract seed from response headers if available
    const seedHeader = response.headers.get('X-Seed');
    const seed = seedHeader ? parseInt(seedHeader, 10) : Math.floor(Math.random() * 2147483647);
    
    return {
      image: base64Image,
      seed
    };
  } catch (error) {
    console.error('Error generating image:', error);
    throw error;
  }
}

/**
 * Check if a Hugging Face model is ready for inference
 * 
 * @param modelId Hugging Face model ID to check
 * @returns Promise that resolves to boolean indicating if model is ready
 */
export async function checkModelStatus(modelId: string): Promise<{
  isReady: boolean;
  estimatedTime?: number;
}> {
  try {
    // Get API key from environment
    const apiKey = process.env.REACT_APP_HUGGINGFACE_API_KEY;
    
    if (!apiKey) {
      throw new Error('Hugging Face API key is missing');
    }
    
    // API endpoint for the model
    const endpoint = `https://api-inference.huggingface.co/models/${modelId}`;
    
    // Make a small test request to check status
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: "test",
        parameters: {
          ...MOBILE_SETTINGS,
          num_outputs: 1
        }
      })
    });
    
    // If we get a 200 response, the model is ready
    if (response.ok) {
      return { isReady: true };
    }
    
    // Check if the model is still loading
    const data = await response.json().catch(() => ({}));
    
    if (response.status === 503 && data.estimated_time) {
      return {
        isReady: false,
        estimatedTime: data.estimated_time
      };
    }
    
    // Something else is wrong
    return { isReady: false };
  } catch (error) {
    console.error('Error checking model status:', error);
    return { isReady: false };
  }
}

export default {
  generateImage,
  checkModelStatus,
  DEFAULT_SETTINGS,
  MOBILE_SETTINGS
};
