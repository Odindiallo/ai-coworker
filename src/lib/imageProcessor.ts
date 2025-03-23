/**
 * Image Processor
 * 
 * This utility provides functions for processing images before upload
 * and during display, including compression, resizing, and format conversion.
 */

// Enumerate supported image formats
export enum ImageFormat {
  JPEG = 'image/jpeg',
  PNG = 'image/png',
  WEBP = 'image/webp',
  AVIF = 'image/avif'
}

// Processing options interface
export interface ImageProcessingOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: ImageFormat;
  preserveExif?: boolean;
}

// Default processing options
const DEFAULT_OPTIONS: ImageProcessingOptions = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.85,
  format: ImageFormat.WEBP,
  preserveExif: false
};

/**
 * Process an image file with compression and resizing
 * 
 * @param file Input image file
 * @param options Processing options
 * @returns Promise with processed image as Blob/File
 */
export const processImage = async (
  file: File,
  options: ImageProcessingOptions = DEFAULT_OPTIONS
): Promise<File> => {
  // Merge options with defaults
  const settings = { ...DEFAULT_OPTIONS, ...options };
  
  return new Promise((resolve, reject) => {
    try {
      // Create image element to load the file
      const img = new Image();
      const url = URL.createObjectURL(file);
      
      img.onload = () => {
        try {
          // Calculate dimensions while maintaining aspect ratio
          let { width, height } = img;
          
          if (width > settings.maxWidth) {
            height = Math.round(height * (settings.maxWidth / width));
            width = settings.maxWidth;
          }
          
          if (height > settings.maxHeight) {
            width = Math.round(width * (settings.maxHeight / height));
            height = settings.maxHeight;
          }
          
          // Create canvas for resizing and processing
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          
          // Draw image to canvas
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert to the desired format
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to process image'));
                return;
              }
              
              // Create a new File from the blob
              const processedFile = new File(
                [blob],
                file.name.replace(/\.[^/.]+$/, '') + getExtensionForFormat(settings.format),
                { type: settings.format }
              );
              
              resolve(processedFile);
            },
            settings.format,
            settings.quality
          );
        } catch (err) {
          reject(err);
        } finally {
          // Clean up object URL
          URL.revokeObjectURL(url);
        }
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };
      
      // Start loading the image
      img.src = url;
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Process multiple images in batch
 * 
 * @param files Array of image files to process
 * @param options Processing options
 * @returns Promise with array of processed files
 */
export const batchProcessImages = async (
  files: File[],
  options: ImageProcessingOptions = DEFAULT_OPTIONS
): Promise<File[]> => {
  const promises = files.map(file => processImage(file, options));
  return Promise.all(promises);
};

/**
 * Create a thumbnail of an image
 * 
 * @param file Input image file
 * @param size Thumbnail size (square)
 * @param options Processing options
 * @returns Promise with thumbnail as Blob/File
 */
export const createThumbnail = async (
  file: File,
  size: number = 150,
  options: Partial<ImageProcessingOptions> = {}
): Promise<File> => {
  // Override options for thumbnail
  const thumbnailOptions: ImageProcessingOptions = {
    ...DEFAULT_OPTIONS,
    ...options,
    maxWidth: size,
    maxHeight: size,
    quality: 0.7, // Lower quality for thumbnails is acceptable
    format: ImageFormat.WEBP // WebP is ideal for thumbnails
  };
  
  return processImage(file, thumbnailOptions);
};

/**
 * Get the appropriate file extension for an image format
 * 
 * @param format Image format
 * @returns File extension string including the dot
 */
export const getExtensionForFormat = (format: ImageFormat): string => {
  switch (format) {
    case ImageFormat.JPEG:
      return '.jpg';
    case ImageFormat.PNG:
      return '.png';
    case ImageFormat.WEBP:
      return '.webp';
    case ImageFormat.AVIF:
      return '.avif';
    default:
      return '.jpg';
  }
};

/**
 * Extract image dimensions from a file
 * 
 * @param file Image file
 * @returns Promise with width and height
 */
export const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      resolve({
        width: img.width,
        height: img.height
      });
      URL.revokeObjectURL(url);
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
      URL.revokeObjectURL(url);
    };
    
    img.src = url;
  });
};

