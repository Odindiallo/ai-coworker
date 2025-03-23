/// <reference types="cypress" />

// Custom command to login
Cypress.Commands.add('login', (email = 'test@example.com', password = 'password123') => {
  cy.visit('/login');
  cy.get('input[name="email"]').type(email);
  cy.get('input[name="password"]').type(password);
  cy.get('button[type="submit"]').click();
  cy.url().should('not.include', '/login');
});

// Custom command to handle file upload
Cypress.Commands.add('uploadFile', { prevSubject: 'element' }, (subject, fileName, fileType = '') => {
  cy.fixture(fileName)
    .then(Cypress.Blob.base64StringToBlob)
    .then((blob) => {
      const el = subject[0];
      const testFile = new File([blob], fileName, { type: fileType });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(testFile);
      el.files = dataTransfer.files;
      return cy.wrap(subject).trigger('change', { force: true });
    });
});

// Mock actor creation
Cypress.Commands.add('createActor', (name = 'Test Actor') => {
  cy.login();
  cy.visit('/create-actor');
  cy.get('input[name="actorName"]').type(name);
  cy.get('select[name="gender"]').select('male');
  cy.get('input[type="file"]').uploadFile('test-image.jpg', 'image/jpeg');
  cy.get('button[type="submit"]').click();
  cy.url().should('include', '/actors');
});

// Declare global Cypress namespace to add custom commands
declare global {
  namespace Cypress {
    interface Chainable {
      login(email?: string, password?: string): Chainable<void>;
      uploadFile(fileName: string, fileType?: string): Chainable<Element>;
      createActor(name?: string): Chainable<void>;
    }
  }
}

export {};
