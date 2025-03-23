describe('Image Generation', () => {
  beforeEach(() => {
    // Login and navigate to an actor's detail page
    cy.login();
    cy.createActor('Generation Test Actor');
    cy.visit('/actors/test-actor-123'); // Using mock ID from custom command
  });

  it('should show the image generation form', () => {
    cy.contains('Generate New Images').should('be.visible');
    cy.get('textarea[name="prompt"]').should('be.visible');
    cy.get('button[type="submit"]').contains('Generate').should('be.visible');
  });

  it('should validate the prompt field', () => {
    cy.get('button[type="submit"]').contains('Generate').click();
    cy.contains('Prompt is required').should('be.visible');
  });

  it('should generate an image with a valid prompt', () => {
    // Type a prompt
    cy.get('textarea[name="prompt"]').type('A professional headshot in an office setting');
    
    // Submit the form
    cy.get('button[type="submit"]').contains('Generate').click();
    
    // Should show loading state
    cy.contains('Generating...').should('be.visible');
    
    // Wait for generation to complete
    cy.contains('Generating...', { timeout: 10000 }).should('not.exist');
    
    // Generated image should be displayed
    cy.get('[data-testid="generated-image"]').should('be.visible');
    
    // Generation details should be displayed
    cy.contains('A professional headshot in an office setting').should('be.visible');
  });

  it('should allow downloading the generated image', () => {
    // First generate an image
    cy.get('textarea[name="prompt"]').type('A casual portrait in a park');
    cy.get('button[type="submit"]').contains('Generate').click();
    
    // Wait for generation to complete
    cy.contains('Generating...', { timeout: 10000 }).should('not.exist');
    
    // Check that download button exists
    cy.get('[data-testid="download-button"]').should('be.visible');
    
    // Mock the download (we can't fully test the download in Cypress)
    cy.get('[data-testid="download-button"]').click();
    
    // Could check for download notification or other UI indication
    cy.contains('Image downloaded successfully').should('be.visible');
  });

  it('should show generation history', () => {
    // Generate multiple images
    const prompts = [
      'A portrait in a business setting',
      'A casual portrait on the beach'
    ];
    
    // Generate first image
    cy.get('textarea[name="prompt"]').type(prompts[0]);
    cy.get('button[type="submit"]').contains('Generate').click();
    cy.contains('Generating...', { timeout: 10000 }).should('not.exist');
    
    // Generate second image
    cy.get('textarea[name="prompt"]').clear().type(prompts[1]);
    cy.get('button[type="submit"]').contains('Generate').click();
    cy.contains('Generating...', { timeout: 10000 }).should('not.exist');
    
    // Check history section
    cy.contains('Generation History').should('be.visible');
    
    // Both prompts should be visible in the history
    cy.contains(prompts[0]).should('be.visible');
    cy.contains(prompts[1]).should('be.visible');
    
    // Check that there are two images in the history
    cy.get('[data-testid="history-item"]').should('have.length', 2);
  });

  it('should handle generation errors gracefully', () => {
    // Mock a generation failure
    cy.intercept('POST', '**/generateImage*', {
      statusCode: 500,
      body: { error: 'Generation failed' },
      delay: 100
    }).as('generateImageRequest');
    
    // Type a prompt
    cy.get('textarea[name="prompt"]').type('This should fail');
    
    // Submit the form
    cy.get('button[type="submit"]').contains('Generate').click();
    
    // Should show loading state
    cy.contains('Generating...').should('be.visible');
    
    // Wait for error
    cy.contains('Failed to generate image').should('be.visible');
    
    // Form should be reset for retry
    cy.get('textarea[name="prompt"]').should('have.value', 'This should fail');
    cy.get('button[type="submit"]').contains('Generate').should('be.enabled');
  });

  it('should show generation parameters for advanced users', () => {
    // Open advanced parameters
    cy.contains('Advanced Parameters').click();
    
    // Advanced parameters should be visible
    cy.get('input[name="steps"]').should('be.visible');
    cy.get('input[name="guidance"]').should('be.visible');
    cy.get('select[name="size"]').should('be.visible');
    
    // Set custom parameters
    cy.get('input[name="steps"]').clear().type('30');
    cy.get('input[name="guidance"]').clear().type('7.5');
    cy.get('select[name="size"]').select('768x768');
    
    // Type a prompt
    cy.get('textarea[name="prompt"]').type('A portrait with custom parameters');
    
    // Submit the form
    cy.get('button[type="submit"]').contains('Generate').click();
    
    // Wait for generation to complete
    cy.contains('Generating...', { timeout: 10000 }).should('not.exist');
    
    // Custom parameters should be displayed with the result
    cy.contains('Steps: 30').should('be.visible');
    cy.contains('Guidance: 7.5').should('be.visible');
    cy.contains('Size: 768x768').should('be.visible');
  });
});
