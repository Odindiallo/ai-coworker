import React from 'react';
import { render, screen, fireEvent, waitFor } from '../../../tests/test-utils';
import { addDoc, collection } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import ActorCreationForm from '../ActorCreationForm';

// Mock Firebase
jest.mock('firebase/firestore', () => ({
  ...jest.requireActual('firebase/firestore'),
  addDoc: jest.fn(),
  collection: jest.fn(),
  serverTimestamp: jest.fn(() => 'mocked-timestamp'),
}));

jest.mock('firebase/storage', () => ({
  ...jest.requireActual('firebase/storage'),
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn(),
}));

describe('ActorCreationForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful file upload
    (ref as jest.Mock).mockReturnValue('storage-ref');
    (uploadBytes as jest.Mock).mockResolvedValue({});
    (getDownloadURL as jest.Mock).mockResolvedValue('https://example.com/image.jpg');
    
    // Mock successful Firestore document creation
    (collection as jest.Mock).mockReturnValue('actors-collection');
    (addDoc as jest.Mock).mockResolvedValue({ id: 'new-actor-123' });
  });
  
  test('renders actor creation form', () => {
    render(<ActorCreationForm />);
    
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/gender/i)).toBeInTheDocument();
    expect(screen.getByText(/upload photos/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create actor/i })).toBeInTheDocument();
  });
  
  test('shows validation errors for empty fields', async () => {
    render(<ActorCreationForm />);
    
    fireEvent.click(screen.getByRole('button', { name: /create actor/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/please select a gender/i)).toBeInTheDocument();
      expect(screen.getByText(/please upload at least one photo/i)).toBeInTheDocument();
    });
  });
  
  test('handles file uploads correctly', async () => {
    render(<ActorCreationForm />);
    
    // Mock file input
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const fileInput = screen.getByTestId('file-input');
    
    // Trigger file selection
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    // Check if the file is displayed
    await waitFor(() => {
      expect(screen.getByText(/test.jpg/i)).toBeInTheDocument();
    });
  });
  
  test('submits the form with valid data', async () => {
    render(<ActorCreationForm />);
    
    // Fill in the form
    fireEvent.change(screen.getByLabelText(/name/i), {
      target: { value: 'Test Actor' },
    });
    
    fireEvent.change(screen.getByLabelText(/gender/i), {
      target: { value: 'male' },
    });
    
    // Mock file input
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const fileInput = screen.getByTestId('file-input');
    
    // Trigger file selection
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /create actor/i }));
    
    await waitFor(() => {
      // Check if file was uploaded
      expect(uploadBytes).toHaveBeenCalled();
      
      // Check if document was created
      expect(addDoc).toHaveBeenCalledWith('actors-collection', expect.objectContaining({
        name: 'Test Actor',
        gender: 'male',
        modelStatus: 'pending',
      }));
    });
  });
});
