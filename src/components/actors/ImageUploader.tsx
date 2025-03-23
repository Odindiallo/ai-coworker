import { useState, useCallback, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';

// Interface for uploaded image data
export interface UploadedImage {
  id: string;
  url: string;
  path: string;
  name: string;
}

interface ImageUploaderProps {
  onImagesUploaded: (uploadedImages: UploadedImage[]) => void;
  maxImages?: number;
}

function ImageUploader({ onImagesUploaded, maxImages = 20 }: ImageUploaderProps) {
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isMobile, setIsMobile] = useState(false);
  const [showCameraOptions, setShowCameraOptions] = useState(false);
  const [hasCameraSupport, setHasCameraSupport] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { currentUser } = useAuth();

  // Detect mobile devices and camera support
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor;
      setIsMobile(/android|iphone|ipad|ipod|blackberry|windows phone/i.test(userAgent));
    };
    
    const checkCameraSupport = () => {
      setHasCameraSupport(
        !!navigator.mediaDevices && 
        !!navigator.mediaDevices.getUserMedia
      );
    };
    
    checkMobile();
    checkCameraSupport();
  }, []);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Handle camera capture for mobile devices - rear camera
  const handleRearCameraCapture = () => {
    if (cameraInputRef.current) {
      cameraInputRef.current.setAttribute('capture', 'environment');
      cameraInputRef.current.click();
      setShowCameraOptions(false);
    }
  };

  // Handle camera capture for mobile devices - front camera (selfie)
  const handleFrontCameraCapture = () => {
    if (cameraInputRef.current) {
      cameraInputRef.current.setAttribute('capture', 'user');
      cameraInputRef.current.click();
      setShowCameraOptions(false);
    }
  };

  // Handle gallery selection
  const handleGallerySelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.removeAttribute('capture');
      fileInputRef.current.click();
      setShowCameraOptions(false);
    }
  };

  // Toggle camera options panel
  const toggleCameraOptions = () => {
    setShowCameraOptions(prev => !prev);
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    // Check for development mode
    const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';
    console.log('Development mode:', isDevelopment, 'Current user:', currentUser);
    
    if (!currentUser && !isDevelopment) {
      console.log('No current user and not in development mode');
      return;
    }
    
    if (!isOnline) {
      alert('You are currently offline. Please connect to the internet to upload images.');
      return;
    }
    
    // Check for max image limit
    const totalImages = uploadedImages.length + acceptedFiles.length;
    if (totalImages > maxImages) {
      alert(`You can only upload a maximum of ${maxImages} images. Please remove some images.`);
      return;
    }

    setUploading(true);
    const newUploadProgress = { ...uploadProgress };
    const newUploadErrors = { ...uploadErrors };
    
    // Development mode: Create mock image data without actually uploading
    if (isDevelopment) {
      console.log('Development mode: Creating mock image data instead of uploading');
      
      // Simulate upload progress
      const mockUploads = acceptedFiles.map(async (file, index) => {
        const fileId = Date.now() + '_' + file.name + '_' + index;
        const mockPath = `mock/users/${currentUser?.uid || 'test-user'}/actor-images/${fileId}`;
        
        // Create a mock URL by reading the file locally
        let mockUrl = '';
        try {
          const reader = new FileReader();
          mockUrl = await new Promise((resolve, reject) => {
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        } catch (err) {
          console.error('Error reading file:', err);
          mockUrl = `https://via.placeholder.com/300?text=Mock+Image+${index+1}`;
        }
        
        // Simulate upload progress
        newUploadProgress[fileId] = 0;
        setUploadProgress({ ...newUploadProgress });
        
        // Simulate upload delay
        await new Promise(resolve => {
          const interval = setInterval(() => {
            newUploadProgress[fileId] += 20;
            if (newUploadProgress[fileId] >= 100) {
              clearInterval(interval);
              resolve(null);
            }
            setUploadProgress({ ...newUploadProgress });
          }, 300);
        });
        
        // Return mock image data
        return {
          id: fileId,
          url: mockUrl,
          path: mockPath,
          name: file.name
        };
      });
      
      // Wait for all mock uploads to complete
      const mockImages = await Promise.all(mockUploads);
      
      // Update state with new images
      const newUploadedImages = [...uploadedImages, ...mockImages];
      setUploadedImages(newUploadedImages);
      
      // Call callback with updated images
      onImagesUploaded(newUploadedImages);
      setUploading(false);
      return;
    }
    
    // Start uploads for each file
    const uploadPromises = acceptedFiles.map(async (file) => {
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        const fileId = Date.now() + '_' + file.name;
        newUploadErrors[fileId] = `File ${file.name} exceeds 5MB size limit`;
        setUploadErrors({ ...newUploadErrors });
        return Promise.reject(new Error(`File ${file.name} exceeds 5MB size limit`));
      }

      const fileId = Date.now() + '_' + file.name;
      const storagePath = `users/${currentUser.uid}/actor-images/${fileId}`;
      const storageRef = ref(storage, storagePath);
      
      // Update progress state for this file
      newUploadProgress[fileId] = 0;
      setUploadProgress({ ...newUploadProgress });
      
      try {
        // Log the storage path for debugging
console.log('Attempting to upload to Firebase Storage path:', storagePath);

// Configure metadata to help with CORS issues
const metadata = {
  contentType: file.type,
  customMetadata: {
    'uploaded-by': 'ai-actor-generator'
  }
};

const uploadTask = uploadBytesResumable(storageRef, file, metadata);
        
        // Listen for state changes
        return new Promise<UploadedImage>((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot) => {
              // Update progress
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              newUploadProgress[fileId] = progress;
              setUploadProgress({ ...newUploadProgress });
              console.log(`Upload progress for ${file.name}: ${progress.toFixed(1)}%`);
            },
            (error) => {
              // Handle errors with more detail
              console.error(`Upload error for ${file.name}:`, error);
              console.error('Error code:', error.code);
              console.error('Error message:', error.message);
              
              // Handle specific error types
              if (error.code === 'storage/unauthorized' || error.code === 'storage/cors-error') {
                newUploadErrors[fileId] = `CORS or authorization error. Firebase Storage isn't properly configured for this domain.`;
              } else if (error.code === 'storage/server-file-wrong-size') {
                newUploadErrors[fileId] = 'Network issue during upload. Please try again.';
              } else {
                newUploadErrors[fileId] = `Error: ${error.message}`;
              }
              
              setUploadErrors({ ...newUploadErrors });
              reject(error);
            },
            async () => {
              // Upload completed successfully
              try {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                const imageData: UploadedImage = {
                  id: fileId,
                  url: downloadURL,
                  path: storagePath,
                  name: file.name
                };
                resolve(imageData);
              } catch (error) {
                console.error('Error getting download URL:', error);
                if (error instanceof Error) {
                  newUploadErrors[fileId] = error.message;
                  setUploadErrors({ ...newUploadErrors });
                }
                reject(error);
              }
            }
          );
        });
      } catch (error) {
        console.error('Error starting upload:', error);
        if (error instanceof Error) {
          newUploadErrors[fileId] = error.message;
          setUploadErrors({ ...newUploadErrors });
        }
        throw error;
      }
    });
    
    try {
      // Wait for all uploads to complete
      const results = await Promise.allSettled(uploadPromises);
      
      // Filter out fulfilled promises and get their values
      const successfulUploads = results
        .filter((result): result is PromiseFulfilledResult<UploadedImage> => 
          result.status === 'fulfilled'
        )
        .map(result => result.value);
      
      // Update state with new images
      const newUploadedImages = [...uploadedImages, ...successfulUploads];
      setUploadedImages(newUploadedImages);
      
      // Call callback with updated images
      onImagesUploaded(newUploadedImages);
    } catch (error) {
      console.error('Error uploading images:', error);
    } finally {
      setUploading(false);
    }
  }, [currentUser, maxImages, onImagesUploaded, uploadErrors, uploadProgress, uploadedImages, isOnline]);
  
  const removeImage = (imageId: string) => {
    const newImages = uploadedImages.filter(img => img.id !== imageId);
    setUploadedImages(newImages);
    onImagesUploaded(newImages);
    
    // Also remove from progress and errors tracking
    const newProgress = { ...uploadProgress };
    const newErrors = { ...uploadErrors };
    delete newProgress[imageId];
    delete newErrors[imageId];
    setUploadProgress(newProgress);
    setUploadErrors(newErrors);
  };
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': [],
      'image/png': [],
      'image/webp': []
    },
    maxSize: 5 * 1024 * 1024, // 5MB max size
    disabled: uploading || !isOnline
  });

  return (
    <div className="space-y-6">
      {/* Hidden file input for gallery */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) {
            const filesArray = Array.from(e.target.files);
            onDrop(filesArray);
            // Clear the input value to allow selecting the same file again
            e.target.value = '';
          }
        }}
      />
      
      {/* Hidden file input for camera */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) {
            const filesArray = Array.from(e.target.files);
            onDrop(filesArray);
            // Clear the input value to allow selecting the same file again
            e.target.value = '';
          }
        }}
      />
      
      {/* Offline message */}
      {!isOnline && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                You are currently offline. Connect to the internet to upload images.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Dropzone for desktop, different UI for mobile */}
      {isMobile ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 text-center">
            Upload photos of your subject from different angles
          </p>
          
          {showCameraOptions ? (
            <div className="grid grid-cols-1 gap-4">
              {hasCameraSupport && (
                <>
                  <button
                    type="button"
                    onClick={handleRearCameraCapture}
                    disabled={uploading || !isOnline}
                    className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg bg-white hover:border-primary-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[100px] touch-target"
                  >
                    <div className="text-3xl mb-2">📷</div>
                    <span className="text-sm font-medium">Use Rear Camera</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={handleFrontCameraCapture}
                    disabled={uploading || !isOnline}
                    className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg bg-white hover:border-primary-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[100px] touch-target"
                  >
                    <div className="text-3xl mb-2">🤳</div>
                    <span className="text-sm font-medium">Use Front Camera (Selfie)</span>
                  </button>
                </>
              )}
              
              <button
                type="button"
                onClick={handleGallerySelect}
                disabled={uploading || !isOnline}
                className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg bg-white hover:border-primary-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[100px] touch-target"
              >
                <div className="text-3xl mb-2">🖼️</div>
                <span className="text-sm font-medium">Photo Gallery</span>
              </button>
              
              <button
                type="button"
                onClick={toggleCameraOptions}
                className="mt-2 flex items-center justify-center p-2 text-gray-500 text-sm touch-target"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={toggleCameraOptions}
              disabled={uploading || !isOnline}
              className="w-full flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg bg-white hover:border-primary-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[150px] touch-target"
            >
              <div className="text-4xl mb-3">📷</div>
              <span className="text-base font-medium">Take Photo or Upload Image</span>
              <span className="text-xs text-gray-500 mt-1">
                Tap to choose camera or gallery
              </span>
            </button>
          )}
        </div>
      ) : (
        <div 
          {...getRootProps()} 
          className={`border-2 border-dashed p-6 rounded-lg text-center cursor-pointer touch-target min-h-[120px] flex flex-col items-center justify-center ${
            isDragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-500'
          } ${(uploading || !isOnline) ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input {...getInputProps()} />
          <div className="space-y-2">
            <div className="text-4xl text-gray-300">📷</div>
            {isDragActive ? (
              <p className="text-primary-600">Drop the images here...</p>
            ) : (
              <>
                <p className="text-gray-600">Drag and drop images here, or click to select files</p>
                <p className="text-sm text-gray-500">
                  JPG, PNG, WebP • Up to 5MB each • Max {maxImages} images
                </p>
              </>
            )}
          </div>
        </div>
      )}
      
      {/* Image gallery */}
      {uploadedImages.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Uploaded Images ({uploadedImages.length}/{maxImages})
          </h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {uploadedImages.map((image) => (
              <div key={image.id} className="relative group rounded-lg overflow-hidden border border-gray-200">
                <img
                  src={image.url}
                  alt={image.name}
                  className="w-full h-32 object-cover"
                  loading="lazy"
                />
                
                {/* Desktop hover delete button */}
                {!isMobile && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      onClick={() => removeImage(image.id)}
                      className="bg-red-500 text-white rounded-full p-2"
                      type="button"
                      aria-label="Remove image"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                )}
                
                {/* Mobile-optimized delete button (always visible) */}
                {isMobile && (
                  <button
                    onClick={() => removeImage(image.id)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 min-w-[32px] min-h-[32px] flex items-center justify-center shadow"
                    type="button"
                    aria-label="Remove image"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Progress bars for uploads in progress */}
      {Object.keys(uploadProgress).length > 0 && uploading && (
        <div className="space-y-2 mt-4">
          <h3 className="text-sm font-medium text-gray-700">Uploading...</h3>
          {Object.entries(uploadProgress).map(([id, progress]) => (
            <div key={id} className="space-y-1">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Uploading image...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="bg-gray-100 rounded-full overflow-hidden h-2">
                <div 
                  className="bg-primary-500 h-full rounded-full transition-all duration-300 ease-in-out"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Error messages */}
      {Object.keys(uploadErrors).length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mt-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Upload errors:</h3>
              <div className="mt-2 text-sm text-red-700">
                <ul className="list-disc pl-5 space-y-1">
                  {Object.entries(uploadErrors).map(([id, error]) => (
                    <li key={id}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Help text for better upload quality */}
      <div className="bg-blue-50 p-4 rounded-md mt-2">
        <h4 className="text-sm font-medium text-blue-800 mb-1">Tips for best results:</h4>
        <ul className="text-xs text-blue-700 space-y-1 list-disc pl-5">
          <li>Upload clear, well-lit photos of the subject</li>
          <li>Include different angles and expressions</li>
          <li>Avoid photos with multiple people</li>
          <li>Upload at least 5 different photos for best results</li>
        </ul>
      </div>
    </div>
  );
}

export default ImageUploader;