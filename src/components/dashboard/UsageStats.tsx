import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { 
  isFirebasePermissionError, 
  getUserFriendlyErrorMessage, 
  logPermissionError 
} from '../../utils/errorHandling';

interface UsageStats {
  actorsCreated: number;
  actorsLimit: number;
  imagesGenerated: number;
  imagesLimit: number;
  storageUsed: number;
  storageLimit: number;
  lastUpdated: Date;
}

interface UsageStatsProps {
  className?: string;
}

/**
 * Component to display user's usage statistics and limits
 */
const UsageStats: React.FC<UsageStatsProps> = ({ className = '' }) => {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentUser } = useAuth();
  
  useEffect(() => {
    if (!currentUser) return;
    
    // Default stats for demo/fallback
    const defaultStats: UsageStats = {
      actorsCreated: 2,
      actorsLimit: 5,
      imagesGenerated: 15,
      imagesLimit: 50,
      storageUsed: 125 * 1024 * 1024, // 125 MB
      storageLimit: 500 * 1024 * 1024, // 500 MB
      lastUpdated: new Date()
    };
    
    const fetchUsageStats = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Check if user is fully authenticated
        if (!currentUser.uid) {
          console.log("User is not fully authenticated yet");
          setStats(defaultStats);
          setLoading(false);
          return;
        }
        
        try {
          const userStatsRef = doc(firestore, 'user_stats', currentUser.uid);
          const userStatsSnap = await getDoc(userStatsRef);
          
          if (userStatsSnap.exists()) {
            const data = userStatsSnap.data();
            setStats({
              actorsCreated: data.actorsCreated || 0,
              actorsLimit: data.actorsLimit || 5,
              imagesGenerated: data.imagesGenerated || 0,
              imagesLimit: data.imagesLimit || 50,
              storageUsed: data.storageUsed || 0,
              storageLimit: data.storageLimit || 500 * 1024 * 1024, // 500 MB default
              lastUpdated: data.lastUpdated?.toDate() || new Date()
            });
          } else {
            // Create default stats if not exist
            setStats({
              actorsCreated: 0,
              actorsLimit: 5,
              imagesGenerated: 0,
              imagesLimit: 50,
              storageUsed: 0,
              storageLimit: 500 * 1024 * 1024, // 500 MB
              lastUpdated: new Date()
            });
          }
          
          setLoading(false);
        } catch (permissionErr) {
          // Check if it's a permissions error
          if (isFirebasePermissionError(permissionErr)) {
            logPermissionError(permissionErr, 'user_stats', 'read');
            
            // Use demo data for permissions errors
            console.log("Using demo stats data due to permissions issue");
            setStats(defaultStats);
            setError('This is a demo version. Using sample statistics data.');
          } else {
            // Re-throw if it's not a permission error
            throw permissionErr;
          }
        }
      } catch (err) {
        console.error('Error fetching usage stats:', err);
        setError(getUserFriendlyErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };
    
    fetchUsageStats();
  }, [currentUser]);
  
  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow p-4 ${className}`}>
        <h2 className="text-lg font-medium text-gray-900 mb-4">Usage Statistics</h2>
        <div className="space-y-4 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-3 bg-gray-200 rounded"></div>
          <div className="h-5 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }
  
  if (error && !stats) {
    return (
      <div className={`bg-white rounded-lg shadow p-4 ${className}`}>
        <h2 className="text-lg font-medium text-gray-900 mb-2">Usage Statistics</h2>
        <p className="text-red-500 text-sm">{error}</p>
      </div>
    );
  }
  
  if (!stats) {
    return (
      <div className={`bg-white rounded-lg shadow p-4 ${className}`}>
        <h2 className="text-lg font-medium text-gray-900 mb-2">Usage Statistics</h2>
        <p className="text-gray-500 text-sm">No usage data available.</p>
      </div>
    );
  }
  
  // Format storage size from bytes to human-readable format
  const formatStorage = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };
  
  // Calculate usage percentages
  const actorsPercentage = Math.min(100, Math.round((stats.actorsCreated / stats.actorsLimit) * 100));
  const imagesPercentage = Math.min(100, Math.round((stats.imagesGenerated / stats.imagesLimit) * 100));
  const storagePercentage = Math.min(100, Math.round((stats.storageUsed / stats.storageLimit) * 100));
  
  return (
    <div className={`bg-white rounded-lg shadow p-4 ${className}`}>
      <h2 className="text-lg font-medium text-gray-900 mb-4">Usage Statistics</h2>
      
      {error && (
        <div className="mb-3 bg-yellow-50 rounded-md p-2 text-sm text-yellow-700">
          {error}
        </div>
      )}
      
      <div className="space-y-6">
        {/* Actors Usage */}
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium text-gray-700">AI Actors</span>
            <span className="text-sm text-gray-600">{stats.actorsCreated} of {stats.actorsLimit}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className={`h-2.5 rounded-full ${
                actorsPercentage > 90 ? 'bg-red-600' : 
                actorsPercentage > 70 ? 'bg-yellow-500' : 
                'bg-primary-600'
              }`} 
              style={{ width: `${actorsPercentage}%` }}
            ></div>
          </div>
        </div>
        
        {/* Images Generated Usage */}
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium text-gray-700">Images Generated</span>
            <span className="text-sm text-gray-600">{stats.imagesGenerated} of {stats.imagesLimit}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className={`h-2.5 rounded-full ${
                imagesPercentage > 90 ? 'bg-red-600' : 
                imagesPercentage > 70 ? 'bg-yellow-500' : 
                'bg-primary-600'
              }`} 
              style={{ width: `${imagesPercentage}%` }}
            ></div>
          </div>
        </div>
        
        {/* Storage Usage */}
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium text-gray-700">Storage</span>
            <span className="text-sm text-gray-600">{formatStorage(stats.storageUsed)} of {formatStorage(stats.storageLimit)}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className={`h-2.5 rounded-full ${
                storagePercentage > 90 ? 'bg-red-600' : 
                storagePercentage > 70 ? 'bg-yellow-500' : 
                'bg-primary-600'
              }`} 
              style={{ width: `${storagePercentage}%` }}
            ></div>
          </div>
        </div>
      </div>
      
      <div className="mt-4 text-xs text-gray-500">
        Last updated: {stats.lastUpdated.toLocaleString()}
      </div>
    </div>
  );
};

export default UsageStats;
