import { test, expect } from '@playwright/test';

// Mock server test to demonstrate validation features
test.describe('Mock ThinkPal Server Tests', () => {
  test('should validate mock response structure', async ({ page }) => {
    // Create a mock HTML page that simulates ThinkPal response
    const mockHtml = `
      <!DOCTYPE html>
      <html>
      <head><title>ThinkPal Mock</title></head>
      <body>
        <div data-testid="query-input">
          <input type="text" placeholder="Enter your question..." />
        </div>
        <button data-testid="ask-button">Ask</button>
        
        <div data-testid="response">
          <div data-testid="strategic-section">
            <h3>Strategic Thinking Lens</h3>
            <p>When facing tariff uncertainty, adopt a scenario-based approach to production planning. Consider multiple tariff scenarios and their impact on costs, pricing, and market competitiveness. This strategic lens helps you prepare for various outcomes rather than betting on a single scenario.</p>
          </div>
          
          <div data-testid="story-section">
            <h3>Story in Action</h3>
            <p>A manufacturing company faced 25% tariff uncertainty on imported components. They created three production scenarios: low tariffs (5%), medium tariffs (15%), and high tariffs (25%). By preparing for all scenarios, they maintained profitability even when tariffs hit the highest level.</p>
          </div>
          
          <div data-testid="questions-section">
            <h3>Follow-up Questions</h3>
            <ul>
              <li>How do your current suppliers handle tariff fluctuations?</li>
              <li>What alternative sourcing options do you have available?</li>
              <li>How would different tariff levels affect your pricing strategy?</li>
            </ul>
          </div>
          
          <div data-testid="concepts-section">
            <h3>Key Concepts</h3>
            <ul>
              <li><span class="tooltip" title="A method for analyzing different possible future scenarios">Scenario Analysis</span></li>
              <li><span class="tooltip" title="Testing how changes in variables affect outcomes">Sensitivity Analysis</span></li>
              <li><span class="tooltip" title="Managing potential negative impacts">Risk Management</span></li>
              <li><span class="tooltip" title="Unpredictable factors affecting business">Uncertainty</span></li>
            </ul>
          </div>
        </div>
      </body>
      </html>
    `;
    
    // Set up a mock server response
    await page.route('http://localhost:3000', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: mockHtml
      });
    });
    
    // Navigate to the mock page
    await page.goto('http://localhost:3000');
    
    // Test the validation functions
    const sections = [
      { name: 'Strategic Thinking Lens', selector: '[data-testid="strategic-section"]' },
      { name: 'Story in Action', selector: '[data-testid="story-section"]' },
      { name: 'Follow-up Questions', selector: '[data-testid="questions-section"]' },
      { name: 'Key Concepts', selector: '[data-testid="concepts-section"]' }
    ];
    
    for (const section of sections) {
      const sectionElement = page.locator(section.selector);
      await expect(sectionElement).toBeVisible();
      
      const content = await sectionElement.textContent();
      expect(content?.length).toBeGreaterThan(50);
      expect(content).not.toContain('No answer available');
    }
    
    // Test tooltip validation
    const tooltips = page.locator('[class*="tooltip"], [data-tooltip], [title]');
    const tooltipCount = await tooltips.count();
    expect(tooltipCount).toBeGreaterThan(0);
    
    // Test question pattern validation
    const questionsSection = page.locator('[data-testid="questions-section"]');
    const questionsContent = await questionsSection.textContent();
    const questionPattern = /(How|What)\s+[^.!?]*[.!?]/;
    expect(questionPattern.test(questionsContent || '')).toBeTruthy();
    
    // Test concepts validation
    const conceptsSection = page.locator('[data-testid="concepts-section"]');
    const conceptsContent = await conceptsSection.textContent();
    const expectedTerms = ['Scenario Analysis', 'Sensitivity Analysis', 'Risk Management', 'Uncertainty'];
    const hasExpectedTerm = expectedTerms.some(term => 
      conceptsContent?.toLowerCase().includes(term.toLowerCase())
    );
    expect(hasExpectedTerm).toBeTruthy();
    
    console.log('✅ Mock server test passed - validation functions working correctly');
  });
}); 