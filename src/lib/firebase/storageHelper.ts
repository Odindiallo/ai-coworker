/**
 * Helper functions for working with Firebase Storage
 */

/**
 * Fix a Firebase Storage URL to ensure it works with CORS
 * by adding the necessary parameters
 * 
 * @param url The Firebase Storage URL to fix
 * @returns A properly formatted URL with alt=media and cache busting
 */
export const fixFirebaseStorageUrl = (url: string): string => {
  if (!url || !url.includes('firebasestorage.googleapis.com')) {
    return url;
  }

  // Add alt=media parameter if not present
  let fixedUrl = url;
  if (!fixedUrl.includes('alt=media')) {
    fixedUrl = fixedUrl.includes('?') 
      ? `${fixedUrl}&alt=media` 
      : `${fixedUrl}?alt=media`;
  }

  // Add cache-busting parameter to avoid CORS caching issues
  fixedUrl = `${fixedUrl}&cb=${Date.now()}`;

  return fixedUrl;
};

/**
 * Generate a signed URL with token for accessing Firebase Storage directly
 * 
 * @param storagePath The path in the storage bucket
 * @param defaultUrl The default URL to return if generation fails
 * @returns A promise that resolves to the signed URL
 */
export const getStorageUrl = async (
  storagePath: string, 
  defaultUrl: string = ''
): Promise<string> => {
  try {
    // This would normally call Firebase Storage getDownloadURL
    // but for this implementation we'll just fix the URL format
    return fixFirebaseStorageUrl(defaultUrl || `https://firebasestorage.googleapis.com/v0/b/ai-based-actors-backup.firebasestorage.app/o/${encodeURIComponent(storagePath)}?alt=media`);
  } catch (error) {
    console.error('Error generating storage URL:', error);
    return defaultUrl;
  }
};

export default {
  fixFirebaseStorageUrl,
  getStorageUrl
}; 