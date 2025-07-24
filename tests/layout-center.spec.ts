import { test, expect } from '@playwright/test';

test.describe('ThinkPal Layout Centering Tests', () => {
  test('main layout wrapper is horizontally centered', async ({ page }) => {
    console.log('🎯 Testing layout horizontal centering...');
    
    // Navigate to the application
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Try different possible wrapper selectors
    const wrapperSelectors = [
      '.main-wrapper',
      '.main-container', 
      '.app-wrapper',
      '.container',
      'main',
      '#root > div'
    ];
    
    let wrapper = null;
    let usedSelector = '';
    
    // Find the first visible wrapper element
    for (const selector of wrapperSelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible()) {
        wrapper = element;
        usedSelector = selector;
        console.log(`✅ Found visible wrapper with selector: ${selector}`);
        break;
      }
    }
    
    if (!wrapper) {
      // If no specific wrapper found, use the body as fallback
      wrapper = page.locator('body');
      usedSelector = 'body';
      console.log('⚠️ No specific wrapper found, using body element');
    }
    
    // Get viewport dimensions
    const viewport = page.viewportSize();
    if (!viewport) {
      throw new Error('Viewport size not available');
    }
    
    console.log(`📐 Viewport size: ${viewport.width}x${viewport.height}`);
    
    // Get wrapper bounding box
    const box = await wrapper.boundingBox();
    if (!box) {
      throw new Error('Wrapper bounding box not available');
    }
    
    console.log(`📦 Wrapper bounds: x=${box.x}, y=${box.y}, width=${box.width}, height=${box.height}`);
    
    // Calculate centering
    const wrapperCenter = box.x + box.width / 2;
    const viewportCenter = viewport.width / 2;
    const offset = Math.abs(wrapperCenter - viewportCenter);
    
    console.log(`🎯 Wrapper center: ${wrapperCenter.toFixed(2)}px`);
    console.log(`🎯 Viewport center: ${viewportCenter.toFixed(2)}px`);
    console.log(`📏 Offset: ${offset.toFixed(2)}px`);
    
    // Take screenshot for visual verification
    await page.screenshot({ 
      path: 'tests/artifacts/layout-centering-test.png',
      fullPage: true 
    });
    
    // Validate centering (allow 5px tolerance)
    const tolerance = 5;
    expect(offset).toBeLessThanOrEqual(tolerance);
    
    console.log(`✅ Layout centering validated! Offset ${offset.toFixed(2)}px is within ${tolerance}px tolerance`);
  });

  test('layout centering persists across different viewport sizes', async ({ page }) => {
    console.log('📱 Testing layout centering across different viewport sizes...');
    
    const viewportSizes = [
      { width: 1920, height: 1080, name: 'Desktop HD' },
      { width: 1366, height: 768, name: 'Laptop' },
      { width: 1024, height: 768, name: 'Tablet Landscape' },
      { width: 768, height: 1024, name: 'Tablet Portrait' },
      { width: 375, height: 667, name: 'Mobile' },
      { width: 320, height: 568, name: 'Small Mobile' }
    ];
    
    for (const size of viewportSizes) {
      console.log(`📱 Testing ${size.name} (${size.width}x${size.height})...`);
      
      // Set viewport size
      await page.setViewportSize(size);
      
      // Navigate to the application
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Find wrapper element
      const wrapperSelectors = [
        '.main-wrapper',
        '.main-container', 
        '.app-wrapper',
        '.container',
        'main',
        '#root > div'
      ];
      
      let wrapper = null;
      for (const selector of wrapperSelectors) {
        const element = page.locator(selector).first();
        if (await element.isVisible()) {
          wrapper = element;
          break;
        }
      }
      
      if (!wrapper) {
        wrapper = page.locator('body');
      }
      
      // Get wrapper bounding box
      const box = await wrapper.boundingBox();
      if (!box) {
        throw new Error(`Wrapper bounding box not available for ${size.name}`);
      }
      
      // Calculate centering
      const wrapperCenter = box.x + box.width / 2;
      const viewportCenter = size.width / 2;
      const offset = Math.abs(wrapperCenter - viewportCenter);
      
      console.log(`  📏 Offset: ${offset.toFixed(2)}px`);
      
      // Take screenshot for this viewport size
      await page.screenshot({ 
        path: `tests/artifacts/layout-centering-${size.name.toLowerCase().replace(/\s+/g, '-')}.png`,
        fullPage: true 
      });
      
      // Validate centering (allow 5px tolerance)
      const tolerance = 5;
      expect(offset).toBeLessThanOrEqual(tolerance);
      
      console.log(`  ✅ ${size.name} centering validated!`);
    }
    
    console.log('✅ All viewport sizes validated successfully!');
  });

  test('layout centering works with dynamic content', async ({ page }) => {
    console.log('🔄 Testing layout centering with dynamic content...');
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Find wrapper element
    const wrapperSelectors = [
      '.main-wrapper',
      '.main-container', 
      '.app-wrapper',
      '.container',
      'main',
      '#root > div'
    ];
    
    let wrapper = null;
    for (const selector of wrapperSelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible()) {
        wrapper = element;
        break;
      }
    }
    
    if (!wrapper) {
      wrapper = page.locator('body');
    }
    
    // Get initial centering
    const initialBox = await wrapper.boundingBox();
    if (!initialBox) {
      throw new Error('Initial wrapper bounding box not available');
    }
    
    const viewport = page.viewportSize();
    if (!viewport) {
      throw new Error('Viewport size not available');
    }
    
    const initialWrapperCenter = initialBox.x + initialBox.width / 2;
    const viewportCenter = viewport.width / 2;
    const initialOffset = Math.abs(initialWrapperCenter - viewportCenter);
    
    console.log(`📏 Initial offset: ${initialOffset.toFixed(2)}px`);
    
    // Submit a query to add dynamic content
    const testQuery = 'How do I make strategic decisions?';
    console.log(`📝 Submitting query: "${testQuery}"`);
    
    const queryInput = page.locator('textarea[placeholder*="Ask me anything"]').first();
    await queryInput.fill(testQuery);
    
    const askButton = page.locator('button:has-text("Ask")').first();
    await askButton.click();
    
    // Wait for response to load
    await page.waitForSelector('div:has-text("Strategic"), div:has-text("Story"), div:has-text("Reflection"), div:has-text("Concepts")', { timeout: 30000 });
    await page.waitForTimeout(3000); // Additional wait for full rendering
    
    // Get centering after dynamic content loads
    const finalBox = await wrapper.boundingBox();
    if (!finalBox) {
      throw new Error('Final wrapper bounding box not available');
    }
    
    const finalWrapperCenter = finalBox.x + finalBox.width / 2;
    const finalOffset = Math.abs(finalWrapperCenter - viewportCenter);
    
    console.log(`📏 Final offset: ${finalOffset.toFixed(2)}px`);
    
    // Take screenshot after dynamic content
    await page.screenshot({ 
      path: 'tests/artifacts/layout-centering-dynamic-content.png',
      fullPage: true 
    });
    
    // Validate that centering is maintained (allow 5px tolerance)
    const tolerance = 5;
    expect(finalOffset).toBeLessThanOrEqual(tolerance);
    
    // Validate that centering didn't change significantly (allow 5px difference for mobile, 2px for desktop)
    const centeringChange = Math.abs(finalOffset - initialOffset);
    const isMobile = viewport.width <= 768;
    const maxChange = isMobile ? 5 : 2;
    expect(centeringChange).toBeLessThanOrEqual(maxChange);
    
    console.log(`✅ Dynamic content centering validated! Final offset ${finalOffset.toFixed(2)}px, change ${centeringChange.toFixed(2)}px`);
  });
}); 