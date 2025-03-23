import React, { useState, useEffect, useRef } from 'react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  pullDownThreshold?: number;
  maxPullDownDistance?: number;
  backgroundColor?: string;
  spinnerColor?: string;
  refreshingText?: string;
  pullingText?: string;
  releaseText?: string;
  className?: string;
}

const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  children,
  pullDownThreshold = 80,
  maxPullDownDistance = 120,
  backgroundColor = 'white',
  spinnerColor = '#4f46e5',
  refreshingText = 'Refreshing...',
  pullingText = 'Pull down to refresh',
  releaseText = 'Release to refresh',
  className = '',
}) => {
  const [pullDownDistance, setPullDownDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasPulled, setHasPulled] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number | null>(null);
  const currentYRef = useRef<number | null>(null);

  useEffect(() => {
    // Check if we're on a mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );

    if (!isMobile) return;

    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Only activate pull-to-refresh when at the top of the container
      if (container.scrollTop <= 0) {
        startYRef.current = e.touches[0].clientY;
        currentYRef.current = e.touches[0].clientY;
        setHasPulled(false);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!startYRef.current) return;
      
      currentYRef.current = e.touches[0].clientY;
      const deltaY = currentYRef.current - startYRef.current;
      
      // Only handle pull-down motion (no pull-up)
      if (deltaY > 0 && container.scrollTop <= 0) {
        // Calculate pull distance with resistance (the more you pull, the harder it gets)
        const pullDistance = Math.min(maxPullDownDistance, deltaY / 2);
        setPullDownDistance(pullDistance);
        setHasPulled(true);
        
        // Prevent default scrolling
        e.preventDefault();
      }
    };

    const handleTouchEnd = () => {
      if (!startYRef.current || !currentYRef.current) return;
      
      if (pullDownDistance >= pullDownThreshold && !isRefreshing) {
        // Trigger refresh
        handleRefresh();
      } else {
        // Reset pull distance
        setPullDownDistance(0);
      }
      
      startYRef.current = null;
      currentYRef.current = null;
    };

    // Add touch event listeners
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      // Clean up event listeners
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [maxPullDownDistance, pullDownDistance, pullDownThreshold, isRefreshing]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    
    try {
      await onRefresh();
    } catch (error) {
      console.error('Error during refresh:', error);
    } finally {
      // Delay the reset slightly for better UX
      setTimeout(() => {
        setIsRefreshing(false);
        setPullDownDistance(0);
      }, 500);
    }
  };

  // Calculate progress percentage for UI
  const progressPercentage = Math.min(100, (pullDownDistance / pullDownThreshold) * 100);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-auto ${className}`}
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {/* Pull to refresh indicator */}
      <div
        className="absolute left-0 right-0 flex items-center justify-center overflow-hidden z-10 transition-transform pointer-events-none"
        style={{
          height: `${Math.max(pullDownDistance, isRefreshing ? pullDownThreshold : 0)}px`,
          transform: `translateY(-${isRefreshing ? 0 : pullDownDistance}px)`,
          backgroundColor,
          top: 0,
        }}
      >
        <div className="flex flex-col items-center justify-center h-full">
          {isRefreshing ? (
            <>
              {/* Refreshing spinner */}
              <div className="animate-spin w-6 h-6 border-2 border-t-transparent border-solid rounded-full mb-2" style={{ borderColor: spinnerColor, borderTopColor: 'transparent' }}></div>
              <div className="text-sm" style={{ color: spinnerColor }}>
                {refreshingText}
              </div>
            </>
          ) : (
            <>
              {/* Pull down indicator */}
              <div className="relative w-6 h-6 mb-2">
                <svg 
                  className="absolute inset-0 transform transition-transform duration-200"
                  style={{ 
                    transform: progressPercentage >= 100 ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={spinnerColor}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="7 13 12 18 17 13"></polyline>
                  <polyline points="7 6 12 11 17 6"></polyline>
                </svg>
              </div>
              <div className="text-sm" style={{ color: spinnerColor }}>
                {progressPercentage >= 100 ? releaseText : pullingText}
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Content container - pushed down by pull motion */}
      <div
        className="relative transition-transform duration-200"
        style={{
          transform: `translateY(${isRefreshing ? pullDownThreshold : pullDownDistance}px)`,
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;
