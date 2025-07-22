import { Page } from '@playwright/test';

export interface ReadinessCheckResult {
  isReady: boolean;
  error?: string;
  responseTime?: number;
}

/**
 * Checks if the ThinkPal application is running and ready
 * Includes retry logic and detailed error reporting
 */
export async function checkAppReadiness(page: Page): Promise<ReadinessCheckResult> {
  const maxRetries = 3;
  const retryDelay = 1000; // 1 second

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔍 Checking app readiness (attempt ${attempt}/${maxRetries})...`);
      
      const startTime = Date.now();
      
      // Try to make a request to the app
      const response = await page.request.get('http://localhost:3000');
      const responseTime = Date.now() - startTime;
      
      if (response.status() === 200) {
        console.log(`✅ App is ready! Response time: ${responseTime}ms`);
        return {
          isReady: true,
          responseTime
        };
      } else {
        const error = `App responded with status ${response.status()}`;
        console.log(`⚠️ ${error}`);
        
        if (attempt === maxRetries) {
          return {
            isReady: false,
            error,
            responseTime
          };
        }
      }
    } catch (error) {
      const errorMessage = `Connection failed: ${error}`;
      console.log(`⚠️ ${errorMessage}`);
      
      if (attempt === maxRetries) {
        return {
          isReady: false,
          error: errorMessage
        };
      }
    }
    
    // Wait before retry
    if (attempt < maxRetries) {
      console.log(`⏳ Waiting ${retryDelay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
  
  return {
    isReady: false,
    error: 'App failed to respond after all retry attempts'
  };
}

/**
 * Waits for the application to be ready with timeout
 */
export async function waitForAppReady(page: Page, timeoutMs: number = 30000): Promise<boolean> {
  console.log(`⏳ Waiting for app to be ready (timeout: ${timeoutMs}ms)...`);
  
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    const result = await checkAppReadiness(page);
    
    if (result.isReady) {
      return true;
    }
    
    // Wait before next check
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log(`❌ App failed to be ready within ${timeoutMs}ms`);
  return false;
}

/**
 * Validates that the app is accessible and shows the expected interface
 */
export async function validateAppInterface(page: Page): Promise<{
  isValid: boolean;
  errors: string[];
}> {
  const errors: string[] = [];
  
  try {
    // Check for basic UI elements
    const queryInput = page.locator('[data-testid="query-input"], input[type="text"], textarea, [contenteditable="true"]').first();
    if (!(await queryInput.isVisible())) {
      errors.push('Query input field not found or not visible');
    }
    
    const askButton = page.locator('[data-testid="ask-button"], button:has-text("Ask"), button:has-text("Submit"), button[type="submit"]').first();
    if (!(await askButton.isVisible())) {
      errors.push('Ask/Submit button not found or not visible');
    }
    
    // Check for any loading indicators that might indicate the app is still starting
    const loadingIndicators = page.locator('[class*="loading"], [class*="spinner"], [class*="loader"]');
    const loadingCount = await loadingIndicators.count();
    if (loadingCount > 0) {
      console.log(`⚠️ Found ${loadingCount} loading indicators - app may still be starting`);
    }
    
    if (errors.length === 0) {
      console.log('✅ App interface validation passed');
      return { isValid: true, errors: [] };
    } else {
      console.log(`❌ App interface validation failed: ${errors.length} errors`);
      return { isValid: false, errors };
    }
  } catch (error) {
    errors.push(`Error validating app interface: ${error}`);
    return { isValid: false, errors };
  }
} 