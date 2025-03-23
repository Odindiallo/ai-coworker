/**
 * CORS Helper for Firebase Storage
 * This utility helps solve CORS issues when working with Firebase Storage
 */

// Add proper query parameters to Firebase Storage URLs to avoid CORS issues
export const addCorsParameters = (url: string): string => {
  if (!url || !url.includes('firebasestorage.googleapis.com')) {
    return url;
  }

  // URLs must include the alt=media parameter to be accessible
  let corsUrl = url;
  if (!corsUrl.includes('alt=media')) {
    corsUrl = corsUrl.includes('?') 
      ? `${corsUrl}&alt=media` 
      : `${corsUrl}?alt=media`;
  }
  
  // Add a download token if not present (might be needed for some storage configurations)
  if (!corsUrl.includes('token=')) {
    corsUrl = `${corsUrl}&token=cors-fix`;
  }
  
  // Add a cache-busting parameter to avoid cached CORS errors
  corsUrl = `${corsUrl}&_cb=${Date.now()}`;
  
  return corsUrl;
};

// Create a CORS-friendly proxy URL for Firebase Storage
export const createProxyUrl = (originalUrl: string): string => {
  // Check if it's a Firebase Storage URL
  if (!originalUrl || !originalUrl.includes('firebasestorage.googleapis.com')) {
    return originalUrl;
  }
  
  try {
    // Parse the original URL to extract the path
    const url = new URL(originalUrl);
    const pathMatch = url.pathname.match(/\/o\/([^?]+)/);
    
    if (!pathMatch || !pathMatch[1]) {
      return addCorsParameters(originalUrl);
    }
    
    // Get the encoded path
    const encodedPath = pathMatch[1];
    
    // In current development mode, just add CORS parameters to the original URL
    // The path is extracted for future use with a proper CORS proxy
    return addCorsParameters(originalUrl);
    
    // In production with a CORS proxy set up, you would use:
    // const path = decodeURIComponent(encodedPath);
    // return `/api/storage-proxy?path=${encodeURIComponent(path)}`;
  } catch (_) {
    console.error('Error creating proxy URL');
    return originalUrl;
  }
};

// Helper to check if a URL is causing CORS errors and fix it
export const fixCorsFetchUrl = async (url: string): Promise<string> => {
  try {
    // First try to fetch the URL as is
    const response = await fetch(url, { method: 'HEAD', mode: 'cors' });
    if (response.ok) {
      return url;
    }
    return createProxyUrl(url);
  } catch (_) {
    // If fetch fails with CORS error, return the proxy URL
    return createProxyUrl(url);
  }
};

export default {
  addCorsParameters,
  createProxyUrl,
  fixCorsFetchUrl
}; 