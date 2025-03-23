describe('Authentication', () => {
  beforeEach(() => {
    // Reset any existing authentication state
    cy.window().then((win) => {
      win.indexedDB.deleteDatabase('firebaseLocalStorageDb');
    });
  });

  it('should allow user to register', () => {
    cy.visit('/register');
    
    // Fill out registration form
    cy.get('input[name="email"]').type('newuser@example.com');
    cy.get('input[name="password"]').type('securepassword123');
    cy.get('input[name="confirmPassword"]').type('securepassword123');
    
    // Submit form
    cy.get('button[type="submit"]').click();
    
    // Should redirect to dashboard after successful registration
    cy.url().should('include', '/dashboard');
    cy.contains('Welcome to AI Actor Generator').should('be.visible');
  });

  it('should show validation errors on registration form', () => {
    cy.visit('/register');
    
    // Submit empty form
    cy.get('button[type="submit"]').click();
    
    // Should show required field errors
    cy.contains('Email is required').should('be.visible');
    cy.contains('Password is required').should('be.visible');
    
    // Try password mismatch
    cy.get('input[name="email"]').type('test@example.com');
    cy.get('input[name="password"]').type('password123');
    cy.get('input[name="confirmPassword"]').type('differentpassword');
    cy.get('button[type="submit"]').click();
    
    // Should show password mismatch error
    cy.contains('Passwords do not match').should('be.visible');
  });

  it('should allow user to login and logout', () => {
    // Visit login page
    cy.visit('/login');
    
    // Fill login form
    cy.get('input[name="email"]').type('test@example.com');
    cy.get('input[name="password"]').type('password123');
    
    // Submit form
    cy.get('button[type="submit"]').click();
    
    // Should redirect to dashboard after successful login
    cy.url().should('include', '/dashboard');
    
    // Should display user email in profile or header
    cy.contains('test@example.com').should('be.visible');
    
    // Logout
    cy.get('[data-testid="logout-button"]').click();
    
    // Should redirect to login page
    cy.url().should('include', '/login');
  });

  it('should handle login failure correctly', () => {
    cy.visit('/login');
    
    // Fill with incorrect credentials
    cy.get('input[name="email"]').type('wrong@example.com');
    cy.get('input[name="password"]').type('wrongpassword');
    
    // Submit form
    cy.get('button[type="submit"]').click();
    
    // Should show error message
    cy.contains('Invalid email or password').should('be.visible');
    
    // Should stay on login page
    cy.url().should('include', '/login');
  });

  it('should protect routes that require authentication', () => {
    // Try to access protected page without login
    cy.visit('/create-actor');
    
    // Should redirect to login page
    cy.url().should('include', '/login');
    
    // Should show message about needing to login
    cy.contains('Please login to access this page').should('be.visible');
  });
});
