describe('Mobile Responsiveness', () => {
  // Different mobile device viewports to test
  const devices = [
    { name: 'iPhone SE', width: 375, height: 667 },
    { name: 'iPhone X', width: 375, height: 812 },
    { name: 'Samsung Galaxy S8', width: 360, height: 740 },
    { name: 'iPad', width: 768, height: 1024 },
  ];

  beforeEach(() => {
    cy.login();
  });

  devices.forEach((device) => {
    describe(`${device.name} (${device.width}x${device.height})`, () => {
      beforeEach(() => {
        cy.viewport(device.width, device.height);
      });

      it('should display mobile navigation properly', () => {
        cy.visit('/dashboard');
        
        // Bottom navigation should be visible on mobile
        cy.get('[data-testid="mobile-navigation"]').should('be.visible');
        
        // Hamburger menu icon should be visible
        cy.get('[data-testid="menu-toggle"]').should('be.visible');
        
        // Regular nav should be hidden
        cy.get('[data-testid="desktop-navigation"]').should('not.be.visible');
        
        // Open menu
        cy.get('[data-testid="menu-toggle"]').click();
        
        // Mobile menu should slide in
        cy.get('[data-testid="mobile-menu"]').should('be.visible');
        
        // All navigation items should be visible
        cy.contains('Dashboard').should('be.visible');
        cy.contains('Actors').should('be.visible');
        cy.contains('Gallery').should('be.visible');
        cy.contains('Settings').should('be.visible');
        
        // Close menu
        cy.get('[data-testid="close-menu"]').click();
      });

      it('should have proper touch targets on actor cards', () => {
        // Create a test actor first
        cy.createActor('Mobile Test Actor');
        cy.visit('/dashboard');
        
        // Actor cards should be full width
        cy.get('[data-testid="actor-card"]').should('have.css', 'width', `${device.width}px`);
        
        // Action buttons should be properly sized for touch
        cy.get('[data-testid="actor-card-button"]').should(($btn) => {
          // Check that height and width are at least 44px (iOS minimum tap target)
          const rect = $btn[0].getBoundingClientRect();
          expect(rect.height).to.be.at.least(44);
          expect(rect.width).to.be.at.least(44);
        });
      });

      it('should handle image upload on mobile', () => {
        cy.visit('/create-actor');
        
        // File input should be visible
        cy.get('input[type="file"]').should('exist');
        
        // Mobile-specific camera access should be available
        if (device.width < 768) {
          cy.get('[data-testid="camera-capture"]').should('be.visible');
        }
        
        // Upload via file input should work
        cy.fixture('test-image.jpg').then(fileContent => {
          cy.get('input[type="file"]').attachFile({
            fileContent,
            fileName: 'test-image.jpg',
            mimeType: 'image/jpeg'
          });
        });
        
        // Preview should be responsive
        cy.get('[data-testid="image-preview"]').should('have.css', 'max-width', '100%');
      });

      it('should have responsive image generation UI', () => {
        // Go to image generation page
        cy.createActor('Mobile Test Actor');
        cy.visit('/actors/test-actor-123/generate');
        
        // Prompt textarea should be full width
        cy.get('textarea[name="prompt"]').should(($el) => {
          const rect = $el[0].getBoundingClientRect();
          // Allow some margin, so slightly less than viewport width
          expect(rect.width).to.be.greaterThan(device.width * 0.8);
        });
        
        // Generate button should be large enough for touch
        cy.get('button[type="submit"]').should(($btn) => {
          const rect = $btn[0].getBoundingClientRect();
          expect(rect.height).to.be.at.least(44);
          expect(rect.width).to.be.at.least(44);
        });
        
        // Generated images should be responsive
        cy.get('textarea[name="prompt"]').type('A test prompt');
        cy.get('button[type="submit"]').click();
        
        // Wait for generation to complete
        cy.contains('Generating...', { timeout: 10000 }).should('not.exist');
        
        // Image should be constrained to viewport
        cy.get('[data-testid="generated-image"]').should(($img) => {
          const rect = $img[0].getBoundingClientRect();
          expect(rect.width).to.be.at.most(device.width);
        });
      });

      it('should handle network conditions gracefully', () => {
        // Throttle network
        cy.visit('/dashboard', {
          onBeforeLoad(win) {
            // Mock navigator.connection
            Object.defineProperty(win.navigator, 'connection', {
              value: { effectiveType: '2g', type: 'cellular' },
              configurable: true
            });
          }
        });
        
        // Should display network status
        cy.contains('Slow connection detected').should('be.visible');
        
        // Should load low-res images when on slow connection
        cy.get('[data-testid="actor-image"]').should('have.attr', 'data-quality', 'low');
        
        // Should offer to load high quality when requested
        cy.get('[data-testid="load-high-quality"]').click();
        cy.get('[data-testid="actor-image"]').should('have.attr', 'data-quality', 'high');
      });

      it('should support pull-to-refresh on mobile', () => {
        cy.visit('/dashboard', {
          onBeforeLoad(win) {
            // Mock pull-to-refresh behavior
            const pullToRefreshEvent = new CustomEvent('pull-to-refresh');
            setTimeout(() => {
              win.document.dispatchEvent(pullToRefreshEvent);
            }, 1000);
          }
        });
        
        // Should show refresh indicator
        cy.get('[data-testid="refresh-indicator"]').should('be.visible');
        
        // Should reload data
        cy.contains('Refreshing data...').should('be.visible');
        cy.contains('Data refreshed').should('be.visible');
      });

      it('should use appropriate typography for small screens', () => {
        cy.visit('/dashboard');
        
        if (device.width <= 375) {
          // Smaller headings on phones
          cy.get('h1').should('have.css', 'font-size', '24px');
          cy.get('p').should('have.css', 'font-size', '14px');
        } else if (device.width <= 768) {
          // Medium headings on larger phones/small tablets
          cy.get('h1').should('have.css', 'font-size', '28px');
          cy.get('p').should('have.css', 'font-size', '16px');
        } else {
          // Larger headings on tablets
          cy.get('h1').should('have.css', 'font-size', '32px');
          cy.get('p').should('have.css', 'font-size', '16px');
        }
      });
    });
  });
});
