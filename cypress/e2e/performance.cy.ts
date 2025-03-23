describe('Performance Metrics', () => {
  beforeEach(() => {
    // Start performance monitoring
    cy.window().then((win) => {
      win.performance.mark('test-start');
    });
  });

  afterEach(() => {
    // End performance monitoring and log results
    cy.window().then((win) => {
      win.performance.mark('test-end');
      win.performance.measure('test-duration', 'test-start', 'test-end');
      const measures = win.performance.getEntriesByType('measure');
      const duration = measures[0].duration;
      cy.log(`Test duration: ${duration}ms`);
    });
  });
  
  it('should load the dashboard page quickly', () => {
    cy.visit('/dashboard', {
      onBeforeLoad(win) {
        // Stub performance API
        const performanceObserver = new win.PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            cy.log(`Performance Entry: ${entry.name} - ${entry.startTime}ms`);
          });
        });
        performanceObserver.observe({ entryTypes: ['paint', 'navigation', 'resource'] });
      }
    });
    
    // Page should be interactive within the threshold
    cy.contains('AI Actor Generator', { timeout: 3000 }).should('be.visible');
    
    // Check performance metrics
    cy.window().then((win) => {
      if (win.performance && win.performance.timing) {
        const navigationStart = win.performance.timing.navigationStart;
        const loadEventEnd = win.performance.timing.loadEventEnd;
        const loadTime = loadEventEnd - navigationStart;
        
        // Load time should be under 3 seconds
        expect(loadTime).to.be.lessThan(3000);
        
        // Log the load time
        cy.log(`Page load time: ${loadTime}ms`);
      }
    });
  });

  it('should render images efficiently', () => {
    // Login
    cy.login();
    
    // Create a test actor if needed
    cy.createActor('Performance Test Actor');
    
    // Visit the gallery page
    cy.visit('/gallery', {
      onBeforeLoad(win) {
        // Monitor resource timing
        win.performanceResourceEntries = [];
        const originalGetEntries = win.Performance.prototype.getEntriesByType;
        win.Performance.prototype.getEntriesByType = function(type) {
          const entries = originalGetEntries.call(this, type);
          if (type === 'resource') {
            win.performanceResourceEntries.push(...entries);
          }
          return entries;
        };
      }
    });
    
    // Wait for images to load
    cy.get('[data-testid="gallery-image"]', { timeout: 10000 }).should('be.visible');
    
    // Check image loading performance
    cy.window().then((win) => {
      const imageEntries = win.performanceResourceEntries.filter(entry => 
        entry.name.includes('.jpg') || entry.name.includes('.png') || entry.name.includes('.webp')
      );
      
      // Total image size should be reasonable
      const totalImageSize = imageEntries.reduce((sum, entry) => sum + (entry.transferSize || 0), 0);
      cy.log(`Total image size: ${totalImageSize / 1024}KB`);
      
      // On mobile, should be under 500KB total
      expect(totalImageSize).to.be.lessThan(512000); // 500KB
      
      // Average image load time should be under 300ms
      const avgLoadTime = imageEntries.reduce((sum, entry) => sum + entry.duration, 0) / imageEntries.length;
      cy.log(`Average image load time: ${avgLoadTime}ms`);
      expect(avgLoadTime).to.be.lessThan(300);
    });
  });

  it('should optimize for network conditions', () => {
    // Test with simulated 3G connection
    cy.visit('/dashboard', {
      onBeforeLoad(win) {
        // Simulate slow 3G connection
        Object.defineProperty(win.navigator, 'connection', {
          value: { 
            effectiveType: '3g',
            downlink: 1.5,
            rtt: 400
          },
          configurable: true
        });
      }
    });
    
    // App should adapt to network conditions
    cy.get('[data-testid="network-status"]').should('contain', '3G');
    
    // Should load optimized images
    cy.get('img').should('have.attr', 'loading', 'lazy');
    
    // Check for low-quality image placeholders
    cy.get('[data-testid="lqip"]').should('exist');
    
    // Page should still be usable despite slow connection
    cy.contains('Create New Actor').should('be.visible');
    
    // Content should be prioritized
    cy.window().then((win) => {
      const resourceEntries = win.performance.getEntriesByType('resource');
      const cssEntries = resourceEntries.filter(entry => entry.name.includes('.css'));
      const jsEntries = resourceEntries.filter(entry => entry.name.includes('.js'));
      const imgEntries = resourceEntries.filter(entry => 
        entry.name.includes('.jpg') || entry.name.includes('.png') || entry.name.includes('.webp')
      );
      
      // CSS should load before JS (except for critical JS)
      const firstCssTime = Math.min(...cssEntries.map(entry => entry.startTime));
      const nonCriticalJsTime = jsEntries
        .filter(entry => !entry.name.includes('critical'))
        .map(entry => entry.startTime);
      
      if (nonCriticalJsTime.length > 0) {
        const firstNonCriticalJsTime = Math.min(...nonCriticalJsTime);
        expect(firstCssTime).to.be.lessThan(firstNonCriticalJsTime);
      }
      
      // Images should have lower priority
      const firstImgTime = Math.min(...imgEntries.map(entry => entry.startTime));
      expect(firstCssTime).to.be.lessThan(firstImgTime);
    });
  });

  it('should measure memory usage', () => {
    // Only run this test if browser supports memory API
    cy.visit('/dashboard', {
      onBeforeLoad(win) {
        if (!win.performance || !win.performance.memory) {
          cy.log('Memory API not supported by this browser, skipping test');
          this.skip();
        }
      }
    });
    
    // Check initial memory usage
    cy.window().then((win) => {
      if (win.performance && win.performance.memory) {
        const initialMemory = win.performance.memory.usedJSHeapSize;
        cy.log(`Initial memory usage: ${initialMemory / (1024 * 1024)}MB`);
      }
    });
    
    // Navigate to multiple pages
    cy.contains('Actors').click();
    cy.contains('Gallery').click();
    cy.contains('Dashboard').click();
    
    // Check memory usage after navigation
    cy.window().then((win) => {
      if (win.performance && win.performance.memory) {
        const finalMemory = win.performance.memory.usedJSHeapSize;
        cy.log(`Final memory usage: ${finalMemory / (1024 * 1024)}MB`);
        
        // Memory usage should be reasonable (under 100MB for basic navigation)
        expect(finalMemory).to.be.lessThan(100 * 1024 * 1024);
      }
    });
  });

  it('should properly implement code splitting', () => {
    cy.visit('/dashboard', {
      onBeforeLoad(win) {
        // Monitor chunk loading
        win.loadedChunks = [];
        const originalAppendChild = win.document.head.appendChild;
        
        win.document.head.appendChild = function(el) {
          if (el.tagName === 'SCRIPT' && el.src.includes('chunk-')) {
            win.loadedChunks.push(el.src);
          }
          return originalAppendChild.call(this, el);
        };
      }
    });
    
    // Dashboard should only load dashboard-related chunks
    cy.window().then((win) => {
      const dashboardChunks = win.loadedChunks;
      cy.log(`Loaded dashboard chunks: ${dashboardChunks.length}`);
      cy.wrap(dashboardChunks).should('have.length.lessThan', 5);
    });
    
    // Navigate to actors page
    cy.contains('Actors').click();
    
    // Should load actors-specific chunks
    cy.window().then((win) => {
      const additionalChunks = win.loadedChunks.length;
      cy.log(`Total chunks after navigation: ${additionalChunks}`);
      
      // Should have loaded at least one additional chunk
      expect(additionalChunks).to.be.greaterThan(0);
    });
  });

  it('should have good TTI (Time to Interactive)', () => {
    cy.visit('/', {
      onBeforeLoad(win) {
        // Record start time
        win.startTime = Date.now();
        
        // Monitor for interactivity
        win.timeToInteractive = null;
        
        // Create a MutationObserver to detect when the page becomes interactive
        const observer = new MutationObserver(() => {
          if (document.querySelector('[data-testid="interactive-element"]') && !win.timeToInteractive) {
            win.timeToInteractive = Date.now() - win.startTime;
          }
        });
        
        observer.observe(win.document.body, {
          childList: true,
          subtree: true
        });
      }
    });
    
    // Wait for interactive element to appear
    cy.get('[data-testid="interactive-element"]', { timeout: 10000 }).should('be.visible');
    
    // Check Time to Interactive
    cy.window().then((win) => {
      cy.log(`Time to Interactive: ${win.timeToInteractive}ms`);
      
      // TTI should be under 3.5 seconds
      expect(win.timeToInteractive).to.be.lessThan(3500);
    });
    
    // Verify interactivity by clicking the element
    cy.get('[data-testid="interactive-element"]').click();
    cy.contains('Interactive action triggered').should('be.visible');
  });
});
