describe('Offline Support', () => {
  beforeEach(() => {
    // Login first to establish authentication state
    cy.login();
    
    // Create a test actor to ensure we have data
    cy.createActor('Offline Test Actor');
  });

  it('should detect when the user is offline', () => {
    // Visit dashboard
    cy.visit('/dashboard');
    
    // Simulate going offline
    cy.window().then(win => {
      win.dispatchEvent(new win.Event('offline'));
    });
    
    // Should show offline indicator
    cy.get('[data-testid="offline-indicator"]').should('be.visible');
    cy.contains('You are currently offline').should('be.visible');
  });

  it('should show cached actors when offline', () => {
    // Visit actors page to cache the actors
    cy.visit('/actors');
    cy.contains('Offline Test Actor').should('be.visible');
    
    // Simulate going offline
    cy.window().then(win => {
      win.dispatchEvent(new win.Event('offline'));
    });
    
    // Reload the page
    cy.reload();
    
    // Should still display the cached actors
    cy.contains('Offline Test Actor').should('be.visible');
    cy.contains('Viewing cached data').should('be.visible');
  });

  it('should queue operations when offline', () => {
    // Visit actor detail page
    cy.visit('/actors/test-actor-123');
    
    // Simulate going offline
    cy.window().then(win => {
      win.dispatchEvent(new win.Event('offline'));
    });
    
    // Attempt to update the actor name
    cy.get('[data-testid="edit-actor-name"]').click();
    cy.get('input[name="actorName"]').clear().type('Updated While Offline');
    cy.get('button[type="submit"]').click();
    
    // Should show pending changes notification
    cy.contains('Changes will be saved when you go back online').should('be.visible');
    
    // Simulate going back online
    cy.window().then(win => {
      win.dispatchEvent(new win.Event('online'));
    });
    
    // Should show syncing notification
    cy.contains('Syncing your changes...').should('be.visible');
    
    // Should show success notification after sync
    cy.contains('Changes synced successfully').should('be.visible');
    
    // Name should be updated
    cy.contains('Updated While Offline').should('be.visible');
  });

  it('should handle image viewing in offline mode', () => {
    // First visit gallery to cache images
    cy.visit('/gallery');
    
    // Wait for images to load
    cy.get('[data-testid="gallery-image"]').should('have.length.at.least', 1);
    
    // Simulate going offline
    cy.window().then(win => {
      win.dispatchEvent(new win.Event('offline'));
    });
    
    // Reload the page
    cy.reload();
    
    // Should still display cached images
    cy.get('[data-testid="gallery-image"]').should('have.length.at.least', 1);
    cy.contains('Viewing cached images').should('be.visible');
  });

  it('should recover gracefully when going back online', () => {
    // Visit dashboard
    cy.visit('/dashboard');
    
    // Simulate going offline
    cy.window().then(win => {
      win.dispatchEvent(new win.Event('offline'));
    });
    
    // Offline indicator should appear
    cy.get('[data-testid="offline-indicator"]').should('be.visible');
    
    // Simulate going back online
    cy.window().then(win => {
      win.dispatchEvent(new win.Event('online'));
    });
    
    // Offline indicator should disappear
    cy.get('[data-testid="offline-indicator"]').should('not.exist');
    
    // Should show back online notification
    cy.contains('You are back online').should('be.visible');
    
    // Should automatically refresh data
    cy.contains('Refreshing data...').should('be.visible');
  });

  it('should prevent image generation while offline', () => {
    // Visit image generation page
    cy.visit('/actors/test-actor-123/generate');
    
    // Simulate going offline
    cy.window().then(win => {
      win.dispatchEvent(new win.Event('offline'));
    });
    
    // Generation form should be disabled
    cy.get('textarea[name="prompt"]').should('be.disabled');
    cy.get('button[type="submit"]').should('be.disabled');
    
    // Should show offline warning
    cy.contains('Image generation requires an internet connection').should('be.visible');
  });

  it('should show offline-friendly help content', () => {
    // Visit help page
    cy.visit('/help');
    
    // Simulate going offline
    cy.window().then(win => {
      win.dispatchEvent(new win.Event('offline'));
    });
    
    // Reload the page
    cy.reload();
    
    // Help content should still be available
    cy.contains('How to use the AI Actor Generator').should('be.visible');
    cy.contains('Offline Help Guide').should('be.visible');
    
    // Online-only content should be hidden
    cy.contains('Video Tutorials').should('not.exist');
  });

  it('should allow browsing actors while offline', () => {
    // Visit actors page to cache data
    cy.visit('/actors');
    
    // Simulate going offline
    cy.window().then(win => {
      win.dispatchEvent(new win.Event('offline'));
    });
    
    // Should still allow navigation to actor details
    cy.contains('Offline Test Actor').click();
    
    // Should display actor details from cache
    cy.url().should('include', '/actors/');
    cy.contains('Offline Test Actor').should('be.visible');
    cy.contains('Viewing cached data').should('be.visible');
    
    // Online-only features should be disabled
    cy.get('[data-testid="generate-image-button"]').should('be.disabled');
  });
});
