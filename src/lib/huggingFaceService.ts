/**
 * Hugging Face Service
 * 
 * This service provides interaction with Hugging Face's API for model inference and management.
 * It enables fine-tuning of Stable Diffusion models and image generation.
 */

const HUGGING_FACE_API_URL = 'https://api-inference.huggingface.co/models';
const HUGGING_FACE_TOKEN = import.meta.env.VITE_HUGGINGFACE_TOKEN;

// Define compatible model types for our application
export enum ModelType {
  TEXT_TO_IMAGE = 'text-to-image',
  IMAGE_TO_IMAGE = 'image-to-image',
  INPAINTING = 'inpainting',
  UPSCALING = 'upscaling'
}

// Define model information interface
export interface ModelInfo {
  id: string;
  name: string;
  description: string;
  type: ModelType;
  size: 'small' | 'medium' | 'large';
  specialization?: string;
  freeTier: boolean;
  recommendedFor?: string[];
  trainingCompatible: boolean;
  inferenceTime: 'fast' | 'medium' | 'slow';
}

// List of recommended models for AI actor creation
// These models were selected based on their compatibility with fine-tuning,
// performance on the free tier, and quality of results for portrait generation
export const RECOMMENDED_MODELS: ModelInfo[] = [
  {
    id: 'runwayml/stable-diffusion-v1-5',
    name: 'Stable Diffusion v1.5',
    description: 'The classic Stable Diffusion model, good balance of quality and speed',
    type: ModelType.TEXT_TO_IMAGE,
    size: 'medium',
    freeTier: true,
    recommendedFor: ['portraits', 'general use'],
    trainingCompatible: true,
    inferenceTime: 'medium'
  },
  {
    id: 'stabilityai/stable-diffusion-2-1',
    name: 'Stable Diffusion v2.1',
    description: 'Improved version with better image quality and prompt following',
    type: ModelType.TEXT_TO_IMAGE,
    size: 'medium',
    freeTier: true,
    recommendedFor: ['high quality', 'detailed images'],
    trainingCompatible: true,
    inferenceTime: 'medium'
  },
  {
    id: 'prompthero/openjourney',
    name: 'Openjourney',
    description: 'Fine-tuned Stable Diffusion with stylistic improvements',
    type: ModelType.TEXT_TO_IMAGE,
    size: 'medium',
    specialization: 'artistic',
    freeTier: true,
    recommendedFor: ['artistic portraits', 'creative styles'],
    trainingCompatible: true,
    inferenceTime: 'medium'
  },
  {
    id: 'dreamlike-art/dreamlike-photoreal-2.0',
    name: 'Dreamlike Photoreal 2.0',
    description: 'Realistic photo generation model based on Stable Diffusion',
    type: ModelType.TEXT_TO_IMAGE,
    size: 'large',
    specialization: 'photorealistic',
    freeTier: true,
    recommendedFor: ['photorealistic portraits'],
    trainingCompatible: true,
    inferenceTime: 'slow'
  },
  {
    id: 'nitrosocke/Nitro-Diffusion',
    name: 'Nitro Diffusion',
    description: 'Specialized model for stylized character portraits',
    type: ModelType.TEXT_TO_IMAGE,
    size: 'medium',
    specialization: 'characters',
    freeTier: true,
    recommendedFor: ['stylized characters', 'animations'],
    trainingCompatible: true,
    inferenceTime: 'medium'
  }
];

/**
 * Get the best model recommendation based on user preferences
 * 
 * @param preferences User preferences for model selection
 * @returns Recommended model
 */
