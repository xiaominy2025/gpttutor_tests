import { Page, expect } from '@playwright/test';

export interface TooltipValidationResult {
  isValid: boolean;
  tooltipCount: number;
  validTooltips: number;
  errors: string[];
  details: {
    term: string;
    tooltip: string;
    isValid: boolean;
    error?: string;
  }[];
}

export interface SectionValidationResult {
  isValid: boolean;
  sectionName: string;
  content?: string;
  error?: string;
  characterCount: number;
}

/**
 * Validates tooltips in the ThinkPal response
 * Checks for proper structure, content quality, and meaningful tooltip text
 */
export async function validateTooltips(page: Page): Promise<TooltipValidationResult> {
  const result: TooltipValidationResult = {
    isValid: false,
    tooltipCount: 0,
    validTooltips: 0,
    errors: [],
    details: []
  };

  try {
    // Find all tooltip elements
    const tooltipSelectors = [
      'span[class*="tooltip"]',
      '[data-tooltip]',
      '[title]',
      '.tooltip'
    ];

    let tooltips = page.locator('span[class*="tooltip"]');
    let count = await tooltips.count();

    // If no tooltips found with class, try other selectors
    if (count === 0) {
      tooltips = page.locator('[data-tooltip]');
      count = await tooltips.count();
    }

    if (count === 0) {
      tooltips = page.locator('[title]');
      count = await tooltips.count();
    }

    result.tooltipCount = count;

    if (count === 0) {
      result.errors.push('No tooltips found in response');
      return result;
    }

    console.log(`🔍 Found ${count} tooltip elements`);

    // Validate each tooltip
    for (let i = 0; i < count; i++) {
      const tooltip = tooltips.nth(i);
      const term = await tooltip.textContent();
      const tooltipText = await tooltip.getAttribute('data-tooltip') || 
                         await tooltip.getAttribute('title') || 
                         await tooltip.getAttribute('aria-label') || '';

      const detail = {
        term: term?.trim() || '',
        tooltip: tooltipText.trim(),
        isValid: false,
        error: undefined as string | undefined
      };

      // Validation checks
      if (!detail.term) {
        detail.error = 'Missing term text';
      } else if (detail.term.length < 2) {
        detail.error = 'Term too short (minimum 2 characters)';
      } else if (!detail.tooltip) {
        detail.error = 'Missing tooltip content';
      } else if (detail.tooltip.length < 15) {
        detail.error = `Tooltip too short (${detail.tooltip.length} chars, minimum 15)`;
      } else {
        // Check for placeholder text
        const placeholderPatterns = [
          'No description available',
          'No tooltip available',
          'Click for more info',
          'Hover for details',
          'Loading...',
          'Please wait...'
        ];

        const isPlaceholder = placeholderPatterns.some(pattern => 
          detail.tooltip.toLowerCase().includes(pattern.toLowerCase())
        );

        if (isPlaceholder) {
          detail.error = `Tooltip contains placeholder text: "${detail.tooltip}"`;
        } else {
          detail.isValid = true;
          result.validTooltips++;
        }
      }

      if (!detail.isValid && detail.error) {
        result.errors.push(`${detail.term}: ${detail.error}`);
      }

      result.details.push(detail);
    }

    // Overall validation
    result.isValid = result.validTooltips > 0 && result.errors.length === 0;

    if (result.isValid) {
      console.log(`✅ Tooltip validation passed: ${result.validTooltips}/${result.tooltipCount} valid tooltips`);
    } else {
      console.log(`❌ Tooltip validation failed: ${result.errors.length} errors`);
      result.errors.forEach(error => console.log(`  - ${error}`));
    }

    return result;
  } catch (error) {
    result.errors.push(`Error checking tooltips: ${error}`);
    return result;
  }
}

/**
 * Validates a specific section in the ThinkPal response
 * Checks for presence, content length, and absence of placeholder text
 */
export async function validateSection(
  page: Page, 
  sectionName: string, 
  selectors: string[], 
  minLength: number = 50
): Promise<SectionValidationResult> {
  const result: SectionValidationResult = {
    isValid: false,
    sectionName,
    characterCount: 0
  };

  try {
    // Try each selector until we find the section
    let section = null;
    for (const selector of selectors) {
      section = page.locator(selector).first();
      if (await section.isVisible()) {
        break;
      }
    }

    if (!section || !(await section.isVisible())) {
      result.error = `Section not found or not visible`;
      return result;
    }

    // Get section content
    const content = await section.locator('..').textContent();
    result.content = content || '';
    result.characterCount = result.content.length;

    // Validation checks
    if (!result.content) {
      result.error = 'Section has no content';
    } else if (result.characterCount < minLength) {
      result.error = `Section too short (${result.characterCount} chars, expected ${minLength}+)`;
    } else {
      // Check for placeholder text
      const placeholderPatterns = [
        'No answer available',
        'No content available',
        'No strategy available',
        'No story available',
        'No tools available',
        'No prompts available',
        'No concepts available',
        'Loading...',
        'Please wait...',
        'Coming soon...',
        'Under construction'
      ];

      const hasPlaceholder = placeholderPatterns.some(pattern => 
        result.content!.toLowerCase().includes(pattern.toLowerCase())
      );

      if (hasPlaceholder) {
        result.error = `Section contains placeholder text`;
      } else {
        result.isValid = true;
      }
    }

    if (result.isValid) {
      console.log(`✅ ${sectionName}: ${result.characterCount} characters`);
    } else {
      console.log(`❌ ${sectionName}: ${result.error}`);
    }

    return result;
  } catch (error) {
    result.error = `Error validating section: ${error}`;
    return result;
  }
}

/**
 * Validates all required sections in the ThinkPal response
 */
export async function validateAllSections(page: Page): Promise<{
  isValid: boolean;
  results: SectionValidationResult[];
  errors: string[];
}> {
  const sections = [
    {
      name: 'How to Strategize Your Decision',
      selectors: [
        '[data-testid="strategy-section"]',
        '[data-testid="strategic-section"]',
        'text=How to Strategize Your Decision',
        'text=Strategic Thinking',
        'text=Strategy'
      ]
    },
    {
      name: 'Story in Action',
      selectors: [
        '[data-testid="story-section"]',
        'text=Story in Action',
        'text=Example',
        'text=Case Study'
      ]
    },
    {
      name: 'Analytical Tools',
      selectors: [
        '[data-testid="tools-section"]',
        '[data-testid="analytical-section"]',
        'text=Analytical Tools',
        'text=Tools',
        'text=Analysis'
      ]
    },
    {
      name: 'Reflection Prompts',
      selectors: [
        '[data-testid="prompts-section"]',
        '[data-testid="reflection-section"]',
        'text=Reflection Prompts',
        'text=Prompts',
        'text=Questions'
      ]
    },
    {
      name: 'Concepts/Tools/Practice Reference',
      selectors: [
        '[data-testid="concepts-section"]',
        '[data-testid="reference-section"]',
        'text=Concepts/Tools/Practice Reference',
        'text=Key Concepts',
        'text=Concepts'
      ]
    }
  ];

  const results: SectionValidationResult[] = [];
  const errors: string[] = [];

  for (const section of sections) {
    const result = await validateSection(page, section.name, section.selectors);
    results.push(result);
    
    if (!result.isValid) {
      errors.push(`${section.name}: ${result.error}`);
    }
  }

  const isValid = results.every(r => r.isValid);

  if (isValid) {
    console.log('✅ All sections validated successfully');
  } else {
    console.log(`❌ Section validation failed: ${errors.length} errors`);
  }

  return { isValid, results, errors };
} 