/**
 * Create a blurhash placeholder for an image
 * (Simplified version, a real implementation would use the blurhash algorithm)
 * 
 * @param file Image file
 * @returns Promise with a low resolution placeholder as data URL
 */
export const createPlaceholder = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      const img = new Image();
      const url = URL.createObjectURL(file);
      
      img.onload = () => {
        try {
          // Create tiny thumbnail for placeholder
          const canvas = document.createElement('canvas');
          canvas.width = 20;
          canvas.height = Math.round(20 * (img.height / img.width));
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          // Create data URL
          const placeholderUrl = canvas.toDataURL('image/jpeg', 0.5);
          resolve(placeholderUrl);
        } catch (err) {
          reject(err);
        } finally {
          URL.revokeObjectURL(url);
        }
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };
      
      img.src = url;
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Create a placeholder image data URL for lazy loading
 * 
 * @param width Width of the placeholder
 * @param height Height of the placeholder
 * @param color Background color (default light gray)
 * @returns Data URL for a placeholder image
 */
export const createPlaceholderImage = (
  width: number = 100,
  height: number = 100,
  color: string = '#f1f5f9'
): string => {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    
    // Fill with color
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);
    
    // Draw image icon in the center
    ctx.fillStyle = '#9ca3af';
    ctx.beginPath();
    const iconSize = Math.min(width, height) * 0.5;
    const x = width / 2 - iconSize / 2;
    const y = height / 2 - iconSize / 2;
    
    // Simple image icon shape
    ctx.rect(x, y, iconSize, iconSize * 0.8);
    ctx.arc(x + iconSize * 0.25, y + iconSize * 0.25, iconSize * 0.1, 0, Math.PI * 2);
    ctx.fill();
    
    return canvas.toDataURL('image/png', 0.5);
  } catch (error) {
    console.error('Error creating placeholder image', error);
    // Return empty data URL on error
    return 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  }
};

/**
 * Check if the device camera is available
 * @returns Boolean indicating camera availability
 */
export const isCameraAvailable = (): boolean => {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
};

/**
 * Check if an image is suitable for AI model training
 * 
 * @param file Image file
 * @returns Promise with validation result and reason if invalid
 */
export const validateImageForAI = async (
  file: File
): Promise<{ valid: boolean; reason?: string }> => {
  try {
    // Check file size
    if (file.size > 10 * 1024 * 1024) {
      return {
        valid: false,
        reason: 'Image size exceeds 10MB limit'
      };
    }
    
    // Check dimensions
    const dimensions = await getImageDimensions(file);
    
    if (dimensions.width < 512 || dimensions.height < 512) {
      return {
        valid: false,
        reason: 'Image is too small (minimum 512x512px)'
      };
    }
    
    if (dimensions.width > 4096 || dimensions.height > 4096) {
      return {
        valid: false,
        reason: 'Image is too large (maximum 4096x4096px)'
      };
    }
    
    // Basic aspect ratio check
    const aspectRatio = dimensions.width / dimensions.height;
    if (aspectRatio < 0.5 || aspectRatio > 2) {
      return {
        valid: false,
        reason: 'Aspect ratio too extreme (should be between 0.5 and 2)'
      };
    }
    
    // All checks passed
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      reason: 'Failed to validate image: ' + error.message
    };
  }
};

export default {
  processImage,
  batchProcessImages,
  createThumbnail,
  getImageDimensions,
  createPlaceholder,
  createPlaceholderImage,
  isCameraAvailable,
  validateImageForAI,
  ImageFormat
};
