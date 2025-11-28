import Handlebars from 'handlebars';
import { logger } from './logger.js';

/**
 * Type-safe template variable definitions
 */
export interface TemplateVariables {
  [key: string]: {
    type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'date';
    required?: boolean;
    description?: string;
  };
}

/**
 * Template validation result
 */
export interface TemplateValidationResult {
  valid: boolean;
  errors: TemplateError[];
  warnings: TemplateWarning[];
  usedVariables: string[];
  missingVariables: string[];
}

export interface TemplateError {
  type: 'syntax' | 'variable' | 'helper' | 'type';
  message: string;
  line?: number;
  context?: string;
}

export interface TemplateWarning {
  type: 'unused' | 'performance' | 'deprecation';
  message: string;
  variable?: string;
}

/**
 * Type-safe template validator for compile-time validation
 * Ensures templates use correct variables and types
 */
export class TypeSafeTemplateValidator {
  private requiredVariables: TemplateVariables = {};
  private registeredHelpers: Set<string> = new Set();
  private allowedHelpers: Set<string> = new Set([
    'if',
    'else',
    'each',
    'with',
    'unless',
    'for',
    // Custom helpers
    'formatDate',
    'uppercase',
    'lowercase',
    'capitalize',
    'truncate',
    'join',
    'pluralize',
    'default',
    'eq',
    'ne',
    'lt',
    'gt',
    'lte',
    'gte',
    'add',
    'subtract',
    'multiply',
    'divide',
    'percent',
  ]);

  constructor(requiredVars?: TemplateVariables) {
    this.requiredVariables = requiredVars || {};
  }

  /**
   * Register a required variable
   */
  addVariable(name: string, type: string, required = true, description = ''): void {
    this.requiredVariables[name] = {
      type: type as any,
      required,
      description,
    };
    logger.debug(`Registered template variable: ${name} (${type})`);
  }

  /**
   * Register multiple variables
   */
  addVariables(vars: TemplateVariables): void {
    this.requiredVariables = { ...this.requiredVariables, ...vars };
  }

  /**
   * Register a custom helper
   */
  registerHelper(name: string): void {
    this.allowedHelpers.add(name);
    this.registeredHelpers.add(name);
  }

