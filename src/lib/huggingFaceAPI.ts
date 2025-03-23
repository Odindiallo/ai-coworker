/**
 * Hugging Face API Integration - GitHub Pages Demo Version
 * 
 * This module provides a mock implementation for GitHub Pages deployment
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
 * Generate an image using the Hugging Face API and a fine-tuned model - Mock implementation for GitHub Pages
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
  // Log the parameters for the GitHub Pages demo
  console.log('Demo Mode: Using mock implementation for GitHub Pages deployment');
  console.log('Would have called Hugging Face API with:', {
    modelId,
    prompt,
    settings,
    isMobile
  });
  
  // Create a simple canvas with text to return as a mock image
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = settings.width || (isMobile ? MOBILE_SETTINGS.width : DEFAULT_SETTINGS.width);
  canvas.height = settings.height || (isMobile ? MOBILE_SETTINGS.height : DEFAULT_SETTINGS.height);
  
  if (ctx) {
    // Fill with a gradient
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#f0f0f0');
    gradient.addColorStop(1, '#d0d0d0');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add text for the prompt
    ctx.fillStyle = '#333';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Demo Mode: GitHub Pages', canvas.width / 2, 40);
    ctx.fillText('Model: ' + modelId.substring(0, 30), canvas.width / 2, 80);
    ctx.fillText('Prompt: ' + prompt.substring(0, 30) + (prompt.length > 30 ? '...' : ''), 
                canvas.width / 2, 120);
  }
  
  // Convert to base64 and return
  const base64Image = canvas.toDataURL('image/png');
  
  // Generate a deterministic seed from the prompt for reproducibility in demo mode
  const seed = prompt.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  return {
    image: base64Image,
    seed
  };
}

/**
 * Check if a Hugging Face model is ready for inference - Mock implementation for GitHub Pages
 * 
 * @param modelId Hugging Face model ID to check
 * @returns Promise that resolves to boolean indicating if model is ready
 */
export async function checkModelStatus(modelId: string): Promise<{
  isReady: boolean;
  estimatedTime?: number;
}> {
  console.log('Demo Mode: Using mock implementation for GitHub Pages deployment');
  console.log('Would have checked status for model:', modelId);
  
  // In GitHub Pages demo, always return that the model is ready
  return { isReady: true };
}

export default {
  generateImage,
  checkModelStatus,
  DEFAULT_SETTINGS,
  MOBILE_SETTINGS
};
