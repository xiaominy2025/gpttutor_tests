import { test, expect } from '@playwright/test';

test('simple test', async ({ page }) => {
  console.log('🚀 Starting simple test...');
  
  await page.goto('/');
  console.log('✅ Page loaded');
  
  const title = await page.title();
  console.log(`📄 Page title: "${title}"`);
  
  expect(title).toContain('Vite');
  console.log('✅ Test passed');
}); 