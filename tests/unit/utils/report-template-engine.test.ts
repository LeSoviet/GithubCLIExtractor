import { describe, it, expect, beforeEach } from 'vitest';
import { ReportTemplateEngine } from '../../../src/utils/report-template-engine.js';

describe('ReportTemplateEngine', () => {
  let engine: ReportTemplateEngine;

  beforeEach(() => {
    engine = new ReportTemplateEngine();
  });

  describe('basic templating', () => {
    it('should compile and render simple template', () => {
      const template = 'Hello {{name}}';
      const result = engine.render(template, { name: 'World' });

      expect(result).toContain('Hello');
      expect(result).toContain('World');
    });

    it('should handle multiple variables', () => {
      const template = '{{title}} by {{author}} ({{year}})';
      const result = engine.render(template, {
        title: 'Test Report',
        author: 'John',
        year: 2024,
      });

      expect(result).toContain('Test Report');
      expect(result).toContain('John');
      expect(result).toContain('2024');
    });

    it('should handle conditionals', () => {
      const template = '{{#if active}}Active{{else}}Inactive{{/if}}';
      const result1 = engine.render(template, { active: true });
      const result2 = engine.render(template, { active: false });

      expect(result1).toContain('Active');
      expect(result2).toContain('Inactive');
    });

    it('should handle loops', () => {
      const template = '{{#each items}}{{this}} {{/each}}';
      const result = engine.render(template, {
        items: ['a', 'b', 'c'],
      });

      expect(result).toContain('a');
      expect(result).toContain('b');
      expect(result).toContain('c');
    });
  });

  describe('helper registration', () => {
    it('should register and use custom helpers', () => {
      engine.registerHelper('upper', (str: string) => str.toUpperCase());
      const template = '{{upper name}}';
      const result = engine.render(template, { name: 'test' });

      expect(result).toContain('TEST');
    });

    it('should use built-in uppercase helper', () => {
      const template = '{{uppercase text}}';
      const result = engine.render(template, { text: 'hello' });

      expect(result).toContain('HELLO');
    });

    it('should use built-in lowercase helper', () => {
      const template = '{{lowercase text}}';
      const result = engine.render(template, { text: 'HELLO' });

      expect(result).toContain('hello');
    });

    it('should use built-in capitalize helper', () => {
      const template = '{{capitalize text}}';
      const result = engine.render(template, { text: 'hello world' });

      expect(result).toContain('Hello world');
    });

    it('should use built-in truncate helper', () => {
      const template = '{{truncate text 5}}';
      const result = engine.render(template, { text: 'hello world' });

      expect(result.length).toBeLessThan('hello world'.length);
    });

    it('should use built-in join helper', () => {
      const template = '{{join items ", "}}';
      const result = engine.render(template, {
        items: ['apple', 'banana', 'cherry'],
      });

      expect(result).toContain('apple');
      expect(result).toContain('banana');
      expect(result).toContain('cherry');
    });

    it('should use math helpers', () => {
      const template = '{{add a b}}';
      const result = engine.render(template, { a: 5, b: 3 });

      expect(result).toContain('8');
    });

    it('should use comparison helpers', () => {
      const template = '{{#if (eq status "active")}}Active{{/if}}';
      const result = engine.render(template, { status: 'active' });

      expect(result).toContain('Active');
    });
  });

  describe('partial registration', () => {
    it('should register and use partials', () => {
      engine.registerPartial('header', 'Report: {{title}}');
      const template = '{{>header}}';
      const result = engine.render(template, { title: 'Sales' });

      expect(result).toContain('Report: Sales');
    });
  });

  describe('error handling', () => {
    it('should handle missing variables gracefully', () => {
      const template = '{{name}}';
      const result = engine.render(template, {});

      expect(typeof result).toBe('string');
    });

    it('should render empty string for undefined variables', () => {
      const template = 'Hello {{name}}';
      const result = engine.render(template, { name: undefined });

      expect(result).toContain('Hello');
    });
  });

  describe('complex templates', () => {
    it('should render table-like structure', () => {
      const template = `
{{#each items}}
| {{name}} | {{count}} |
{{/each}}`;

      const result = engine.render(template, {
        items: [
          { name: 'Item1', count: 10 },
          { name: 'Item2', count: 20 },
        ],
      });

      expect(result).toContain('Item1');
      expect(result).toContain('10');
      expect(result).toContain('Item2');
      expect(result).toContain('20');
    });

    it('should handle nested structures', () => {
      const template = `{{#each users}}
User: {{this.name}}
{{#each this.tags}}
  - {{this}}
{{/each}}
{{/each}}`;

      const result = engine.render(template, {
        users: [
          { name: 'Alice', tags: ['admin', 'dev'] },
          { name: 'Bob', tags: ['user'] },
        ],
      });

      expect(result).toContain('Alice');
      expect(result).toContain('admin');
      expect(result).toContain('Bob');
    });
  });

  describe('date helpers', () => {
    it('should format date with formatDate helper', () => {
      const template = '{{formatDate date}}';
      const result = engine.render(template, {
        date: new Date('2024-01-15'),
      });

      expect(result.length).toBeGreaterThan(0);
    });

    it('should format ISO date with formatISO helper', () => {
      const template = '{{formatISO date}}';
      const result = engine.render(template, {
        date: new Date('2024-01-15'),
      });

      expect(result).toContain('2024');
    });
  });

  describe('utility helpers', () => {
    it('should use default helper', () => {
      const template = '{{default value "N/A"}}';
      const result1 = engine.render(template, { value: 'Test' });
      const result2 = engine.render(template, { value: null });

      expect(result1).toContain('Test');
      expect(result2).toContain('N/A');
    });

    it('should use pluralize helper', () => {
      const template = '{{pluralize count "item" "items"}}';
      const result1 = engine.render(template, { count: 1 });
      const result2 = engine.render(template, { count: 5 });

      expect(result1).toContain('item');
      expect(result2).toContain('items');
    });
  });
});
