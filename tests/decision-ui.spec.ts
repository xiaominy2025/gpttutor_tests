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
    await page.goto('http://localhost:3000');
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
        const queryInput = page.locator('[data-testid="query-input"]').first();
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
        const askButton = page.locator('[data-testid="ask-button"]').first();
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
        await page.waitForSelector('[data-testid="response"]', { timeout: 30000 });
        await page.waitForTimeout(3000); // Additional wait for full rendering
        return true;
      },
      'Response rendering'
    );
    
    // Step 7: Validate all sections with retry logic
    console.log('🔍 Validating response sections...');
    const sectionValidation = await retryValidation(
      () => validateAllSections(page),
      'Section validation'
    );
    
    if (!sectionValidation.isValid) {
      await page.screenshot({ path: 'tests/artifacts/section-validation-failed.png' });
      console.error('❌ Section validation errors:');
      sectionValidation.errors.forEach(error => console.error(`  - ${error}`));
      throw new Error(`Section validation failed: ${sectionValidation.errors.join(', ')}`);
    }
    
    // Step 8: Validate tooltips with retry logic
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
    const questionsSection = page.locator('[data-testid="questions-section"]').first();
    if (await questionsSection.isVisible()) {
      const questionsContent = await questionsSection.locator('..').textContent();
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
    console.log(`📋 Sections validated: ${sectionValidation.results.length}`);
    
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
    
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    const testQueries = [
      'How should I approach market entry strategy?',
      'What are the risks of expanding internationally?',
      'How do I optimize my supply chain under constraints?'
    ];
    
    for (const query of testQueries) {
      console.log(`🧪 Testing query: "${query}"`);
      
      // Clear any existing input
      const queryInput = page.locator('[data-testid="query-input"]').first();
      await queryInput.clear();
      await queryInput.fill(query);
      
      const askButton = page.locator('[data-testid="ask-button"]').first();
      await askButton.click();
      
      // Wait for response
      await page.waitForTimeout(5000);
      
      // Verify response sections exist with improved selectors
      const sections = [
        { name: 'Strategic', selector: '[data-testid="strategic-section"]' },
        { name: 'Story', selector: '[data-testid="story-section"]' },
        { name: 'Question', selector: '[data-testid="questions-section"]' },
        { name: 'Concept', selector: '[data-testid="concepts-section"]' }
      ];
      
      for (const section of sections) {
        const sectionElement = page.locator(section.selector).first();
        if (!(await sectionElement.isVisible())) {
          await page.screenshot({ path: `tests/artifacts/${section.name.toLowerCase()}-section-missing.png` });
          throw new Error(`${section.name} section not found for query: "${query}"`);
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
    
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    // Test with empty query
    const askButton = page.locator('[data-testid="ask-button"]').first();
    await askButton.click();
    
    // Should either show validation message or not proceed
    await page.waitForTimeout(2000);
    
    // Verify page doesn't crash and still allows new input
    const queryInput = page.locator('[data-testid="query-input"]').first();
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