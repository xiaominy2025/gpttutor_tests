import { test, expect } from '@playwright/test';

test('diagnostic - inspect frontend elements', async ({ page }) => {
  console.log('🔍 Starting diagnostic test...');
  
  // Navigate to the frontend
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  console.log('✅ Page loaded successfully');
  
  // Take a screenshot to see what's there
  await page.screenshot({ path: 'tests/artifacts/diagnostic-page.png' });
  
  // Get page title
  const title = await page.title();
  console.log(`📄 Page title: "${title}"`);
  
  // Get all input elements
  const inputs = await page.locator('input').all();
  console.log(`📝 Found ${inputs.length} input elements`);
  
  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i];
    const type = await input.getAttribute('type');
    const placeholder = await input.getAttribute('placeholder');
    const id = await input.getAttribute('id');
    const dataTestId = await input.getAttribute('data-testid');
    console.log(`  Input ${i + 1}: type="${type}", placeholder="${placeholder}", id="${id}", data-testid="${dataTestId}"`);
  }
  
  // Get all button elements
  const buttons = await page.locator('button').all();
  console.log(`🔘 Found ${buttons.length} button elements`);
  
  for (let i = 0; i < buttons.length; i++) {
    const button = buttons[i];
    const text = await button.textContent();
    const id = await button.getAttribute('id');
    const dataTestId = await button.getAttribute('data-testid');
    console.log(`  Button ${i + 1}: text="${text?.trim()}", id="${id}", data-testid="${dataTestId}"`);
  }
  
  // Get all textarea elements
  const textareas = await page.locator('textarea').all();
  console.log(`📄 Found ${textareas.length} textarea elements`);
  
  for (let i = 0; i < textareas.length; i++) {
    const textarea = textareas[i];
    const placeholder = await textarea.getAttribute('placeholder');
    const id = await textarea.getAttribute('id');
    const dataTestId = await textarea.getAttribute('data-testid');
    console.log(`  Textarea ${i + 1}: placeholder="${placeholder}", id="${id}", data-testid="${dataTestId}"`);
  }
  
  // Get all elements with data-testid
  const elementsWithTestId = await page.locator('[data-testid]').all();
  console.log(`🏷️ Found ${elementsWithTestId.length} elements with data-testid`);
  
  for (let i = 0; i < elementsWithTestId.length; i++) {
    const element = elementsWithTestId[i];
    const tagName = await element.evaluate(el => el.tagName.toLowerCase());
    const dataTestId = await element.getAttribute('data-testid');
    const text = await element.textContent();
    console.log(`  Element ${i + 1}: <${tagName}> data-testid="${dataTestId}", text="${text?.substring(0, 50).trim()}..."`);
  }
  
  // Get page HTML for inspection
  const html = await page.content();
  console.log(`📄 Page HTML length: ${html.length} characters`);
  
  // Save HTML for inspection
  const fs = require('fs');
  fs.writeFileSync('tests/artifacts/diagnostic-page.html', html);
  console.log('💾 Saved page HTML to tests/artifacts/diagnostic-page.html');
  
  console.log('✅ Diagnostic test completed');
}); 