export const getRecommendedModel = (preferences: {
  style?: 'realistic' | 'artistic' | 'stylized';
  quality?: 'fast' | 'balanced' | 'high';
  specialization?: string;
}): ModelInfo => {
  const { style, quality, specialization } = preferences;
  
  // Default to Stable Diffusion v1.5 if no preferences
  if (!style && !quality && !specialization) {
    return RECOMMENDED_MODELS[0];
  }
  
  // Score models based on preferences
  const scoredModels = RECOMMENDED_MODELS.map(model => {
    let score = 0;
    
    // Score based on style
    if (style === 'realistic' && model.specialization === 'photorealistic') {
      score += 5;
    } else if (style === 'artistic' && model.specialization === 'artistic') {
      score += 5;
    } else if (style === 'stylized' && model.specialization === 'characters') {
      score += 5;
    }
    
    // Score based on quality/speed preference
    if (quality === 'fast' && model.inferenceTime === 'fast') {
      score += 3;
    } else if (quality === 'balanced' && model.inferenceTime === 'medium') {
      score += 3;
    } else if (quality === 'high' && model.inferenceTime === 'slow') {
      score += 3;
    }
    
    // Score based on specialization
    if (specialization && model.recommendedFor?.includes(specialization)) {
      score += 4;
    }
    
    return { model, score };
  });
  
  // Sort by score and return the highest
  scoredModels.sort((a, b) => b.score - a.score);
  return scoredModels[0].model;
};

/**
 * Generate an image using a Hugging Face model
 * 
 * @param modelId Hugging Face model ID
 * @param prompt Text prompt for image generation
 * @param negativePrompt Optional negative prompt 
 * @param options Additional generation options
 * @returns Promise with the generated image as a blob
 */
export const generateImage = async (
  modelId: string,
  prompt: string,
  negativePrompt?: string,
  options: {
    width?: number;
    height?: number;
    numInferenceSteps?: number;
    guidanceScale?: number;
    seed?: number;
  } = {}
): Promise<Blob> => {
  // Set default options if not provided
  const defaultOptions = {
    width: 512,
    height: 512,
    numInferenceSteps: 50,
    guidanceScale: 7.5
  };
  
  const mergedOptions = { ...defaultOptions, ...options };
  
  // Prepare data for API request
  const requestData = {
    inputs: prompt,
    parameters: {
      negative_prompt: negativePrompt || '',
      ...mergedOptions
    }
  };
  
  try {
    // Make API request to Hugging Face
    const response = await fetch(`${HUGGING_FACE_API_URL}/${modelId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HUGGING_FACE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });
    
    // Check if the response is successful
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Hugging Face API error: ${error.error || 'Unknown error'}`);
    }
    
    // Return image blob
    return await response.blob();
  } catch (error) {
    console.error('Error generating image:', error);
    throw error;
  }
};

/**
 * Create a fine-tuning job for a model
 * 
 * @param baseModelId Base model ID to fine-tune
 * @param trainingData Training data (image URLs and captions)
 * @param options Fine-tuning options
 * @returns Promise with job ID and status URL
 */
export const createFineTuningJob = async (
  baseModelId: string,
  trainingData: Array<{ imageUrl: string; caption: string }>,
  options: {
    trainingSteps?: number;
    learningRate?: number;
    trainTextEncoder?: boolean;
    trainBatchSize?: number;
    outputModelName?: string;
  } = {}
): Promise<{ jobId: string; statusUrl: string }> => {
  // This is a simplified implementation
  // In a real implementation, this would interact with a custom Hugging Face API
  // or a backend service that manages fine-tuning jobs
  
  // For demonstration purposes, we'll return a mock result
  return {
    jobId: `ft-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    statusUrl: `https://huggingface.co/models/fine-tuning/status`
  };
};

/**
 * Check the status of a fine-tuning job
 * 
 * @param jobId Fine-tuning job ID
 * @returns Promise with job status
 */
export const getFineTuningStatus = async (
  jobId: string
): Promise<{
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress?: number;
  modelId?: string;
  error?: string;
}> => {
  // Mock implementation for demonstration
  // In a real implementation, this would query the actual job status
  
  // Simulate different statuses based on job ID
  const lastChar = jobId.slice(-1);
  const numValue = parseInt(lastChar, 36) % 4;
  
  switch (numValue) {
    case 0:
      return { status: 'pending' };
    case 1:
      return { 
        status: 'running',
        progress: Math.floor(Math.random() * 100)
      };
    case 2:
      return { 
        status: 'completed',
        progress: 100,
        modelId: `user/fine-tuned-${jobId}`
      };
    default:
      return { 
        status: 'failed',
        error: 'Insufficient training data or server error'
      };
  }
};

export default {
  RECOMMENDED_MODELS,
  getRecommendedModel,
  generateImage,
  createFineTuningJob,
  getFineTuningStatus,
  ModelType
};
