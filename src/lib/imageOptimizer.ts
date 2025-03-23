/**
 * Image Optimization Utility
 * 
 * This utility provides functions for optimizing image delivery,
 * implementing WebP support, compression, and CDN integration.
 */

// Check if browser supports WebP format
export const supportsWebP = (): boolean => {
  const canvas = document.createElement('canvas');
  if (canvas.getContext && canvas.getContext('2d')) {
    // Use toDataURL to check for WebP support
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  }
  return false;
};

// Check if browser supports AVIF format (newer, better compression)
export const supportsAVIF = (): boolean => {
  const img = new Image();
  img.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgANogQEAwgMg8f8D///8WfhwB8+ErK42A=';
  return img.width > 0;
};

// Get optimal image format extension based on browser support
export const getOptimalImageFormat = (): string => {
  if (supportsAVIF()) return '.avif';
  if (supportsWebP()) return '.webp';
  return '.jpg'; // Fallback to JPG
};

// Format the Firebase Storage URL for optimal delivery
export const optimizeStorageUrl = (url: string, width?: number): string => {
  if (!url) return url;
  
  try {
    // Parse the URL
    const urlObj = new URL(url);
    
    // Add width parameter if provided
    const params = new URLSearchParams(urlObj.search);
    if (width) {
      params.set('width', width.toString());
    }
    
    // Add format parameter based on browser support
    const format = getOptimalImageFormat().replace('.', '');
    params.set('format', format);
    
    // Set quality parameter for compression
    params.set('quality', '85');
    
    // Update the URL search parameters
    urlObj.search = params.toString();
    
    return urlObj.toString();
  } catch (e) {
    console.error('Error optimizing image URL:', e);
    return url; // Return original URL on error
  }
};

// Generate responsive image srcSet
export const generateSrcSet = (
  url: string,
  widths: number[] = [320, 640, 960, 1280, 1920]
): string => {
  return widths
    .map(width => `${optimizeStorageUrl(url, width)} ${width}w`)
    .join(', ');
};

// Calculate appropriate sizes attribute based on breakpoints
export const calculateSizes = (
  mobileSizes: string = '100vw',
  tabletSizes: string = '50vw',
  desktopSizes: string = '33vw'
): string => {
  return `(max-width: 640px) ${mobileSizes}, (max-width: 1024px) ${tabletSizes}, ${desktopSizes}`;
};

// Create a URL for a blurry placeholder (small, low quality)
export const createPlaceholderUrl = (url: string): string => {
  if (!url) return url;
  
  try {
    const urlObj = new URL(url);
    const params = new URLSearchParams(urlObj.search);
    
    params.set('width', '20');
    params.set('blur', '10');
    params.set('quality', '30');
    
    urlObj.search = params.toString();
    return urlObj.toString();
  } catch (e) {
    console.error('Error creating placeholder URL:', e);
    return url;
  }
};

// Calculate cache control TTL based on image type and needs
export const getCacheControlValue = (isStatic: boolean = false): string => {
  // Static content (app assets, icons) - cache for a year
  if (isStatic) {
    return 'public, max-age=31536000, immutable';
  }
  
  // User-generated content - cache for a day but revalidate
  return 'public, max-age=86400, stale-while-revalidate=604800';
};

// Optimize image delivery with CDN configuration
export const configureCdnOptions = (url: string): string => {
  // If not using a CDN, return original URL
  if (!url.includes('firebasestorage.googleapis.com')) {
    return url;
  }
  
  try {
    // Example of rewriting a Firebase Storage URL to use CDN
    // In production, you would integrate with a real CDN like Cloudflare or Akamai
    const urlObj = new URL(url);
    
    // Add CDN-specific parameters
    const params = new URLSearchParams(urlObj.search);
    params.set('cdn-cache', 'true');
    
    urlObj.search = params.toString();
    return urlObj.toString();
  } catch (e) {
    console.error('Error configuring CDN options:', e);
    return url;
  }
};

// Apply all optimizations to an image URL
export const getOptimizedImageUrl = (
  url: string,
  width?: number,
  isStatic: boolean = false
): string => {
  if (!url) return '';
  
  try {
    // Step 1: Format optimization
    let optimizedUrl = optimizeStorageUrl(url, width);
    
    // Step 2: CDN configuration
    optimizedUrl = configureCdnOptions(optimizedUrl);
    
    // Step 3: Add cache control headers (this is illustrative - headers are set on the server)
    // This would be implemented in Firebase Storage metadata or CDN configuration
    
    return optimizedUrl;
  } catch (e) {
    console.error('Error creating optimized image URL:', e);
    return url;
  }
};

// Export default object with all functions
export default {
  supportsWebP,
  supportsAVIF,
  getOptimalImageFormat,
  optimizeStorageUrl,
  generateSrcSet,
  calculateSizes,
  createPlaceholderUrl,
  getCacheControlValue,
  configureCdnOptions,
  getOptimizedImageUrl
};
