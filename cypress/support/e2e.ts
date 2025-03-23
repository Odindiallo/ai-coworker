// Import commands.js
import './commands';

// Configure cypress
Cypress.config('viewportWidth', 375);
Cypress.config('viewportHeight', 667);

// Firebase Auth mock
Cypress.on('window:before:load', (win) => {
  // Stub Firebase Auth
  win.firebase = {
    auth: () => ({
      signInWithEmailAndPassword: () => Promise.resolve({ user: { uid: 'test-user-123' } }),
      createUserWithEmailAndPassword: () => Promise.resolve({ user: { uid: 'test-user-123' } }),
      onAuthStateChanged: (callback) => {
        callback({ uid: 'test-user-123', email: 'test@example.com' });
        return () => {};
      },
      signOut: () => Promise.resolve(),
    }),
    firestore: () => ({
      collection: () => ({
        add: () => Promise.resolve({ id: 'test-doc-123' }),
        doc: () => ({
          get: () => Promise.resolve({
            exists: true,
            data: () => ({
              name: 'Test Actor',
              gender: 'male',
              userId: 'test-user-123',
              createdAt: new Date().toISOString(),
              modelStatus: 'completed',
            }),
            id: 'test-doc-123',
          }),
          set: () => Promise.resolve(),
          update: () => Promise.resolve(),
          delete: () => Promise.resolve(),
        }),
        where: () => ({
          get: () => Promise.resolve({
            docs: [
              {
                id: 'test-doc-123',
                data: () => ({
                  name: 'Test Actor',
                  gender: 'male',
                  userId: 'test-user-123',
                  createdAt: new Date().toISOString(),
                  modelStatus: 'completed',
                }),
              },
            ],
          }),
        }),
      }),
    }),
    storage: () => ({
      ref: () => ({
        put: () => ({
          on: (event, progressCallback, errorCallback, completeCallback) => {
            progressCallback({ bytesTransferred: 100, totalBytes: 100 });
            completeCallback();
          },
          then: (callback) => {
            callback();
            return { catch: () => {} };
          },
        }),
        getDownloadURL: () => Promise.resolve('https://example.com/image.jpg'),
      }),
    }),
  };
});
