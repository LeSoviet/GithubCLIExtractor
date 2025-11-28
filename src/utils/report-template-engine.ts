import Handlebars from 'handlebars';
import { logger } from './logger.js';

/**
 * Template context for rendering reports
 */
export interface TemplateContext {
  [key: string]: any;
}

/**
 * Registered helper functions for templates
 */
type HelperFunction = (...args: any[]) => string | number | boolean;

/**
 * Report Template Engine for flexible report generation
 * Supports custom Handlebars templates for markdown and JSON output
 */
export class ReportTemplateEngine {
  private templateCache: Map<string, HandlebarsTemplateDelegate> = new Map();
  private helpers: Map<string, HelperFunction> = new Map();
  private partials: Map<string, string> = new Map();

  constructor() {
    this.registerDefaultHelpers();
  }

  /**
   * Register a custom Handlebars helper
   */
  registerHelper(name: string, fn: HelperFunction): void {
    this.helpers.set(name, fn);
    Handlebars.registerHelper(name, fn as any);
    logger.debug(`Registered template helper: ${name}`);
  }

  /**
   * Register a partial template
   */
  registerPartial(name: string, template: string): void {
    this.partials.set(name, template);
    Handlebars.registerPartial(name, template);
    logger.debug(`Registered template partial: ${name}`);
  }

  /**
   * Load and register a partial from a template string
   */
  registerPartialFromString(name: string, content: string): void {
    this.registerPartial(name, content);
  }

  /**
   * Compile a template string
   */
  compileTemplate(template: string): HandlebarsTemplateDelegate {
    try {
      return Handlebars.compile(template);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to compile template: ${errorMsg}`);
      throw new Error(`Template compilation failed: ${errorMsg}`);
    }
  }

  /**
   * Get or compile a cached template
   */
  getTemplate(templateName: string, template: string): HandlebarsTemplateDelegate {
    if (this.templateCache.has(templateName)) {
      return this.templateCache.get(templateName)!;
    }

    const compiled = this.compileTemplate(template);
    this.templateCache.set(templateName, compiled);
    return compiled;
  }

  /**
   * Render a template with context
   */
  render(template: string, context: TemplateContext): string {
    try {
      const compiled = this.compileTemplate(template);
      return compiled(context);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to render template: ${errorMsg}`);
      throw new Error(`Template rendering failed: ${errorMsg}`);
    }
  }

  /**
   * Render a cached template
   */
  renderCached(templateName: string, template: string, context: TemplateContext): string {
    const compiled = this.getTemplate(templateName, template);
    return compiled(context);
  }

  /**
   * Register default helper functions
   */
  private registerDefaultHelpers(): void {
    // Date formatting helper
    this.registerHelper('formatDate', (date: string | Date) => {
      if (!date) return 'N/A';
      const d = new Date(date);
      return d.toLocaleDateString();
    });

    // Time formatting helper
    this.registerHelper('formatTime', (date: string | Date) => {
      if (!date) return 'N/A';
      const d = new Date(date);
      return d.toLocaleTimeString();
    });

    // ISO date helper
    this.registerHelper('formatISO', (date: string | Date) => {
      if (!date) return 'N/A';
      const d = new Date(date);
      return d.toISOString();
    });

    // Uppercase helper
    this.registerHelper('uppercase', (str: string) => {
      return (str || '').toUpperCase();
    });

    // Lowercase helper
    this.registerHelper('lowercase', (str: string) => {
      return (str || '').toLowerCase();
    });

    // Capitalize helper
    this.registerHelper('capitalize', (str: string) => {
      if (!str) return '';
      return str.charAt(0).toUpperCase() + str.slice(1);
    });

    // Pluralize helper
    this.registerHelper('pluralize', (count: number, singular: string, plural: string) => {
      return count === 1 ? singular : plural;
    });

    // Join array helper
    this.registerHelper('join', (arr: any[], separator: string = ', ') => {
      return arr && arr.length > 0 ? arr.join(separator) : '';
    });

    // Truncate helper
    this.registerHelper('truncate', (str: string, length: number) => {
      if (!str) return '';
      if (str.length <= length) return str;
      return str.substring(0, length) + '...';
    });

    // Default value helper
    this.registerHelper('default', (value: any, defaultValue: string) => {
      return value !== null && value !== undefined && value !== '' ? value : defaultValue;
    });

    // Conditional helpers
    this.registerHelper('eq', (a: any, b: any) => {
      return a === b;
    });

    this.registerHelper('ne', (a: any, b: any) => {
      return a !== b;
    });

    this.registerHelper('lt', (a: number, b: number) => {
      return a < b;
    });

    this.registerHelper('gt', (a: number, b: number) => {
      return a > b;
    });

    this.registerHelper('lte', (a: number, b: number) => {
      return a <= b;
    });

    this.registerHelper('gte', (a: number, b: number) => {
      return a >= b;
    });

    // Math helpers
    this.registerHelper('add', (a: number, b: number) => {
      return a + b;
    });

    this.registerHelper('subtract', (a: number, b: number) => {
      return a - b;
    });

    this.registerHelper('multiply', (a: number, b: number) => {
      return a * b;
    });

    this.registerHelper('divide', (a: number, b: number) => {
      if (b === 0) return 'N/A';
      return (a / b).toFixed(2);
    });

    this.registerHelper('percent', (value: number, total: number) => {
      if (total === 0) return '0%';
      return Math.round((value / total) * 100) + '%';
    });

    logger.debug('Registered 20+ default template helpers');
  }

  /**
   * Clear template cache
   */
  clearCache(): void {
    this.templateCache.clear();
    logger.debug('Cleared template cache');
  }

  /**
   * Get all registered helpers
   */
  getHelpers(): string[] {
    return Array.from(this.helpers.keys());
  }

  /**
   * Get all registered partials
   */
  getPartials(): string[] {
    return Array.from(this.partials.keys());
  }

  /**
   * Validate template syntax
   */
  validateTemplate(template: string): { valid: boolean; error?: string } {
    try {
      Handlebars.compile(template);
      return { valid: true };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return { valid: false, error: errorMsg };
    }
  }
}

