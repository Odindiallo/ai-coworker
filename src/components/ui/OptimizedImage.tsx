import React, { useState, useEffect, useId } from 'react';
import { cn } from '../../lib/utils';
import imageOptimizer from '../../lib/imageOptimizer';
import { usePerformanceMonitoring } from '../../hooks/usePerformanceMonitoring';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  sizes?: string;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  loading?: 'lazy' | 'eager';
  onClick?: () => void;
  isStatic?: boolean;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

/**
 * OptimizedImage component with advanced image optimization techniques
 * - Automatically selects the most efficient image format (WebP/AVIF)
 * - Generates responsive srcSet for different screen sizes
 * - Implements lazy loading and placeholder images
 * - Uses the browser cache efficiently
 * - Optimizes image delivery via CDN
 * - Monitors performance metrics
 */
const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
  sizes,
  objectFit = 'cover',
  loading = 'lazy',
  onClick,
  isStatic = false,
  onLoad,
  onError
}) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [placeholderSrc, setPlaceholderSrc] = useState<string | null>(null);
  
  // Generate a unique ID for this image (for performance monitoring)
  const id = useId();
  
  // Get performance monitoring utilities
  const { startImageLoad, endImageLoad } = usePerformanceMonitoring();
  
  // Get network information
  const { isOnline, connectionType, isSlowConnection } = useNetworkStatus();
  
  // Generate optimized URLs and srcSet
  const optimizedSrc = imageOptimizer.getOptimizedImageUrl(src, width, isStatic);
  const srcSet = imageOptimizer.generateSrcSet(src);
  const defaultSizes = imageOptimizer.calculateSizes();
  
  // Create a low-quality placeholder image
  useEffect(() => {
    if (!priority && src) {
      const placeholder = imageOptimizer.createPlaceholderUrl(src);
      setPlaceholderSrc(placeholder);
    }
  }, [src, priority]);
  
  // Start monitoring image load when component mounts
  useEffect(() => {
    if (src) {
      startImageLoad(`${id}-${src}`);
    }
    
    return () => {
      // If component unmounts before image loads, end monitoring
      if (!loaded && src) {
        endImageLoad(`${id}-${src}`);
      }
    };
  }, [id, src, loaded, startImageLoad, endImageLoad]);
  
  // Handle image load event
  const handleLoad = () => {
    setLoaded(true);
    endImageLoad(`${id}-${src}`);
    if (onLoad) onLoad();
  };
  
  // Handle image error event
  const handleError = () => {
    setError(new Error(`Failed to load image: ${src}`));
    endImageLoad(`${id}-${src}`);
    if (onError) onError(new Error(`Failed to load image: ${src}`));
  };
  
  // Determine loading strategy based on priority and network conditions
  const loadingStrategy = priority ? 'eager' : 
                         isSlowConnection ? 'lazy' : 
                         loading;
  
  // Generate object-fit style
  const objectFitStyle = objectFit ? { objectFit } : {};
  
  // Disable image loading when offline for non-priority images to save battery
  const shouldLoadImage = isOnline || priority;
  
  return (
    <div
      className={cn(
        'relative overflow-hidden bg-gray-100',
        className
      )}
      style={{
        width: width ? `${width}px` : '100%',
        height: height ? `${height}px` : 'auto',
      }}
    >
      {/* Low-quality placeholder while loading */}
      {placeholderSrc && !loaded && !error && (
        <img
          src={placeholderSrc}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full transition-opacity duration-500 blur-sm"
          style={{ ...objectFitStyle, opacity: loaded ? 0 : 0.5 }}
        />
      )}
      
      {/* Main optimized image */}
      {shouldLoadImage && (
        <img
          src={optimizedSrc}
          srcSet={srcSet}
          sizes={sizes || defaultSizes}
          alt={alt}
          width={width}
          height={height}
          loading={loadingStrategy}
          onLoad={handleLoad}
          onError={handleError}
          onClick={onClick}
          className={cn(
            'w-full h-full transition-opacity duration-500',
            loaded ? 'opacity-100' : 'opacity-0',
            onClick ? 'cursor-pointer' : '',
            error ? 'hidden' : ''
          )}
          style={objectFitStyle}
        />
      )}
      
      {/* Offline indicator for non-loaded images */}
      {!isOnline && !loaded && !priority && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-400">
          <div className="text-center p-4">
            <svg 
              className="w-8 h-8 mx-auto mb-2" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor" 
              strokeWidth={1.5}
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" 
              />
            </svg>
            <p className="text-sm">Offline mode</p>
          </div>
        </div>
      )}
      
      {/* Error state */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-400">
          <div className="text-center p-4">
            <svg 
              className="w-8 h-8 mx-auto mb-2" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor" 
              strokeWidth={1.5}
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                d="M6 18L18 6M6 6l12 12" 
              />
            </svg>
            <p className="text-sm">Unable to load image</p>
          </div>
        </div>
      )}
      
      {/* Loading indicator */}
      {!loaded && !error && shouldLoadImage && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-primary rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
};

export default OptimizedImage;
