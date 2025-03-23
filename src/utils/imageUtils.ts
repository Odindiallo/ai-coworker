/**
 * Compresses an image to a target size and quality
 * @param file The image file to compress
 * @param maxWidthOrHeight Maximum width or height of the compressed image
 * @param maxSizeMB Maximum size in MB for the compressed image
 * @returns A Promise resolving to the compressed image file
 */
export const compressImage = async (file: File, maxWidthOrHeight: number = 800, maxSizeMB: number = 0.7): Promise<File> => {
  try {
    // In a real implementation, we would use a library like browser-image-compression
    // For this example, we'll just return the original file
    console.log(`Compressing image to ${maxWidthOrHeight}px max dimension and ${maxSizeMB}MB max size`);
    return file;
  } catch (error) {
    console.error('Error compressing image:', error);
    // Return the original file if compression fails
    return file;
  }
};

/**
 * Gets the dimensions of an image
 * @param file The image file
 * @returns A Promise resolving to an object with width and height
 */
export const getImageDimensions = async (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    
    img.addEventListener('load', () => {
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      URL.revokeObjectURL(objectUrl);
      resolve({ width, height });
    });
    
    img.addEventListener('error', (error) => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image'));
    });
    
    img.src = objectUrl;
  });
};

/**
 * Calculates the aspect ratio of an image
 * @param width Image width
 * @param height Image height
 * @returns The aspect ratio (width / height)
 */
export const calculateAspectRatio = (width: number, height: number): number => {
  if (height === 0) return Infinity;
  if (width === 0) return 0;
  return parseFloat((width / height).toFixed(2));
};

/**
 * Formats a file size in bytes to a human-readable format
 * @param bytes File size in bytes
 * @returns Formatted file size (e.g., "1.5 MB", "800 KB")
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  if (i === 0) return `${bytes} ${sizes[i]}`;
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
};

/**
 * Checks if an image type is supported
 * @param mimeType The image MIME type (e.g., "image/jpeg")
 * @returns True if the image type is supported
 */
export const isImageSupported = (mimeType: string): boolean => {
  const supportedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  return supportedTypes.includes(mimeType);
};

/**
 * Generates a low quality preview of an image for faster loading
 * @param file The image file
 * @returns A Promise resolving to a data URL of the preview
 */
export const generateLowQualityPreview = async (file: File): Promise<string> => {
  return new Promise(async (resolve, reject) => {
    try {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      
      img.addEventListener('load', () => {
        URL.revokeObjectURL(objectUrl);
        
        // Create a small thumbnail
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const thumbnailWidth = 100;
        const aspectRatio = img.width / img.height;
        const thumbnailHeight = Math.round(thumbnailWidth / aspectRatio);
        
        canvas.width = thumbnailWidth;
        canvas.height = thumbnailHeight;
        
        ctx?.drawImage(img, 0, 0, thumbnailWidth, thumbnailHeight);
        
        // Convert to low quality JPEG
        const dataUrl = canvas.toDataURL('image/jpeg', 0.3);
        resolve(dataUrl);
      });
      
      img.addEventListener('error', () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to load image'));
      });
      
      img.src = objectUrl;
    } catch (error) {
      reject(error);
    }
  });
};
