import React from 'react';
import { render, screen, waitFor } from '../../../tests/test-utils';
import { collection, query, where, getDocs } from 'firebase/firestore';
import ActorsList from '../ActorsList';

// Mock Firebase Firestore
jest.mock('firebase/firestore', () => ({
  ...jest.requireActual('firebase/firestore'),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
}));

// Mock the current user
jest.mock('../../../context/AuthContext', () => ({
  ...jest.requireActual('../../../context/AuthContext'),
  useAuth: () => ({
    currentUser: { uid: 'test-user-123' },
    loading: false,
  }),
}));

describe('ActorsList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock the Firestore query to return sample actors
    (collection as jest.Mock).mockReturnValue('actors-collection');
    (query as jest.Mock).mockReturnValue('actors-query');
    (where as jest.Mock).mockReturnValue('user-filter');
    (getDocs as jest.Mock).mockResolvedValue({
      docs: [
        {
          id: 'actor-1',
          data: () => ({
            name: 'Actor 1',
            gender: 'male',
            modelStatus: 'completed',
            createdAt: new Date(2023, 0, 1).toISOString(),
          }),
        },
        {
          id: 'actor-2',
          data: () => ({
            name: 'Actor 2',
            gender: 'female',
            modelStatus: 'training',
            createdAt: new Date(2023, 0, 2).toISOString(),
          }),
        },
        {
          id: 'actor-3',
          data: () => ({
            name: 'Actor 3',
            gender: 'non-binary',
            modelStatus: 'pending',
            createdAt: new Date(2023, 0, 3).toISOString(),
          }),
        },
      ],
    });
  });
  
  test('renders loading state initially', () => {
    render(<ActorsList />);
    
    expect(screen.getByText(/loading actors/i)).toBeInTheDocument();
  });
  
  test('renders list of actors after loading', async () => {
    render(<ActorsList />);
    
    // Wait for actors to load
    await waitFor(() => {
      expect(screen.queryByText(/loading actors/i)).not.toBeInTheDocument();
    });
    
    // Check if all actors are rendered
    expect(screen.getByText('Actor 1')).toBeInTheDocument();
    expect(screen.getByText('Actor 2')).toBeInTheDocument();
    expect(screen.getByText('Actor 3')).toBeInTheDocument();
  });
  
  test('displays correct model status for each actor', async () => {
    render(<ActorsList />);
    
    // Wait for actors to load
    await waitFor(() => {
      expect(screen.queryByText(/loading actors/i)).not.toBeInTheDocument();
    });
    
    // Check model status badges
    expect(screen.getByText('Ready')).toBeInTheDocument(); // For completed model
    expect(screen.getByText('Training')).toBeInTheDocument(); // For training model
    expect(screen.getByText('Pending')).toBeInTheDocument(); // For pending model
  });
  
  test('renders empty state when no actors are found', async () => {
    // Mock empty result
    (getDocs as jest.Mock).mockResolvedValueOnce({ docs: [] });
    
    render(<ActorsList />);
    
    // Wait for actors to load
    await waitFor(() => {
      expect(screen.queryByText(/loading actors/i)).not.toBeInTheDocument();
    });
    
    // Check for empty state message
    expect(screen.getByText(/no actors found/i)).toBeInTheDocument();
    expect(screen.getByText(/create your first actor/i)).toBeInTheDocument();
  });
  
  test('handles errors when loading actors', async () => {
    // Mock error
    (getDocs as jest.Mock).mockRejectedValueOnce(new Error('Failed to load actors'));
    
    render(<ActorsList />);
    
    // Wait for error state
    await waitFor(() => {
      expect(screen.getByText(/failed to load actors/i)).toBeInTheDocument();
    });
  });
});
