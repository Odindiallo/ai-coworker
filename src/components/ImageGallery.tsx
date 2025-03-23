import React, { useState, useEffect, useCallback } from 'react';
import { useInView } from 'react-intersection-observer';
import { motion } from 'framer-motion';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import LazyImage from './ui/LazyImage';
import ProgressiveImage from './ui/ProgressiveImage';
import imageOptimizer from '../lib/imageOptimizer';
import imageProcessor from '../lib/imageProcessor';

interface Image {
  id: string;
  url: string;
  thumbnailUrl?: string;
  prompt?: string;
  createdAt: number | Date;
}

interface ImageGalleryProps {
  images: Image[];
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoading?: boolean;
  allowSelection?: boolean;
  onImageClick?: (image: Image) => void;
  selectedImages?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  emptyMessage?: string;
}

/**
 * Responsive image gallery optimized for mobile and desktop
 * Features lazy loading, progressive loading, and responsive grid layout
 */
const ImageGallery: React.FC<ImageGalleryProps> = ({
  images,
  onLoadMore,
  hasMore = false,
  isLoading = false,
  allowSelection = false,
  onImageClick,
  selectedImages = [],
  onSelectionChange,
  emptyMessage = 'No images to display'
}) => {
  const [placeholders, setPlaceholders] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string[]>(selectedImages);
  const { isOnline, connectionType, isSlowConnection } = useNetworkStatus();
  
  // Update selected images when prop changes
  useEffect(() => {
    setSelected(selectedImages);
  }, [selectedImages]);
  
  // Handle image selection
  const toggleSelection = useCallback((imageId: string) => {
    if (!allowSelection) return;
    
    setSelected(prev => {
      const newSelected = prev.includes(imageId)
        ? prev.filter(id => id !== imageId)
        : [...prev, imageId];
      
      if (onSelectionChange) {
        onSelectionChange(newSelected);
      }
      
      return newSelected;
    });
  }, [allowSelection, onSelectionChange]);
  
  // Setup infinite scroll using intersection observer
  const { ref, inView } = useInView({
    threshold: 0,
    rootMargin: '100px 0px',
  });
  
  // Trigger load more when bottom is in view
  useEffect(() => {
    if (inView && !isLoading && hasMore && onLoadMore) {
      onLoadMore();
    }
  }, [inView, isLoading, hasMore, onLoadMore]);
  
  // Generate placeholders for images that don't have thumbnails
  useEffect(() => {
    const generatePlaceholders = async () => {
      const newPlaceholders: Record<string, string> = {};
      
      for (const image of images) {
        if (!image.thumbnailUrl && !placeholders[image.id]) {
          try {
            // Create a placeholder URL
            const placeholderUrl = imageOptimizer.createPlaceholderUrl(image.url);
            newPlaceholders[image.id] = placeholderUrl;
          } catch (error) {
            console.error('Error generating placeholder:', error);
          }
        }
      }
      
      if (Object.keys(newPlaceholders).length > 0) {
        setPlaceholders(prev => ({ ...prev, ...newPlaceholders }));
      }
    };
    
    generatePlaceholders();
  }, [images]);
  
  // Determine if we should use progressive loading based on connection
  const useProgressiveLoading = useCallback(() => {
    return isSlowConnection || connectionType === 'cellular';
  }, [isSlowConnection, connectionType]);
  
  // Handle image click
  const handleImageClick = useCallback((image: Image) => {
    if (allowSelection) {
      toggleSelection(image.id);
    } else if (onImageClick) {
      onImageClick(image);
    }
  }, [allowSelection, toggleSelection, onImageClick]);
  
  // Render an empty state when no images
  if (images.length === 0 && !isLoading) {
    return (
      <div className="w-full py-12 flex flex-col items-center justify-center text-gray-500">
        <svg 
          className="w-16 h-16 mb-4 text-gray-300" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor" 
          strokeWidth={1.5}
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
          />
        </svg>
        <p className="text-lg">{emptyMessage}</p>
      </div>
    );
  }
  
  return (
    <div className="w-full">
      {/* Responsive Grid Gallery */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4">
        {images.map((image) => {
          const isSelected = selected.includes(image.id);
          const placeholderSrc = image.thumbnailUrl || placeholders[image.id];
          
          // Animation variants for the image cards
          const variants = {
            hidden: { opacity: 0, scale: 0.9 },
            visible: { opacity: 1, scale: 1 }
          };
          
          return (
            <motion.div
              key={image.id}
              initial="hidden"
              animate="visible"
              variants={variants}
              transition={{ duration: 0.3 }}
              className={`relative aspect-square overflow-hidden rounded-lg cursor-pointer hover:opacity-90 transition-all ${
                isSelected ? 'ring-4 ring-primary ring-offset-2' : ''
              }`}
              onClick={() => handleImageClick(image)}
            >
              {useProgressiveLoading() && placeholderSrc ? (
                <ProgressiveImage
                  lowQualitySrc={placeholderSrc}
                  highQualitySrc={imageOptimizer.getOptimizedImageUrl(image.url)}
                  alt={image.prompt || 'Generated image'}
                  objectFit="cover"
                  className="w-full h-full"
                />
              ) : (
                <LazyImage
                  src={imageOptimizer.getOptimizedImageUrl(image.url)}
                  alt={image.prompt || 'Generated image'}
                  placeholderSrc={placeholderSrc}
                  objectFit="cover"
                  className="w-full h-full"
                />
              )}
              
              {/* Selection indicator */}
              {allowSelection && isSelected && (
                <div className="absolute top-2 right-2 bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center">
                  <svg 
                    className="w-4 h-4" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor" 
                    strokeWidth={2}
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      d="M5 13l4 4L19 7" 
                    />
                  </svg>
                </div>
              )}
              
              {/* Prompt indicator (small hint at the bottom) */}
              {image.prompt && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-white text-xs truncate opacity-0 hover:opacity-100 transition-opacity">
                  {image.prompt}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
      
      {/* Loading indicator for infinite scroll */}
      {(isLoading || hasMore) && (
        <div
          ref={ref}
          className="w-full py-8 flex justify-center items-center"
        >
          {isLoading ? (
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 border-2 border-gray-300 border-t-primary rounded-full animate-spin"></div>
              <p className="mt-2 text-sm text-gray-500">Loading more images...</p>
            </div>
          ) : hasMore ? (
            <p className="text-sm text-gray-500">Scroll to load more</p>
          ) : null}
        </div>
      )}
      
      {/* Offline indicator */}
      {!isOnline && (
        <div className="fixed bottom-4 left-4 right-4 bg-yellow-100 border border-yellow-300 text-yellow-800 px-4 py-3 rounded-lg shadow-lg">
          <div className="flex items-center">
            <svg 
              className="w-5 h-5 mr-2" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor" 
              strokeWidth={2}
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
              />
            </svg>
            <p>You're offline. Some images may not load until you reconnect.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageGallery;
