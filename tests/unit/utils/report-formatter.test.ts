import { describe, it, expect, beforeEach } from 'vitest';
import { ReportFormatter } from '../../../src/utils/report-formatter.js';

describe('ReportFormatter', () => {
  describe('Markdown format', () => {
    let formatter: ReportFormatter;

    beforeEach(() => {
      formatter = new ReportFormatter('markdown');
    });

    it('should format metadata', () => {
      const result = formatter.formatMetadata('Author', 'John Doe');
      expect(result).toContain('Author');
      expect(result).toContain('John Doe');
    });

    it('should format metadata block', () => {
      const result = formatter.formatMetadataBlock({
        Name: 'Test',
        Count: 42,
        Active: true,
      });
      expect(result).toContain('Name');
      expect(result).toContain('Test');
    });

    it('should format section header', () => {
      const result = formatter.formatSection('Overview', 2);
      expect(result).toContain('Overview');
      expect(result).toContain('##');
    });

    it('should handle different heading levels', () => {
      const h1 = formatter.formatSection('Title', 1);
      const h2 = formatter.formatSection('Subtitle', 2);
      const h3 = formatter.formatSection('Details', 3);

      expect(h1).toContain('#');
      expect(h2).toContain('##');
      expect(h3).toContain('###');
    });

    it('should format labels', () => {
      const result = formatter.formatLabels(['bug', 'enhancement', 'docs']);
      expect(result).toContain('bug');
      expect(result).toContain('enhancement');
      expect(result).toContain('docs');
    });

    it('should format table', () => {
      const header = ['Name', 'Count', 'Status'];
      const rows = [
        ['Item1', '10', 'Active'],
        ['Item2', '20', 'Inactive'],
      ];

      const result = formatter.formatTable(header, rows);
      expect(result).toContain('Name');
      expect(result).toContain('Item1');
      expect(result).toContain('10');
    });

    it('should format code block', () => {
      const result = formatter.formatCodeBlock('console.log("test");', 'javascript');
      expect(result).toContain('console.log');
      expect(result).toContain('javascript');
    });

    it('should format blockquote', () => {
      const result = formatter.formatBlockquote('Important note');
      expect(result).toContain('Important note');
      expect(result).toContain('>');
    });

    it('should format link', () => {
      const result = formatter.formatLink('GitHub', 'https://github.com');
      expect(result).toContain('GitHub');
      expect(result).toContain('https://github.com');
    });

    it('should format bold text', () => {
      const result = formatter.formatBold('Important');
      expect(result).toContain('Important');
      expect(result).toContain('**');
    });

    it('should format italic text', () => {
      const result = formatter.formatItalic('Emphasis');
      expect(result).toContain('Emphasis');
      expect(result).toContain('*');
    });

    it('should format horizontal rule', () => {
      const result = formatter.formatHorizontalRule();
      expect(result.length).toBeGreaterThan(0);
    });

    it('should format item with markdown formatter', () => {
      const item = { id: 1, title: 'Test' };
      const result = formatter.formatItem(
        item,
        (i) => `ID: ${i.id} Title: ${i.title}`,
        (i) => `JSON: ${i.title}`
      );

      expect(result).toContain('ID: 1');
      expect(result).toContain('Test');
    });
  });

  describe('JSON format', () => {
    let formatter: ReportFormatter;

    beforeEach(() => {
      formatter = new ReportFormatter('json');
    });

    it('should handle metadata in JSON format', () => {
      const result = formatter.formatMetadata('key', 'value');
      // JSON format should still work
      expect(result).toBeTruthy();
    });

    it('should format item with JSON formatter', () => {
      const item = { id: 1, name: 'Test', active: true };
      const result = formatter.formatItem(
        item,
        (i) => `# ${i.name}`,
        (i) => JSON.stringify(i)
      );

      expect(result).toBeTruthy();
    });

    it('should format metadata block in JSON', () => {
      const result = formatter.formatMetadataBlock({
        title: 'Test Report',
        count: 42,
      });
      expect(result).toBeTruthy();
    });
  });

  describe('Edge cases', () => {
    it('should handle empty labels array', () => {
      const formatter = new ReportFormatter('markdown');
      const result = formatter.formatLabels([]);
      expect(result).toBeTruthy();
    });

    it('should handle empty table', () => {
      const formatter = new ReportFormatter('markdown');
      const result = formatter.formatTable(['Header'], []);
      expect(result).toBeTruthy();
    });

    it('should handle special characters in metadata', () => {
      const formatter = new ReportFormatter('markdown');
      const result = formatter.formatMetadata('Note', 'Special: <>& chars');
      expect(result).toContain('Special');
    });

    it('should handle empty metadata block', () => {
      const formatter = new ReportFormatter('markdown');
      const result = formatter.formatMetadataBlock({});
      expect(result === '').toBe(true);
    });

    it('should handle multiline content in code block', () => {
      const formatter = new ReportFormatter('markdown');
      const code = 'line1\nline2\nline3';
      const result = formatter.formatCodeBlock(code, 'text');
      expect(result).toContain('line1');
      expect(result).toContain('line2');
    });
  });
});