  /**
   * Validate a template string
   */
  validateTemplate(template: string): TemplateValidationResult {
    const errors: TemplateError[] = [];
    const warnings: TemplateWarning[] = [];
    const usedVariables = new Set<string>();
    const missingVariables = new Set<string>();

    // Check syntax
    try {
      Handlebars.compile(template);
    } catch (error) {
      errors.push({
        type: 'syntax',
        message: error instanceof Error ? error.message : 'Unknown syntax error',
      });
      return { valid: false, errors, warnings, usedVariables: [], missingVariables: [] };
    }

    // Parse template for variables and helpers
    const variableRegex = /\{\{[\s]*([#^/])?[\s]*([a-zA-Z_$][a-zA-Z0-9_$.-]*)/g;
    const helperRegex = /\{\{[\s]*([a-zA-Z_$][a-zA-Z0-9_$]*)\s+/g;

    let match;

    // Extract variables
    while ((match = variableRegex.exec(template)) !== null) {
      const varName = match[2].split('.')[0]; // Get root variable name

      // Skip built-in variables
      if (!['@index', '@key', '@first', '@last'].includes(varName)) {
        usedVariables.add(varName);
      }
    }

    // Extract helpers
    const helpers = new Set<string>();
    while ((match = helperRegex.exec(template)) !== null) {
      helpers.add(match[1]);
    }

    // Validate used variables
    for (const varName of usedVariables) {
      if (!this.requiredVariables[varName]) {
        // Check if it's a valid helper
        if (!helpers.has(varName)) {
          missingVariables.add(varName);
          warnings.push({
            type: 'unused',
            message: `Variable '${varName}' is not defined in template context`,
            variable: varName,
          });
        }
      }
    }

    // Validate required variables are present
    for (const [varName, config] of Object.entries(this.requiredVariables)) {
      if (config.required && !usedVariables.has(varName)) {
        warnings.push({
          type: 'unused',
          message: `Required variable '${varName}' is not used in template`,
          variable: varName,
        });
      }
    }

    // Validate helpers
    for (const helper of helpers) {
      if (!this.allowedHelpers.has(helper) && !this.requiredVariables[helper]) {
        errors.push({
          type: 'helper',
          message: `Helper '${helper}' is not registered`,
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      usedVariables: Array.from(usedVariables),
      missingVariables: Array.from(missingVariables),
    };
  }

  /**
   * Generate TypeScript interface from template definition
   */
  generateTypeScriptInterface(interfaceName = 'TemplateContext'): string {
    let interface_def = `export interface ${interfaceName} {\n`;

    for (const [varName, config] of Object.entries(this.requiredVariables)) {
      const optional = !config.required ? '?' : '';
      const typeMap = {
        string: 'string',
        number: 'number',
        boolean: 'boolean',
        array: 'any[]',
        object: 'Record<string, any>',
        date: 'Date | string',
      };

      const type = typeMap[config.type];
      const comment = config.description ? `  /** ${config.description} */\n` : '';

      interface_def += `${comment}  ${varName}${optional}: ${type};\n`;
    }

    interface_def += '}\n';
    return interface_def;
  }

  /**
   * Get validation report as string
   */
  getValidationReport(result: TemplateValidationResult): string {
    let report = '# Template Validation Report\n\n';

    report += result.valid ? '✅ VALID\n\n' : '❌ INVALID\n\n';

    if (result.errors.length > 0) {
      report += '## Errors\n\n';
      for (const error of result.errors) {
        report += `- **${error.type}**: ${error.message}\n`;
      }
      report += '\n';
    }

    if (result.warnings.length > 0) {
      report += '## Warnings\n\n';
      for (const warning of result.warnings) {
        report += `- **${warning.type}**: ${warning.message}\n`;
      }
      report += '\n';
    }

    report += `## Statistics\n\n`;
    report += `- **Used Variables**: ${result.usedVariables.length}\n`;
    report += `- **Missing Variables**: ${result.missingVariables.length}\n`;

    return report;
  }
}

/**
 * Factory function to create validator with schema
 */
export function createTemplateValidator(schema: TemplateVariables): TypeSafeTemplateValidator {
  const validator = new TypeSafeTemplateValidator(schema);
  return validator;
}

/**
 * Built-in schemas for common use cases
 */
export const TEMPLATE_SCHEMAS = {
  /**
   * Schema for PR/Issue reports
   */
  pullRequest: {
    number: { type: 'number' as const, required: true, description: 'PR number' },
    title: { type: 'string' as const, required: true, description: 'PR title' },
    author: { type: 'string' as const, required: true, description: 'PR author' },
    state: {
      type: 'string' as const,
      required: true,
      description: 'PR state (open/closed/merged)',
    },
    createdAt: { type: 'date' as const, required: true, description: 'Creation date' },
    updatedAt: { type: 'date' as const, required: true, description: 'Last update date' },
    mergedAt: { type: 'date' as const, required: false, description: 'Merge date' },
    closedAt: { type: 'date' as const, required: false, description: 'Close date' },
    body: { type: 'string' as const, required: false, description: 'PR description' },
    labels: { type: 'array' as const, required: false, description: 'PR labels' },
    url: { type: 'string' as const, required: true, description: 'PR URL' },
  },

  /**
   * Schema for repository summary
   */
  repositorySummary: {
    owner: { type: 'string' as const, required: true, description: 'Repository owner' },
    name: { type: 'string' as const, required: true, description: 'Repository name' },
    description: {
      type: 'string' as const,
      required: false,
      description: 'Repository description',
    },
    url: { type: 'string' as const, required: true, description: 'Repository URL' },
    stars: { type: 'number' as const, required: false, description: 'Star count' },
    totalPRs: { type: 'number' as const, required: false, description: 'Total PRs' },
    totalIssues: { type: 'number' as const, required: false, description: 'Total issues' },
    totalCommits: { type: 'number' as const, required: false, description: 'Total commits' },
    generatedAt: { type: 'date' as const, required: true, description: 'Report generation time' },
  },

  /**
   * Schema for analytics report
   */
  analytics: {
    reportTitle: { type: 'string' as const, required: true, description: 'Report title' },
    repositoryName: { type: 'string' as const, required: true, description: 'Repository name' },
    generatedAt: { type: 'date' as const, required: true, description: 'Generation timestamp' },
    totalPRs: { type: 'number' as const, required: true, description: 'Total PRs' },
    mergedPRs: { type: 'number' as const, required: true, description: 'Merged PRs' },
    mergeRate: { type: 'number' as const, required: true, description: 'Merge rate percentage' },
    averageReviewTime: {
      type: 'number' as const,
      required: false,
      description: 'Average review time in hours',
    },
    topContributors: { type: 'array' as const, required: false, description: 'Top contributors' },
    insights: { type: 'string' as const, required: false, description: 'Key insights' },
  },
};
