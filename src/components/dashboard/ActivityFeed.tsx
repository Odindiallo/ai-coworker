import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { firestore } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import ResponsiveImage from '../ui/ResponsiveImage';
import { formatDistanceToNow } from 'date-fns';
import { 
  isFirebasePermissionError, 
  getUserFriendlyErrorMessage, 
  logPermissionError 
} from '../../utils/errorHandling';

interface Activity {
  id: string;
  type: 'creation' | 'training' | 'generation';
  timestamp: Date;
  actorId: string;
  actorName: string;
  imageUrl?: string;
  prompt?: string;
  status?: string;
}

interface ActivityFeedProps {
  limit?: number;
  className?: string;
}

/**
 * Activity feed component that displays recent user activity
 * including actor creations, training completions, and image generations
 */
const ActivityFeed: React.FC<ActivityFeedProps> = ({
  limit: itemLimit = 5,
  className = ''
}) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentUser } = useAuth();
  
  useEffect(() => {
    if (!currentUser) return;
    
    setLoading(true);
    setError(null);
    
    // Dummy activities data for demo when Firebase permissions are not available
    const dummyActivities: Activity[] = [
      {
        id: '1',
        type: 'creation',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        actorId: 'demo-actor-1',
        actorName: 'John Doe'
      },
      {
        id: '2',
        type: 'training',
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
        actorId: 'demo-actor-1',
        actorName: 'John Doe',
        status: 'Completed'
      },
      {
        id: '3',
        type: 'generation',
        timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        actorId: 'demo-actor-1',
        actorName: 'John Doe',
        prompt: 'A photo of John Doe in a sci-fi environment'
      }
    ];
    
    const fetchActivities = async () => {
      try {
        // Skip if user is not fully authenticated
        if (!currentUser.uid) {
          console.log("User is not fully authenticated yet");
          setActivities([]);
          setLoading(false);
          return;
        }
        
        try {
          // Fetch recent generations
          const generationsQuery = query(
            collection(firestore, 'user_activity'),
            where('userId', '==', currentUser.uid),
            orderBy('timestamp', 'desc'),
            limit(itemLimit)
          );
          
          // Set up real-time listener
          const unsubscribe = onSnapshot(generationsQuery, (snapshot) => {
            const activityList: Activity[] = [];
            
            snapshot.forEach((doc) => {
              const data = doc.data();
              activityList.push({
                id: doc.id,
                type: data.type,
                timestamp: data.timestamp.toDate(),
                actorId: data.actorId,
                actorName: data.actorName,
                imageUrl: data.imageUrl,
                prompt: data.prompt,
                status: data.status
              });
            });
            
            setActivities(activityList);
            setLoading(false);
          }, (err) => {
            // Check if it's a permissions error in the onSnapshot error handler
            if (isFirebasePermissionError(err)) {
              logPermissionError(err, 'user_activity', 'read');
              
              // Use dummy data for demo purposes when permissions fail
              console.log("Using dummy activity data due to permissions issue");
              setActivities(dummyActivities);
              setError('This is a demo version. Using sample activity data.');
              setLoading(false);
            } else {
              console.error('Error in activity snapshot listener:', err);
              setError(getUserFriendlyErrorMessage(err));
              setLoading(false);
            }
          });
          
          return unsubscribe;
        } catch (permissionErr) {
          // Check if it's a permissions error
          if (isFirebasePermissionError(permissionErr)) {
            logPermissionError(permissionErr, 'user_activity', 'read');
            
            // Use dummy data for demo purposes
            console.log("Using dummy activity data due to setup error");
            setActivities(dummyActivities);
            setError('This is a demo version. Using sample activity data.');
          } else {
            // Re-throw if it's not a permission error
            throw permissionErr;
          }
          setLoading(false);
        }
      } catch (err) {
        console.error('General error in activity feed:', err);
        setError(getUserFriendlyErrorMessage(err));
        setLoading(false);
      }
    };
    
    fetchActivities();
  }, [currentUser, itemLimit]);
  
  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow p-4 ${className}`}>
        <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h2>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex items-center animate-pulse">
              <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
              <div className="ml-3 flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  if (error && activities.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow p-4 ${className}`}>
        <h2 className="text-lg font-medium text-gray-900 mb-2">Recent Activity</h2>
        <p className="text-red-500 text-sm">{error}</p>
      </div>
    );
  }
  
  if (activities.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow p-4 ${className}`}>
        <h2 className="text-lg font-medium text-gray-900 mb-2">Recent Activity</h2>
        <p className="text-gray-500 text-sm">No recent activity found. Create an actor or generate images to see your activity here.</p>
      </div>
    );
  }
  
  return (
    <div className={`bg-white rounded-lg shadow p-4 ${className}`}>
      <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h2>
      {error && (
        <div className="mb-3 bg-yellow-50 rounded-md p-2 text-sm text-yellow-700">
          {error}
        </div>
      )}
      <div className="space-y-4">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start">
            {/* Activity icon or image */}
            <div className="flex-shrink-0 mr-3">
              {activity.imageUrl ? (
                <div className="h-10 w-10 rounded-full overflow-hidden">
                  <ResponsiveImage
                    src={activity.imageUrl}
                    alt={activity.actorName}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                  {activity.type === 'creation' && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  )}
                  {activity.type === 'training' && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                  )}
                  {activity.type === 'generation' && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  )}
                </div>
              )}
            </div>
            
            {/* Activity content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">
                {activity.type === 'creation' && `Created new actor: ${activity.actorName}`}
                {activity.type === 'training' && `${activity.actorName}'s training ${activity.status?.toLowerCase()}`}
                {activity.type === 'generation' && `Generated image for ${activity.actorName}`}
              </p>
              
              {activity.prompt && (
                <p className="text-xs text-gray-500 truncate mt-1">
                  Prompt: "{activity.prompt}"
                </p>
              )}
              
              <p className="text-xs text-gray-400 mt-1">
                {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
              </p>
            </div>
            
            {/* Action button */}
            <a 
              href={`/${activity.type === 'generation' ? 'generate' : 'actors'}/${activity.actorId}`} 
              className="ml-2 text-xs text-primary-600 hover:text-primary-800 touch-target min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              View
            </a>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActivityFeed;
