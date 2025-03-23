/**
 * Query Optimizer for Firestore
 * 
 * This utility provides optimized query patterns to minimize reads and costs
 * when working with Firestore, especially important for staying within free tier limits.
 */

import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter,
  DocumentData,
  QueryDocumentSnapshot,
  FirestoreError,
  onSnapshot,
  QueryConstraint
} from 'firebase/firestore';
import { firestore } from './firebase';
import { logError } from './crashlytics';

// Constants for query limits
const PAGINATION_LIMIT_SMALL = 5;
const PAGINATION_LIMIT_MEDIUM = 10;
const PAGINATION_LIMIT_LARGE = 20;
const MAX_FREE_TIER_DAILY_READS = 50000; // Firebase free tier limit

/**
 * Create an optimized paginated query for collection
 * @param collectionPath Collection path
 * @param userId User ID for filtering
 * @param orderByField Field to order by
 * @param orderDirection Order direction ('asc' or 'desc')
 * @param pageSize Number of documents to fetch
 * @param startAfterDoc Last document from previous page
 * @param additionalConstraints Additional query constraints
 * @returns A query object
 */
export const createPaginatedQuery = (
  collectionPath: string,
  userId: string,
  orderByField: string = 'createdAt',
  orderDirection: 'asc' | 'desc' = 'desc',
  pageSize: number = PAGINATION_LIMIT_MEDIUM,
  startAfterDoc?: QueryDocumentSnapshot<DocumentData>,
  additionalConstraints: QueryConstraint[] = []
) => {
  // Start with base constraints
  const constraints: QueryConstraint[] = [
    where('userId', '==', userId),
    orderBy(orderByField, orderDirection),
    limit(pageSize)
  ];
  
  // Add pagination constraint if we have a starting document
  if (startAfterDoc) {
    constraints.push(startAfter(startAfterDoc));
  }
  
  // Add any additional constraints
  constraints.push(...additionalConstraints);
  
  // Create and return the query
  return query(
    collection(firestore, collectionPath),
    ...constraints
  );
};

/**
 * Fetch a single page of data with pagination
 * @param collectionPath Collection path
 * @param userId User ID for filtering
 * @param orderByField Field to order by
 * @param orderDirection Order direction ('asc' or 'desc')
 * @param pageSize Number of documents to fetch 
 * @param startAfterDoc Last document from previous page
 * @param additionalConstraints Additional query constraints
 * @returns Promise with array of documents and last document for pagination
 */
export const fetchPaginatedData = async (
  collectionPath: string,
  userId: string,
  orderByField: string = 'createdAt',
  orderDirection: 'asc' | 'desc' = 'desc',
  pageSize: number = PAGINATION_LIMIT_MEDIUM,
  startAfterDoc?: QueryDocumentSnapshot<DocumentData>,
  additionalConstraints: QueryConstraint[] = []
) => {
  try {
    const q = createPaginatedQuery(
      collectionPath,
      userId,
      orderByField,
      orderDirection,
      pageSize,
      startAfterDoc,
      additionalConstraints
    );
    
    const querySnapshot = await getDocs(q);
    const items: { id: string; [key: string]: any }[] = [];
    
    querySnapshot.forEach((doc) => {
      items.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Get the last document for pagination
    const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
    
    // Check if there are more items
    const hasMore = querySnapshot.docs.length === pageSize;
    
    return {
      items,
      lastDoc,
      hasMore
    };
  } catch (error) {
    logError(error as Error, {
      context: 'fetchPaginatedData',
      collectionPath,
      userId
    });
    throw error;
  }
};

/**
 * Create an optimized real-time listener with built-in error handling and cleanup
 * @param collectionPath Collection path
 * @param userId User ID for filtering
 * @param onDataUpdate Callback function when data changes
 * @param onError Callback function when an error occurs 
 * @param orderByField Field to order by
 * @param orderDirection Order direction ('asc' or 'desc')
 * @param limitCount Number of documents to fetch
 * @param additionalConstraints Additional query constraints
 * @returns Unsubscribe function to clean up the listener
 */
export const createOptimizedListener = (
  collectionPath: string,
  userId: string,
  onDataUpdate: (items: { id: string; [key: string]: any }[]) => void,
  onError: (error: FirestoreError) => void,
  orderByField: string = 'createdAt',
  orderDirection: 'asc' | 'desc' = 'desc',
  limitCount: number = PAGINATION_LIMIT_MEDIUM,
  additionalConstraints: QueryConstraint[] = []
) => {
  const constraints: QueryConstraint[] = [
    where('userId', '==', userId),
    orderBy(orderByField, orderDirection),
    limit(limitCount),
    ...additionalConstraints
  ];
  
  // Create query
  const q = query(
    collection(firestore, collectionPath),
    ...constraints
  );
  
  // Set up the listener
  const unsubscribe = onSnapshot(
    q,
    (querySnapshot) => {
      const items: { id: string; [key: string]: any }[] = [];
      
      querySnapshot.forEach((doc) => {
        items.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      onDataUpdate(items);
    },
    (error) => {
      logError(error, {
        context: 'createOptimizedListener',
        collectionPath,
        userId
      });
      onError(error);
    }
  );
  
  return unsubscribe;
};

/**
 * Efficient batched query to get data for multiple IDs
 * More efficient than individual doc() calls
 * @param collectionPath Collection path
 * @param ids Array of document IDs to fetch
 * @returns Promise with array of documents
 */
export const fetchMultipleDocuments = async (
  collectionPath: string,
  ids: string[]
) => {
  if (ids.length === 0) return [];
  
  try {
    // For free tier optimization, process in smaller batches
    // Firestore "in" query is limited to 10 values
    const BATCH_SIZE = 10;
    const results: { id: string; [key: string]: any }[] = [];
    
    // Process IDs in batches
    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      const batchIds = ids.slice(i, i + BATCH_SIZE);
      
      const q = query(
        collection(firestore, collectionPath),
        where(documentId(), 'in', batchIds)
      );
      
      const querySnapshot = await getDocs(q);
      
      querySnapshot.forEach((doc) => {
        results.push({
          id: doc.id,
          ...doc.data()
        });
      });
    }
    
    return results;
  } catch (error) {
    logError(error as Error, {
      context: 'fetchMultipleDocuments',
      collectionPath,
      idCount: ids.length
    });
    throw error;
  }
};

/**
 * Get estimated query cost for Firestore
 * @param queryParams Parameters of the query
 * @returns Estimated document reads
 */
export const estimateQueryCost = (queryParams: {
  collectionSize: number;
  useIndex: boolean;
  hasCursors: boolean;
  filterEqualityCount: number;
}): number => {
  const { collectionSize, useIndex, hasCursors, filterEqualityCount } = queryParams;
  
  // For indexed queries, cost is roughly the result size plus index entries
  if (useIndex) {
    // Assume an index reduces the result set proportionally
    const reductionFactor = Math.pow(0.1, filterEqualityCount);
    const estimatedResults = Math.max(1, Math.ceil(collectionSize * reductionFactor));
    
    // Add extra cost for cursor operations
    const cursorCost = hasCursors ? 1 : 0;
    
    return estimatedResults + cursorCost;
  }
  
  // For collection scans, cost is the entire collection
  return collectionSize;
};

// Add missing imports
import { getDocs, documentId } from 'firebase/firestore';

export default {
  createPaginatedQuery,
  fetchPaginatedData,
  createOptimizedListener,
  fetchMultipleDocuments,
  estimateQueryCost,
  PAGINATION_LIMIT_SMALL,
  PAGINATION_LIMIT_MEDIUM,
  PAGINATION_LIMIT_LARGE
};
