import Handlebars from 'handlebars';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { format } from 'date-fns';
import { logger } from './logger.js';

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Template Engine using Handlebars
 */
export class TemplateEngine {
  private templates: Map<string, HandlebarsTemplateDelegate> = new Map();

  constructor() {
    this.registerHelpers();
  }

  /**
   * Register Handlebars helpers
   */
  private registerHelpers(): void {
    // Format date helper
    Handlebars.registerHelper('formatDate', (dateString: string) => {
      try {
        return format(new Date(dateString), 'PPpp');
      } catch {
        return dateString;
      }
    });

    // Uppercase helper
    Handlebars.registerHelper('uppercase', (str: string) => {
      return str ? str.toUpperCase() : '';
    });

    // Join array helper
    Handlebars.registerHelper('join', (arr: string[], separator: string) => {
      return arr && arr.length > 0 ? arr.join(separator) : '';
    });

    // Conditional equality helper
    Handlebars.registerHelper('eq', (a: any, b: any) => {
      return a === b;
    });

    // Greater than helper
    Handlebars.registerHelper('gt', (a: number, b: number) => {
      return a > b;
    });

    // Format number helper
    Handlebars.registerHelper('formatNumber', (num: number) => {
      return num.toLocaleString();
    });
  }

  /**
   * Load template from file
   */
  async loadTemplate(templatePath: string): Promise<HandlebarsTemplateDelegate> {
    // Check if template is already loaded
    if (this.templates.has(templatePath)) {
      return this.templates.get(templatePath)!;
    }

    try {
      const content = await readFile(templatePath, 'utf-8');
      const template = Handlebars.compile(content);
      this.templates.set(templatePath, template);
      logger.debug(`Loaded template: ${templatePath}`);
      return template;
    } catch (error) {
      throw new Error(`Failed to load template ${templatePath}: ${error}`);
    }
  }

  /**
   * Load built-in template
   */
  async loadBuiltInTemplate(name: string): Promise<HandlebarsTemplateDelegate> {
    const templatePath = join(__dirname, '..', 'templates', `${name}-template.hbs`);

    if (!existsSync(templatePath)) {
      throw new Error(`Built-in template not found: ${name}`);
    }

    return this.loadTemplate(templatePath);
  }

  /**
   * Render template with data
   */
  async render(templatePath: string, data: any): Promise<string> {
    const template = await this.loadTemplate(templatePath);
    return template(data);
  }

  /**
   * Render built-in template with data
   */
  async renderBuiltIn(name: string, data: any): Promise<string> {
    const template = await this.loadBuiltInTemplate(name);
    return template(data);
  }

  /**
   * Compile template string
   */
  compileString(templateString: string): HandlebarsTemplateDelegate {
    return Handlebars.compile(templateString);
  }

  /**
   * Clear template cache
   */
  clearCache(): void {
    this.templates.clear();
    logger.debug('Template cache cleared');
  }
}

// Singleton instance
let templateEngineInstance: TemplateEngine | null = null;

/**
 * Get the global template engine instance
 */
export function getTemplateEngine(): TemplateEngine {
  if (!templateEngineInstance) {
    templateEngineInstance = new TemplateEngine();
  }
  return templateEngineInstance;
}

/**
 * Render a template
 */
export async function renderTemplate(templatePath: string, data: any): Promise<string> {
  const engine = getTemplateEngine();
  return engine.render(templatePath, data);
}

/**
 * Render a built-in template
 */
export async function renderBuiltInTemplate(name: string, data: any): Promise<string> {
  const engine = getTemplateEngine();
  return engine.renderBuiltIn(name, data);
}
