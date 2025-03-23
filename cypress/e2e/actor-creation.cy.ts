describe('Actor Creation', () => {
  beforeEach(() => {
    // Login before each test
    cy.login();
  });

  it('should navigate to actor creation page', () => {
    cy.visit('/dashboard');
    cy.get('[data-testid="create-actor-button"]').click();
    cy.url().should('include', '/create-actor');
  });

  it('should validate actor creation form', () => {
    cy.visit('/create-actor');
    
    // Submit empty form
    cy.get('button[type="submit"]').click();
    
    // Should show validation errors
    cy.contains('Name is required').should('be.visible');
    cy.contains('Please select a gender').should('be.visible');
    cy.contains('Please upload at least one photo').should('be.visible');
  });

  it('should create a new actor successfully', () => {
    cy.visit('/create-actor');
    
    // Fill form
    cy.get('input[name="actorName"]').type('Test Actor');
    cy.get('select[name="gender"]').select('male');
    
    // Upload image
    cy.fixture('test-image.jpg').then(fileContent => {
      cy.get('input[type="file"]').attachFile({
        fileContent,
        fileName: 'test-image.jpg',
        mimeType: 'image/jpeg'
      });
    });
    
    // Submit form
    cy.get('button[type="submit"]').click();
    
    // Should show loading state
    cy.contains('Creating actor...').should('be.visible');
    
    // Should redirect to actor detail page after creation
    cy.url().should('include', '/actors/');
    cy.contains('Test Actor').should('be.visible');
    cy.contains('Pending').should('be.visible'); // Initial model status
  });

  it('should display uploaded images in the preview', () => {
    cy.visit('/create-actor');
    
    // Upload multiple images
    cy.fixture('test-image.jpg').then(fileContent => {
      const testFile1 = {
        fileContent,
        fileName: 'test-image1.jpg',
        mimeType: 'image/jpeg'
      };
      const testFile2 = {
        fileContent,
        fileName: 'test-image2.jpg',
        mimeType: 'image/jpeg'
      };
      
      cy.get('input[type="file"]').attachFile([testFile1, testFile2]);
    });
    
    // Should display image previews
    cy.get('[data-testid="image-preview"]').should('have.length', 2);
    cy.contains('test-image1.jpg').should('be.visible');
    cy.contains('test-image2.jpg').should('be.visible');
  });

  it('should allow removing images from the upload list', () => {
    cy.visit('/create-actor');
    
    // Upload an image
    cy.fixture('test-image.jpg').then(fileContent => {
      cy.get('input[type="file"]').attachFile({
        fileContent,
        fileName: 'test-image.jpg',
        mimeType: 'image/jpeg'
      });
    });
    
    // Should display image preview
    cy.get('[data-testid="image-preview"]').should('have.length', 1);
    
    // Remove the image
    cy.get('[data-testid="remove-image-button"]').click();
    
    // Image preview should be removed
    cy.get('[data-testid="image-preview"]').should('not.exist');
  });

  it('should handle network errors during actor creation', () => {
    // Mock network failure
    cy.intercept('POST', '**/createActor*', {
      statusCode: 500,
      body: { error: 'Server error' },
      delay: 100
    }).as('createActorRequest');
    
    cy.visit('/create-actor');
    
    // Fill form
    cy.get('input[name="actorName"]').type('Error Test Actor');
    cy.get('select[name="gender"]').select('female');
    
    // Upload image
    cy.fixture('test-image.jpg').then(fileContent => {
      cy.get('input[type="file"]').attachFile({
        fileContent,
        fileName: 'test-image.jpg',
        mimeType: 'image/jpeg'
      });
    });
    
    // Submit form
    cy.get('button[type="submit"]').click();
    
    // Should show error message
    cy.contains('Failed to create actor').should('be.visible');
    
    // Should stay on creation page
    cy.url().should('include', '/create-actor');
  });
});
