import { useState } from 'react';

interface GeneratedImageProps {
  imageUrl: string;
  prompt: string;
  onDownload?: () => void;
  onShare?: () => void;
}

function GeneratedImage({ imageUrl, prompt, onDownload, onShare }: GeneratedImageProps) {
  const [loading, setLoading] = useState(true);
  
  const handleImageLoad = () => {
    setLoading(false);
  };
  
  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="relative aspect-square">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="animate-pulse flex flex-col items-center">
              <svg className="animate-spin h-10 w-10 text-primary-500 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-sm text-gray-500">Loading image...</span>
            </div>
          </div>
        )}
        
        <img
          src={imageUrl}
          alt={prompt}
          className="w-full h-full object-cover"
          onLoad={handleImageLoad}
        />
      </div>
      
      <div className="p-4">
        <p className="text-sm text-gray-600 mb-4 line-clamp-3" title={prompt}>
          {prompt}
        </p>
        
        <div className="flex space-x-2">
          {onDownload && (
            <button
              onClick={onDownload}
              className="flex-1 touch-target inline-flex justify-center items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Download
            </button>
          )}
          
          {onShare && (
            <button
              onClick={onShare}
              className="flex-1 touch-target inline-flex justify-center items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
              </svg>
              Share
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default GeneratedImage;