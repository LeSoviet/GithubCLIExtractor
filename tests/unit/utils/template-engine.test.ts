import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getTemplateEngine } from '../../../src/utils/template-engine.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

describe('template-engine', () => {
  let tempDir: string;
  let engine: ReturnType<typeof getTemplateEngine>;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ghx-template-test-'));
    engine = getTemplateEngine();
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
    engine.clearCache();
  });

  describe('compileString', () => {
    it('should compile and render simple template with data', () => {
      const template = engine.compileString('Hello {{name}}!');
      const result = template({ name: 'World' });
      
      expect(result).toBe('Hello World!');
    });

    it('should handle multiple variables', () => {
      const template = engine.compileString('{{title}} - {{author}} ({{year}})');
      const result = template({ title: 'Test PR', author: 'user', year: 2024 });
      
      expect(result).toBe('Test PR - user (2024)');
    });

    it('should handle missing variables gracefully', () => {
      const template = engine.compileString('{{title}} - {{missing}}');
      const result = template({ title: 'Test' });
      
      expect(result).toContain('Test');
    });

    it('should handle nested objects', () => {
      const template = engine.compileString('{{user.name}} - {{user.email}}');
      const result = template({ user: { name: 'John', email: 'john@example.com' } });
      
      expect(result).toContain('John');
      expect(result).toContain('john@example.com');
    });

    it('should handle arrays with each helper', () => {
      const template = engine.compileString('{{#each items}}{{this}}, {{/each}}');
      const result = template({ items: ['apple', 'banana', 'cherry'] });
      
      expect(result).toContain('apple');
      expect(result).toContain('banana');
      expect(result).toContain('cherry');
    });
  });

  describe('loadTemplate', () => {
    it('should load and render template from file', async () => {
      const templatePath = path.join(tempDir, 'test-template.hbs');
      const templateContent = 'Test template: {{value}}';
      
      await fs.writeFile(templatePath, templateContent);
      
      const result = await engine.render(templatePath, { value: 'Success' });
      
      expect(result).toBe('Test template: Success');
    });

    it('should cache loaded templates', async () => {
      const templatePath = path.join(tempDir, 'cached-template.hbs');
      await fs.writeFile(templatePath, 'Cached: {{data}}');
      
      // Load twice
      await engine.render(templatePath, { data: 'First' });
      const result = await engine.render(templatePath, { data: 'Second' });
      
      expect(result).toBe('Cached: Second');
    });

    it('should throw error for non-existent file', async () => {
      const templatePath = path.join(tempDir, 'non-existent.hbs');
      
      await expect(engine.render(templatePath, {})).rejects.toThrow();
    });
  });

  describe('built-in helpers', () => {
    it('should use uppercase helper', () => {
      const template = engine.compileString('{{uppercase text}}');
      const result = template({ text: 'hello' });
      
      expect(result).toBe('HELLO');
    });

    it('should use join helper', () => {
      const template = engine.compileString('{{join labels ", "}}');
      const result = template({ labels: ['bug', 'enhancement', 'high-priority'] });
      
      expect(result).toBe('bug, enhancement, high-priority');
    });

    it('should use eq helper', () => {
      const template = engine.compileString('{{#if (eq status "open")}}Open{{else}}Closed{{/if}}');
      const result = template({ status: 'open' });
      
      expect(result).toBe('Open');
    });

    it('should use gt helper', () => {
      const template = engine.compileString('{{#if (gt count 10)}}Many{{else}}Few{{/if}}');
      const result = template({ count: 15 });
      
      expect(result).toBe('Many');
    });

    it('should use formatNumber helper', () => {
      const template = engine.compileString('{{formatNumber value}}');
      const result = template({ value: 1000 });
      
      expect(result).toContain('1');
      expect(result).toContain('000');
    });

    it('should handle empty arrays in join helper', () => {
      const template = engine.compileString('{{join labels ", "}}');
      const result = template({ labels: [] });
      
      expect(result).toBe('');
    });
  });

  describe('clearCache', () => {
    it('should clear template cache', async () => {
      const templatePath = path.join(tempDir, 'cache-test.hbs');
      await fs.writeFile(templatePath, 'Initial: {{value}}');
      
      await engine.render(templatePath, { value: 'First' });
      engine.clearCache();
      
      // Modify template
      await fs.writeFile(templatePath, 'Modified: {{value}}');
      const result = await engine.render(templatePath, { value: 'Second' });
      
      expect(result).toBe('Modified: Second');
    });
  });
});
