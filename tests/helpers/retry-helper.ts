import { Page } from '@playwright/test';

export interface RetryOptions {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  baseDelay: 500,
  maxDelay: 2000,
  backoffMultiplier: 2
};

/**
 * Retry function with exponential backoff
 */
export async function retry<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === config.maxRetries) {
        console.log(`❌ Operation failed after ${config.maxRetries} attempts`);
        throw lastError;
      }
      
      const delay = Math.min(
        config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1),
        config.maxDelay
      );
      
      console.log(`⚠️ Attempt ${attempt} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

/**
 * Retry validation operations with detailed logging
 */
export async function retryValidation<T>(
  operation: () => Promise<T>,
  operationName: string,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
    try {
      console.log(`🔍 ${operationName} (attempt ${attempt}/${config.maxRetries})`);
      const result = await operation();
      
      if (attempt > 1) {
        console.log(`✅ ${operationName} succeeded on attempt ${attempt}`);
      }
      
      return result;
    } catch (error) {
      lastError = error as Error;
      console.log(`❌ ${operationName} failed on attempt ${attempt}: ${error}`);
      
      if (attempt === config.maxRetries) {
        console.log(`💥 ${operationName} failed after ${config.maxRetries} attempts`);
        throw lastError;
      }
      
      const delay = Math.min(
        config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1),
        config.maxDelay
      );
      
      console.log(`⏳ Retrying ${operationName} in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

/**
 * Retry page operations with screenshot capture on failure
 */
export async function retryPageOperation<T>(
  page: Page,
  operation: () => Promise<T>,
  operationName: string,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
    try {
      console.log(`🔍 ${operationName} (attempt ${attempt}/${config.maxRetries})`);
      const result = await operation();
      
      if (attempt > 1) {
        console.log(`✅ ${operationName} succeeded on attempt ${attempt}`);
      }
      
      return result;
    } catch (error) {
      lastError = error as Error;
      console.log(`❌ ${operationName} failed on attempt ${attempt}: ${error}`);
      
      // Capture screenshot on failure
      try {
        const screenshotPath = `test-results/${operationName.toLowerCase().replace(/\s+/g, '-')}-attempt-${attempt}.png`;
        await page.screenshot({ path: screenshotPath });
        console.log(`📸 Screenshot saved: ${screenshotPath}`);
      } catch (screenshotError) {
        console.log(`⚠️ Failed to capture screenshot: ${screenshotError}`);
      }
      
      if (attempt === config.maxRetries) {
        console.log(`💥 ${operationName} failed after ${config.maxRetries} attempts`);
        throw lastError;
      }
      
      const delay = Math.min(
        config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1),
        config.maxDelay
      );
      
      console.log(`⏳ Retrying ${operationName} in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
} 