import React from 'react';
import { render, screen, fireEvent, waitFor } from '../../../tests/test-utils';
import { mockActor } from '../../../tests/test-utils';
import GenerationForm from '../GenerationForm';

// Mock the Firebase functions
jest.mock('firebase/functions', () => ({
  getFunctions: jest.fn(),
  httpsCallable: jest.fn(() => jest.fn(() => Promise.resolve({
    data: {
      imageId: 'test-image-123',
      url: 'https://example.com/generated-image.jpg'
    }
  }))),
}));

// Mock the actor fetching hook
jest.mock('../../../hooks/useActor', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    actor: mockActor,
    loading: false,
    error: null
  }))
}));

describe('GenerationForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('renders generation form with prompt input', () => {
    render(<GenerationForm actorId="test-actor-123" />);
    
    expect(screen.getByLabelText(/prompt/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /generate/i })).toBeInTheDocument();
  });
  
  test('shows validation error for empty prompt', async () => {
    render(<GenerationForm actorId="test-actor-123" />);
    
    fireEvent.click(screen.getByRole('button', { name: /generate/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/prompt is required/i)).toBeInTheDocument();
    });
  });
  
  test('shows loading state during generation', async () => {
    render(<GenerationForm actorId="test-actor-123" />);
    
    // Enter a prompt
    fireEvent.change(screen.getByLabelText(/prompt/i), {
      target: { value: 'A test prompt for image generation' }
    });
    
    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /generate/i }));
    
    // Check for loading state
    expect(screen.getByRole('button', { name: /generating/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /generating/i })).toBeDisabled();
    
    // Wait for generation to complete
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /generating/i })).not.toBeInTheDocument();
    });
  });
  
  test('shows generated image after successful generation', async () => {
    render(<GenerationForm actorId="test-actor-123" />);
    
    // Enter a prompt
    fireEvent.change(screen.getByLabelText(/prompt/i), {
      target: { value: 'A test prompt for image generation' }
    });
    
    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /generate/i }));
    
    // Wait for generation to complete
    await waitFor(() => {
      // Check for the generated image
      expect(screen.getByAltText(/generated image/i)).toBeInTheDocument();
      expect(screen.getByAltText(/generated image/i)).toHaveAttribute(
        'src',
        'https://example.com/generated-image.jpg'
      );
    });
  });
  
  test('shows error message on generation failure', async () => {
    // Mock the function to throw an error
    jest.mock('firebase/functions', () => ({
      getFunctions: jest.fn(),
      httpsCallable: jest.fn(() => jest.fn(() => Promise.reject(new Error('Generation failed')))),
    }));
    
    render(<GenerationForm actorId="test-actor-123" />);
    
    // Enter a prompt
    fireEvent.change(screen.getByLabelText(/prompt/i), {
      target: { value: 'A test prompt for image generation' }
    });
    
    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /generate/i }));
    
    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText(/failed to generate image/i)).toBeInTheDocument();
    });
  });
});
