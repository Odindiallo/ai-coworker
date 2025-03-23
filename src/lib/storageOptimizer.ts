/**
 * Firebase Storage Optimizer
 * 
 * This utility configures and optimizes Firebase Storage uploads and downloads
 * to improve performance and reduce bandwidth usage.
 */

import { ref, uploadBytes, uploadString, getDownloadURL, UploadMetadata } from 'firebase/storage';
import { storage } from './firebase';
import imageProcessor from './imageProcessor';
import imageOptimizer from './imageOptimizer';

/**
 * Optimized image upload that compresses and formats images before upload
 * 
 * @param file The image file to upload
 * @param path The storage path (without file name)
 * @param fileName The file name to use for storage
 * @returns Promise with download URL
 */
export const optimizedImageUpload = async (
  file: File,
  path: string,
  fileName: string
): Promise<string> => {
  // Process image for optimal size/quality
  const processedFile = await imageProcessor.processImage(file);
  
  // Create optimized metadata for the file
  const metadata: UploadMetadata = {
    contentType: processedFile.type,
    customMetadata: {
      originalSize: file.size.toString(),
      optimizedSize: processedFile.size.toString(),
      originalType: file.type,
      originalName: file.name,
      dateUploaded: new Date().toISOString(),
      isOptimized: 'true'
    },
    cacheControl: 'public, max-age=86400, stale-while-revalidate=604800'
  };
  
  // Create storage reference
  const storageRef = ref(storage, `${path}/${fileName}`);
  
  // Upload the processed file
  await uploadBytes(storageRef, processedFile, metadata);
  
  // Get the download URL
  const downloadURL = await getDownloadURL(storageRef);
  
  return downloadURL;
};

/**
 * Upload multiple images with optimized settings
 * 
 * @param files Array of image files to upload
 * @param basePath Base storage path
 * @returns Promise with array of download URLs
 */
export const batchOptimizedUpload = async (
  files: File[],
  basePath: string
): Promise<string[]> => {
  // Process all files in batch for efficiency
  const processedFiles = await imageProcessor.batchProcessImages(files);
  
  // Upload each file and collect URLs
  const uploadPromises = processedFiles.map((file, index) => {
    // Generate a unique filename with timestamp
    const fileName = `${Date.now()}_${index}_${file.name}`;
    return optimizedImageUpload(file, basePath, fileName);
  });
  
  // Wait for all uploads to complete
  return Promise.all(uploadPromises);
};

/**
 * Upload a base64 image string with optimization
 * 
 * @param dataUrl Base64 data URL of the image
 * @param path Storage path
 * @param fileName File name for storage
 * @param contentType Content type (e.g., 'image/jpeg')
 * @returns Promise with download URL
 */
export const optimizedBase64Upload = async (
  dataUrl: string,
  path: string,
  fileName: string,
  contentType: string = 'image/jpeg'
): Promise<string> => {
  // Create storage reference
  const storageRef = ref(storage, `${path}/${fileName}`);
  
  // Optimize metadata
  const metadata: UploadMetadata = {
    contentType,
    customMetadata: {
      dateUploaded: new Date().toISOString(),
      isOptimized: 'true'
    },
    cacheControl: 'public, max-age=86400, stale-while-revalidate=604800'
  };
  
  // Upload string
  await uploadString(storageRef, dataUrl, 'data_url', metadata);
  
  // Get download URL
  return getDownloadURL(storageRef);
};

/**
 * Create WebP versions of uploaded images for better compression
 * 
 * @param originalUrl Original image URL
 * @param path Storage path
 * @param fileName File name for storage
 * @returns Promise with WebP version URL
 */
export const createWebPVersion = async (
  originalUrl: string,
  path: string,
  fileName: string
): Promise<string> => {
  try {
    // Fetch the original image
    const response = await fetch(originalUrl);
    const blob = await response.blob();
    
    // Convert blob to file
    const file = new File([blob], fileName, { type: blob.type });
    
    // Process to WebP format
    const webpOptions = {
      maxWidth: 1200,
      maxHeight: 1200,
      quality: 0.85,
      format: imageProcessor.ImageFormat.WEBP
    };
    
    const webpFile = await imageProcessor.processImage(file, webpOptions);
    
    // Create a new filename with WebP extension
    const webpFileName = fileName.replace(/\.[^/.]+$/, '') + '.webp';
    
    // Upload the WebP version
    const storageRef = ref(storage, `${path}/${webpFileName}`);
    
    const metadata: UploadMetadata = {
      contentType: 'image/webp',
      customMetadata: {
        originalUrl,
        dateConverted: new Date().toISOString(),
        isWebP: 'true'
      },
      cacheControl: 'public, max-age=31536000, immutable'
    };
    
    await uploadBytes(storageRef, webpFile, metadata);
    
    // Return the WebP URL
    return getDownloadURL(storageRef);
  } catch (error) {
    console.error('Error creating WebP version:', error);
    return originalUrl; // Fall back to original URL on error
  }
};

/**
 * Create optimized thumbnail for an image
 * 
 * @param originalUrl Original image URL
 * @param path Storage path
 * @param fileName File name for the thumbnail
 * @param size Thumbnail size (default: 150px)
 * @returns Promise with thumbnail URL
 */
export const createOptimizedThumbnail = async (
  originalUrl: string,
  path: string,
  fileName: string,
  size: number = 150
): Promise<string> => {
  try {
    // Fetch the original image
    const response = await fetch(originalUrl);
    const blob = await response.blob();
    
    // Convert blob to file
    const file = new File([blob], fileName, { type: blob.type });
    
    // Create thumbnail
    const thumbnail = await imageProcessor.createThumbnail(file, size);
    
    // Create a new filename with thumbnail indicator
    const thumbFileName = fileName.replace(/\.[^/.]+$/, '') + `_thumb${size}.webp`;
    
    // Upload the thumbnail
    const storageRef = ref(storage, `${path}/${thumbFileName}`);
    
    const metadata: UploadMetadata = {
      contentType: 'image/webp',
      customMetadata: {
        originalUrl,
        thumbnailSize: size.toString(),
        dateCreated: new Date().toISOString(),
        isThumbnail: 'true'
      },
      cacheControl: 'public, max-age=31536000, immutable'
    };
    
    await uploadBytes(storageRef, thumbnail, metadata);
    
    // Return the thumbnail URL
    return getDownloadURL(storageRef);
  } catch (error) {
    console.error('Error creating thumbnail:', error);
    
    // Return a URL that will trigger the placeholder in our components
    return originalUrl + '?error=thumbnail';
  }
};

export default {
  optimizedImageUpload,
  batchOptimizedUpload,
  optimizedBase64Upload,
  createWebPVersion,
  createOptimizedThumbnail
};
