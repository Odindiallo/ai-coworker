import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

// Create a custom renderer that includes providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <BrowserRouter>
      {children}
    </BrowserRouter>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// re-export everything
export * from '@testing-library/react';

// override render method
export { customRender as render };

// Mock user data
export const mockUser = {
  uid: 'test-user-123',
  email: 'test@example.com',
  displayName: 'Test User',
};

// Mock actor data
export const mockActor = {
  id: 'test-actor-123',
  name: 'Test Actor',
  gender: 'male',
  userId: 'test-user-123',
  createdAt: new Date().toISOString(),
  modelStatus: 'completed',
  modelId: 'test-model-123',
};

// Mock generated image data
export const mockGeneratedImage = {
  id: 'test-image-123',
  userId: 'test-user-123',
  actorId: 'test-actor-123',
  prompt: 'A test prompt',
  url: 'https://example.com/image.jpg',
  createdAt: new Date().toISOString(),
};
