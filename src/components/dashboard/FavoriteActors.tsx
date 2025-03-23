import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, orderBy, limit, getDocs, doc, updateDoc } from 'firebase/firestore';
import { firestore } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import ResponsiveImage from '../ui/ResponsiveImage';
import { 
  isFirebasePermissionError, 
  getUserFriendlyErrorMessage, 
  logPermissionError 
} from '../../utils/errorHandling';

interface Actor {
  id: string;
  name: string;
  imageUrl?: string;
  modelStatus: 'pending' | 'training' | 'completed' | 'failed';
  lastUsed?: Date;
  isFavorite?: boolean;
}

interface FavoriteActorsProps {
  limit?: number;
  className?: string;
}

/**
 * Component to display favorite and recently used actors
 * for quick access from the dashboard
 */
const FavoriteActors: React.FC<FavoriteActorsProps> = ({
  limit: itemLimit = 5,
  className = ''
}) => {
  const [actors, setActors] = useState<Actor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentUser } = useAuth();
  
  useEffect(() => {
    if (!currentUser) return;
    
    // Sample fallback actors for demo when Firebase permissions are not available
    const dummyActors: Actor[] = [
      {
        id: 'sample-1',
        name: 'John Doe',
        modelStatus: 'completed',
        lastUsed: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
        isFavorite: true
      },
      {
        id: 'sample-2',
        name: 'Jane Smith',
        modelStatus: 'training',
        lastUsed: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
        isFavorite: true
      },
      {
        id: 'sample-3',
        name: 'Alice Johnson',
        modelStatus: 'pending',
        lastUsed: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
        isFavorite: false
      }
    ];
    
    const fetchFavoriteActors = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Skip if user is not fully authenticated
        if (!currentUser.uid) {
          console.log("User is not fully authenticated yet");
          setActors([]);
          setLoading(false);
          return;
        }
        
        try {
          // First query favorites
          const favoritesQuery = query(
            collection(firestore, 'actors'),
            where('userId', '==', currentUser.uid),
            where('isFavorite', '==', true),
            orderBy('lastUsed', 'desc'),
            limit(itemLimit)
          );
          
          const favoritesSnapshot = await getDocs(favoritesQuery);
          const favoriteActors: Actor[] = [];
          
          favoritesSnapshot.forEach((doc) => {
            const data = doc.data();
            favoriteActors.push({
              id: doc.id,
              name: data.name,
              imageUrl: data.imageRefs?.[0]?.url,
              modelStatus: data.modelStatus,
              lastUsed: data.lastUsed?.toDate(),
              isFavorite: true
            });
          });
          
          // Then query recent actors if needed
          const recentActors: Actor[] = [];
          
          if (favoriteActors.length < itemLimit) {
            const remainingLimit = itemLimit - favoriteActors.length;
            
            const recentQuery = query(
              collection(firestore, 'actors'),
              where('userId', '==', currentUser.uid),
              where('isFavorite', '==', false),
              orderBy('lastUsed', 'desc'),
              limit(remainingLimit)
            );
            
            const recentSnapshot = await getDocs(recentQuery);
            
            recentSnapshot.forEach((doc) => {
              const data = doc.data();
              recentActors.push({
                id: doc.id,
                name: data.name,
                imageUrl: data.imageRefs?.[0]?.url,
                modelStatus: data.modelStatus,
                lastUsed: data.lastUsed?.toDate(),
                isFavorite: false
              });
            });
          }
          
          // Combine and set the actors
          setActors([...favoriteActors, ...recentActors]);
          setLoading(false);
        } catch (err: unknown) {
          console.error("Error in favorite actors query:", err);
          
          // If it's an index error, try a simpler query without the complex filters and order
          if (err instanceof Error && err.message && (err.message.includes("index") || err.message.includes("building"))) {
            console.log("Index is building, using simple query as fallback");
            
            // Fallback to a simpler query without ordering
            const simpleQuery = query(
              collection(firestore, 'actors'),
              where('userId', '==', currentUser.uid)
            );
            
            const simpleSnapshot = await getDocs(simpleQuery);
            const allActors: Actor[] = [];
            
            simpleSnapshot.forEach((doc) => {
              const data = doc.data();
              allActors.push({
                id: doc.id,
                name: data.name,
                imageUrl: data.imageRefs?.[0]?.url,
                modelStatus: data.modelStatus,
                lastUsed: data.lastUsed?.toDate(),
                isFavorite: !!data.isFavorite
              });
            });
            
            // Sort client-side instead
            allActors.sort((a, b) => {
              // First by favorite status
              if (a.isFavorite && !b.isFavorite) return -1;
              if (!a.isFavorite && b.isFavorite) return 1;
              
              // Then by lastUsed (most recent first)
              const dateA = a.lastUsed || new Date(0);
              const dateB = b.lastUsed || new Date(0);
              return dateB.getTime() - dateA.getTime();
            });
            
            // Take only the number we need
            setActors(allActors.slice(0, itemLimit));
            setError("Some features are temporarily limited while database indexes are being built. This may take a few minutes.");
          } else if (isFirebasePermissionError(err)) {
            // Check if it's a permissions error
            logPermissionError(err, 'actors', 'read');
            
            // Use dummy data for demo purposes
            console.log("Using dummy actor data due to permissions error");
            setActors(dummyActors);
            setError('This is a demo version. Using sample actor data.');
          } else {
            // Re-throw for other errors
            throw err;
          }
        }
      } catch (err) {
        console.error('Error fetching favorite actors:', err);
        setError(getUserFriendlyErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };
    
    fetchFavoriteActors();
  }, [currentUser, itemLimit]);
  
  // Toggle favorite status for an actor
  const toggleFavorite = async (actorId: string, currentFavorite: boolean) => {
    if (!currentUser) return;
    
    try {
      // Update in Firestore
      const actorRef = doc(firestore, 'actors', actorId);
      await updateDoc(actorRef, {
        isFavorite: !currentFavorite,
        lastUpdated: new Date()
      });
      
      // Update local state
      setActors(actors.map(actor => 
        actor.id === actorId 
          ? { ...actor, isFavorite: !currentFavorite }
          : actor
      ));
    } catch (err) {
      if (isFirebasePermissionError(err)) {
        logPermissionError(err, 'actors', 'write');
      } else {
        console.error('Error toggling favorite status:', err);
      }
      
      // Just update the local state for demo purposes when Firebase fails
      if (actorId.startsWith('sample-')) {
        setActors(actors.map(actor => 
          actor.id === actorId 
            ? { ...actor, isFavorite: !currentFavorite }
            : actor
        ));
      }
    }
  };
  
  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow p-4 ${className}`}>
        <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Access</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="animate-pulse">
              <div className="bg-gray-200 rounded-lg aspect-square mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  if (error && actors.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow p-4 ${className}`}>
        <h2 className="text-lg font-medium text-gray-900 mb-2">Quick Access</h2>
        <p className="text-red-500 text-sm">{error}</p>
      </div>
    );
  }
  
  if (actors.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow p-4 ${className}`}>
        <h2 className="text-lg font-medium text-gray-900 mb-2">Quick Access</h2>
        <p className="text-gray-500 text-sm">Create actors and mark them as favorites for quick access.</p>
      </div>
    );
  }
  
  return (
    <div className={`bg-white rounded-lg shadow p-4 ${className}`}>
      <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Access</h2>
      {error && (
        <div className="mb-3 bg-yellow-50 rounded-md p-2 text-sm text-yellow-700">
          {error}
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {actors.map((actor) => (
          <div key={actor.id} className="text-center">
            <div className="relative mb-2">
              <Link to={`/actors/${actor.id}`}>
                <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                  {actor.imageUrl ? (
                    <ResponsiveImage
                      src={actor.imageUrl}
                      alt={actor.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                </div>
              </Link>
              
              {/* Status indicator */}
              <div className={`absolute bottom-2 right-2 h-3 w-3 rounded-full ${
                actor.modelStatus === 'completed' ? 'bg-green-500' :
                actor.modelStatus === 'training' ? 'bg-blue-500' :
                actor.modelStatus === 'failed' ? 'bg-red-500' :
                'bg-yellow-500'
              } border border-white`}></div>
              
              {/* Favorite button */}
              <button
                onClick={() => toggleFavorite(actor.id, !!actor.isFavorite)}
                className="absolute top-2 right-2 touch-target min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label={actor.isFavorite ? "Remove from favorites" : "Add to favorites"}
              >
                {actor.isFavorite ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                )}
              </button>
            </div>
            <Link to={`/actors/${actor.id}`} className="text-sm font-medium text-gray-800 truncate block">
              {actor.name}
            </Link>
            {actor.modelStatus === 'completed' && (
              <Link 
                to={`/generate/${actor.id}`}
                className="text-xs text-primary-600 hover:text-primary-800"
              >
                Generate
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FavoriteActors;