/**
 * Singleton instance
 */
let templateEngineInstance: ReportTemplateEngine | null = null;

/**
 * Get or create the global template engine instance
 */
export function getTemplateEngine(): ReportTemplateEngine {
  if (!templateEngineInstance) {
    templateEngineInstance = new ReportTemplateEngine();
  }
  return templateEngineInstance;
}

/**
 * Built-in template examples
 */
export const BUILT_IN_TEMPLATES = {
  /**
   * Default markdown template for a PR report
   */
  prMarkdown: `# Pull Request #{{number}}: {{title}}

## Metadata

- **Author:** {{author}}
- **State:** {{uppercase state}}
- **Created:** {{formatDate createdAt}}
- **Updated:** {{formatDate updatedAt}}
{{#if closedAt}}- **Closed:** {{formatDate closedAt}}{{/if}}
{{#if mergedAt}}- **Merged:** {{formatDate mergedAt}}{{/if}}
- **Labels:** {{#if labels}}{{join labels}}{{else}}None{{/if}}
- **URL:** {{url}}

## Description

{{#if body}}{{body}}{{else}}*No description provided*{{/if}}

---

*Exported with [GitHub Extractor CLI](https://github.com/LeSoviet/ghextractor)*
`,

  /**
   * Default JSON template (uses Handlebars for wrapping)
   */
  prJson: `{
  "number": {{number}},
  "title": "{{title}}",
  "author": "{{author}}",
  "state": "{{state}}",
  "createdAt": "{{formatISO createdAt}}",
  "updatedAt": "{{formatISO updatedAt}}",
  "labels": {{json labels}},
  "url": "{{url}}"
}
`,

  /**
   * Summary template
   */
  summaryMarkdown: `# Export Summary

**Generated:** {{formatDate timestamp}}

## Statistics

- **Total Items:** {{total}}
- **Successful:** {{successful}}
- **Failed:** {{failed}}
- **Duration:** {{duration}} seconds

---

*Exported with [GitHub Extractor CLI](https://github.com/LeSoviet/ghextractor)*
`,
};
