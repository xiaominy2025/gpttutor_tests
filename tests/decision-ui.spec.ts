

import { test, expect } from '@playwright/test';
import { validateTooltips, validateAllSections } from './helpers/tooltip-checker';
import { checkAppReadiness, waitForAppReady, validateAppInterface } from './helpers/readiness-checker';
import { retryValidation, retryPageOperation } from './helpers/retry-helper';

test.describe('ThinkPal Decision Coach UI Tests', () => {
  test('should render all structured sections with meaningful content', async ({ page }) => {
    console.log('🚀 Starting ThinkPal UI test...');
    
    // Step 1: Check app readiness with retry logic
    const readinessResult = await retryValidation(
      () => checkAppReadiness(page),
      'App readiness check'
    );
    
    if (!readinessResult.isReady) {
      await page.screenshot({ path: 'tests/artifacts/app-not-ready.png' });
      throw new Error(`ThinkPal application is not ready: ${readinessResult.error}`);
    }
    
    // Step 2: Navigate to the site
    console.log('🌐 Navigating to ThinkPal application...');
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Step 3: Validate app interface
    const interfaceResult = await validateAppInterface(page);
    if (!interfaceResult.isValid) {
      await page.screenshot({ path: 'tests/artifacts/interface-validation-failed.png' });
      throw new Error(`App interface validation failed: ${interfaceResult.errors.join(', ')}`);
    }
    
    // Step 4: Input the query with retry logic
    const testQuery = 'How do I plan production under tariff uncertainty?';
    console.log(`📝 Inputting query: "${testQuery}"`);
    
    await retryPageOperation(
      page,
      async () => {
        const queryInput = page.locator('textarea[placeholder*="Ask me anything"]').first();
        await queryInput.fill(testQuery);
        return true;
      },
      'Query input'
    );
    
    // Step 5: Submit query with retry logic
    console.log('🔘 Clicking Ask button...');
    await retryPageOperation(
      page,
      async () => {
        const askButton = page.locator('button:has-text("Ask")').first();
        await askButton.click();
        return true;
      },
      'Ask button click'
    );
    
    // Step 6: Wait for response with retry logic
    console.log('⏳ Waiting for response...');
    await retryPageOperation(
      page,
      async () => {
        // Wait for any response content to appear
        await page.waitForSelector('div:has-text("Strategic"), div:has-text("Story"), div:has-text("Reflection"), div:has-text("Concepts")', { timeout: 30000 });
        await page.waitForTimeout(3000); // Additional wait for full rendering
        return true;
      },
      'Response rendering'
    );
    
    // Step 7: Validate all sections with flexible selectors
    console.log('🔍 Validating response sections...');
    const sections = [
      { name: 'Strategic Thinking Lens', selector: 'div:has-text("Strategic Thinking Lens"), div:has-text("Strategic")' },
      { name: 'Story in Action', selector: 'div:has-text("Story in Action"), div:has-text("Story")' },
      { name: 'Reflection Prompts', selector: 'div:has-text("Reflection Prompts"), div:has-text("Reflection")' },
      { name: 'Concepts Section', selector: 'div:has-text("Concepts"), div:has-text("Key Concepts")' }
    ];
    
    for (const section of sections) {
      console.log(`🔍 Validating ${section.name}...`);
      
      // Check section visibility
      const sectionElement = page.locator(section.selector).first();
      await expect(sectionElement).toBeVisible();
      
      // Get section text content
      const sectionText = await sectionElement.innerText();
      
      // Validate no markdown artifacts remain
      if (sectionText.includes('**') || sectionText.includes('__')) {
        await page.screenshot({ path: `tests/artifacts/${section.name.toLowerCase().replace(/\s+/g, '-')}-markdown-artifacts.png` });
        throw new Error(`${section.name} contains markdown artifacts: bold syntax found in "${sectionText.substring(0, 100)}..."`);
      }
      
      if (sectionText.match(/\s*[-–—]+\s*$/)) {
        await page.screenshot({ path: `tests/artifacts/${section.name.toLowerCase().replace(/\s+/g, '-')}-trailing-dashes.png` });
        throw new Error(`${section.name} contains trailing dashes in "${sectionText.substring(0, 100)}..."`);
      }
      
      // Special validation for Concepts section
      if (section.name === 'Concepts Section') {
        console.log('🔍 Validating Concepts format...');
        const lines = sectionText.split('\n').filter(line => line.trim());
        
        if (lines.length === 0) {
          await page.screenshot({ path: 'tests/artifacts/concepts-empty.png' });
          throw new Error('Concepts section is empty');
        }
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (!line.match(/^.+:\s+.+/)) {
            await page.screenshot({ path: 'tests/artifacts/concepts-format-invalid.png' });
            throw new Error(`Concepts line ${i + 1} does not follow "Term: Definition" format: "${line}"`);
          }
          
          const [term, definition] = line.split(':').map(part => part.trim());
          if (!term || !definition) {
            await page.screenshot({ path: 'tests/artifacts/concepts-empty-parts.png' });
            throw new Error(`Concepts line ${i + 1} has empty term or definition: "${line}"`);
          }
        }
        
        console.log(`✅ Concepts section validated: ${lines.length} concepts found`);
      }
      
      console.log(`✅ ${section.name} validated successfully`);
    }
    
    // Step 8: Validate tooltips with retry logic (updated for v1.6)
    console.log('🔍 Validating tooltips...');
    const tooltipValidation = await retryValidation(
      () => validateTooltips(page),
      'Tooltip validation'
    );
    
    if (!tooltipValidation.isValid) {
      await page.screenshot({ path: 'tests/artifacts/tooltip-validation-failed.png' });
      console.error('❌ Tooltip validation errors:');
      tooltipValidation.errors.forEach(error => console.error(`  - ${error}`));
      throw new Error(`Tooltip validation failed: ${tooltipValidation.errors.join(', ')}`);
    }
    
    // Step 9: Additional validation for questions pattern
    console.log('🔍 Validating question patterns...');
    const questionsSection = page.locator('div:has-text("Reflection Prompts"), div:has-text("Reflection")').first();
    if (await questionsSection.isVisible()) {
      const questionsContent = await questionsSection.innerText();
      const questionPattern = /(How|What)\s+[^.!?]*[.!?]/;
      if (!questionPattern.test(questionsContent || '')) {
        await page.screenshot({ path: 'tests/artifacts/questions-pattern-failed.png' });
        throw new Error('No questions starting with "How" or "What" found in Reflection Prompts');
      }
    }
    
    // Step 10: Final validation and reporting
    const fullResponse = await page.locator('body').textContent();
    if (!fullResponse || fullResponse.length < 500) {
      await page.screenshot({ path: 'tests/artifacts/response-too-short.png' });
      throw new Error(`Response too short (${fullResponse?.length || 0} chars, expected 500+)`);
    }
    
    // Success reporting
    console.log('✅ All validations passed successfully!');
    console.log(`📊 Response length: ${fullResponse.length} characters`);
    console.log(`🔍 Tooltips found: ${tooltipValidation.tooltipCount} (${tooltipValidation.validTooltips} valid)`);
    console.log(`📋 Sections validated: ${sections.length}`);
    
    // Save success screenshot
    await page.screenshot({ path: 'tests/artifacts/test-success.png' });
  });

  test('should handle different query types', async ({ page }) => {
    console.log('🧪 Testing multiple query types...');
    
    // Check app readiness
    const readinessResult = await retryValidation(
      () => checkAppReadiness(page),
      'App readiness check for query types'
    );
    
    if (!readinessResult.isReady) {
      await page.screenshot({ path: 'tests/artifacts/app-not-ready-query-types.png' });
      throw new Error(`ThinkPal application is not ready: ${readinessResult.error}`);
    }
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const testQueries = [
      'How should I approach market entry strategy?',
      'What are the risks of expanding internationally?',
      'How do I optimize my supply chain under constraints?'
    ];
    
    for (const query of testQueries) {
      console.log(`🧪 Testing query: "${query}"`);
      
      // Clear any existing input
      const queryInput = page.locator('textarea[placeholder*="Ask me anything"]').first();
      await queryInput.clear();
      await queryInput.fill(query);
      
      const askButton = page.locator('button:has-text("Ask")').first();
      await askButton.click();
      
      // Wait for response
      await page.waitForTimeout(5000);
      
      // Verify response sections exist with flexible selectors
      const sections = [
        { name: 'Strategic Thinking Lens', selector: 'div:has-text("Strategic Thinking Lens"), div:has-text("Strategic")' },
        { name: 'Story in Action', selector: 'div:has-text("Story in Action"), div:has-text("Story")' },
        { name: 'Reflection Prompts', selector: 'div:has-text("Reflection Prompts"), div:has-text("Reflection")' },
        { name: 'Concepts Section', selector: 'div:has-text("Concepts"), div:has-text("Key Concepts")' }
      ];
      
      for (const section of sections) {
        const sectionElement = page.locator(section.selector).first();
        if (!(await sectionElement.isVisible())) {
          await page.screenshot({ path: `tests/artifacts/${section.name.toLowerCase().replace(/\s+/g, '-')}-section-missing.png` });
          throw new Error(`${section.name} section not found for query: "${query}"`);
        }
        
        // Validate no markdown artifacts
        const sectionText = await sectionElement.innerText();
        if (sectionText.includes('**') || sectionText.includes('__')) {
          await page.screenshot({ path: `tests/artifacts/${section.name.toLowerCase().replace(/\s+/g, '-')}-markdown-artifacts.png` });
          throw new Error(`${section.name} contains markdown artifacts for query "${query}": bold syntax found`);
        }
      }
      
      console.log(`✅ Query "${query}" processed successfully`);
    }
  });

  test('should handle error states gracefully', async ({ page }) => {
    console.log('🧪 Testing error state handling...');
    
    // Check app readiness
    const readinessResult = await retryValidation(
      () => checkAppReadiness(page),
      'App readiness check for error states'
    );
    
    if (!readinessResult.isReady) {
      await page.screenshot({ path: 'tests/artifacts/app-not-ready-error-states.png' });
      throw new Error(`ThinkPal application is not ready: ${readinessResult.error}`);
    }
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Test with empty query
    const askButton = page.locator('button:has-text("Ask")').first();
    await askButton.click();
    
    // Should either show validation message or not proceed
    await page.waitForTimeout(2000);
    
    // Verify page doesn't crash and still allows new input
    const queryInput = page.locator('textarea[placeholder*="Ask me anything"]').first();
    await expect(queryInput).toBeVisible();
    await expect(queryInput).toBeEnabled();
    
    // Test with very short query
    await queryInput.fill('a');
    await askButton.click();
    await page.waitForTimeout(2000);
    
    // Verify page still functions
    await expect(queryInput).toBeVisible();
    await expect(queryInput).toBeEnabled();
    
    console.log('✅ Error states handled gracefully');
  });
}); 