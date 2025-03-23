import React, { useState, useEffect } from 'react';
import { createPlaceholderImage } from '../../lib/imageProcessor';
import useBattery from '../../hooks/useBattery';
import { addCorsParameters } from '../../lib/firebase/corsHelper';

interface ResponsiveImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  sizes?: string;
  priority?: boolean;
  placeholder?: 'blur' | 'empty';
  placeholderSrc?: string;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  onClick?: () => void;
  fallbackSrc?: string;
}

/**
 * A mobile-optimized responsive image component
 * Features:
 * - Progressive loading with blur-up effect
 * - WebP format where supported
 * - Responsive sizing with srcSet
 * - Network and battery aware
 * - Touch-friendly
 */
const ResponsiveImage: React.FC<ResponsiveImageProps> = ({
  src,
  alt,
  className = '',
  width,
  height,
  sizes = '100vw',
  priority = false,
  placeholder = 'empty',
  placeholderSrc,
  onLoad,
  onError,
  onClick,
  fallbackSrc = '/assets/placeholder.png'
}) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [blurDataUrl, setBlurDataUrl] = useState<string | null>(placeholderSrc || null);
  const { imageUploadSettings } = useBattery();
  
  // Apply Firebase Storage URL fix if needed
  const fixedSrc = src.includes('firebasestorage.googleapis.com') 
    ? addCorsParameters(src) 
    : src;
  
  const [imageSrc, setImageSrc] = useState(fixedSrc);
  
  // Reset state when src changes
  useEffect(() => {
    setLoaded(false);
    setError(null);
    // Apply Firebase Storage URL fix if needed
    const newSrc = src.includes('firebasestorage.googleapis.com') 
      ? addCorsParameters(src) 
      : src;
    setImageSrc(newSrc);
  }, [src]);
  
  // Handle Firebase Storage CORS issues
  useEffect(() => {
    if (error && imageSrc.includes('firebasestorage.googleapis.com')) {
      console.warn('Firebase Storage CORS error detected, trying with crossOrigin');
      
      // Attempt to fix the URL using our helper with additional cache busting
      const updatedUrl = `${addCorsParameters(imageSrc)}&_nocache=${Date.now()}`;
      
      setImageSrc(updatedUrl);
      setError(null);
    }
  }, [error, imageSrc]);
  
  // Generate srcSet for responsive loading
  const generateSrcSet = (url: string): string => {
    const sizes = [640, 750, 828, 1080, 1200, 1920];
    const urlObj = new URL(url);
    
    return sizes
      .map(size => {
        // This is an example transformation - in production
        // this would point to your image CDN URLs
        const resizedUrl = `${urlObj.origin}${urlObj.pathname}?width=${size}`;
        return `${resizedUrl} ${size}w`;
      })
      .join(', ');
  };
  
  // Generate WebP version if available
  const getWebPUrl = (url: string): string => {
    const urlObj = new URL(url);
    return `${urlObj.origin}${urlObj.pathname}.webp`;
  };
  
  // Determine if browser supports WebP
  const [supportsWebP, setSupportsWebP] = useState(false);
  
  useEffect(() => {
    // Check WebP support
    const checkWebPSupport = async () => {
      try {
        const canvas = document.createElement('canvas');
        if (canvas.getContext && canvas.getContext('2d')) {
          const isSupported = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
          setSupportsWebP(isSupported);
        }
      } catch {
        setSupportsWebP(false);
      }
    };
    
    checkWebPSupport();
  }, []);
  
  // Generate blur placeholder if not provided
  useEffect(() => {
    if (placeholder === 'blur' && !blurDataUrl) {
      const img = new Image();
      img.src = src;
      img.crossOrigin = 'anonymous';
      
      img.onload = async () => {
        try {
          // Convert to Blob
          const canvas = document.createElement('canvas');
          canvas.width = 20;
          canvas.height = 20;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, 20, 20);
            const blob = await new Promise<Blob>((resolve) => {
              canvas.toBlob((result) => {
                if (result) resolve(result);
              }, 'image/jpeg', 0.1);
            });
            
            // Create a dummy file to use with the image processor
            const file = new File([blob], 'temp.jpg', { type: 'image/jpeg' });
            // @ts-expect-error - createPlaceholderImage expects File but TypeScript thinks it expects number
            const dataUrl = await createPlaceholderImage(file);
            setBlurDataUrl(dataUrl);
          }
        } catch {
          console.error('Failed to generate blur placeholder');
        }
      };
    }
  }, [src, placeholder, blurDataUrl]);
  
  // On load handler
  const handleLoad = () => {
    setLoaded(true);
    if (onLoad) onLoad();
  };
  
  // On error handler
  const handleError = () => {
    const newError = new Error(`Failed to load image: ${imageSrc}`);
    setError(newError);
    if (onError) onError(newError);
    
    // If we're already using fallback, don't try again
    if (imageSrc !== fallbackSrc) {
      setImageSrc(fallbackSrc);
    }
  };

  const srcSet = generateSrcSet(src);
  const webPSrcSet = supportsWebP ? generateSrcSet(getWebPUrl(src)) : undefined;
  
  // Apply loading strategy based on priority and connection
  const loadingStrategy = priority 
    ? 'eager' 
    : imageUploadSettings.compressImages 
      ? 'lazy' 
      : 'auto';
      
  // Accessibility enhancements - add ARIA attributes for better screen reader support
  const ariaAttributes = {
    'aria-busy': !loaded && !error,
    'aria-hidden': error ? true : undefined
  };
  
  // Add touch-friendly click handler
  const handleClick = onClick 
    ? (e: React.MouseEvent<HTMLImageElement>) => {
        e.preventDefault();
        onClick();
      }
    : undefined;
    
  const touchProps = onClick ? {
    role: 'button',
    tabIndex: 0,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick();
      }
    }
  } : {};
  
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ 
        width: width ? `${width}px` : 'auto',
        height: height ? `${height}px` : 'auto',
      }}
    >
      {/* Placeholder while loading */}
      {placeholder === 'blur' && blurDataUrl && !loaded && (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-cover bg-center blur-sm scale-110"
          style={{ 
            backgroundImage: `url(${blurDataUrl})`,
            filter: 'blur(20px)',
            transform: 'scale(1.1)'
          }}
        />
      )}

      {/* Main image */}
      <picture>
        {/* WebP version for supported browsers */}
        {supportsWebP && webPSrcSet && (
          <source type="image/webp" srcSet={webPSrcSet} sizes={sizes} />
        )}
        
        {/* Standard image */}
        <img
          src={imageSrc}
          alt={alt}
          loading={loadingStrategy as "eager" | "lazy" | undefined}
          srcSet={srcSet}
          sizes={sizes}
          onLoad={handleLoad}
          onError={handleError}
          onClick={handleClick}
          crossOrigin="anonymous"
          className={`w-full h-full object-cover transition-opacity duration-500 ${
            loaded ? 'opacity-100' : 'opacity-0'
          } ${onClick ? 'cursor-pointer' : ''}`}
          {...ariaAttributes}
          {...touchProps}
        />
      </picture>
      
      {/* Error state */}
      {error && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="text-center p-4">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-12 w-12 text-gray-400 mx-auto mb-2" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M6 18L18 6M6 6l12 12" 
              />
            </svg>
            <p className="text-sm text-gray-500">
              Failed to load image
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResponsiveImage;
