import { describe, it, expect } from 'vitest';
import {
  sanitizeFilename,
  decodeUnicode,
  escapeMarkdown,
  truncate,
  toKebabCase,
} from '@/utils/sanitize';

describe('sanitize utilities', () => {
  describe('sanitizeFilename', () => {
    it('should remove invalid characters', () => {
      const input = 'file<>:"/\\|?*name.txt';
      const result = sanitizeFilename(input);
      expect(result).toBe('file-name.txt');
    });

    it('should replace spaces with hyphens', () => {
      const input = 'my file name.txt';
      const result = sanitizeFilename(input);
      expect(result).toBe('my-file-name.txt');
    });

    it('should replace multiple hyphens with single hyphen', () => {
      const input = 'file---name.txt';
      const result = sanitizeFilename(input);
      expect(result).toBe('file-name.txt');
    });

    it('should remove leading and trailing hyphens', () => {
      const input = '---filename---';
      const result = sanitizeFilename(input);
      expect(result).toBe('filename');
    });

    it('should limit length to 255 characters', () => {
      const input = 'a'.repeat(300);
      const result = sanitizeFilename(input);
      expect(result.length).toBe(255);
    });

    it('should handle control characters', () => {
      const input = 'file\x00\x1Fname.txt';
      const result = sanitizeFilename(input);
      expect(result).toBe('file-name.txt');
    });
  });

  describe('decodeUnicode', () => {
    it('should decode unicode escape sequences', () => {
      const input = 'Hello \\u0057orld';
      const result = decodeUnicode(input);
      expect(result).toBe('Hello World');
    });

    it('should handle multiple unicode sequences', () => {
      const input = '\\u0048\\u0065\\u006c\\u006c\\u006f';
      const result = decodeUnicode(input);
      expect(result).toBe('Hello');
    });

    it('should return original string if decoding fails', () => {
      const input = 'Normal text';
      const result = decodeUnicode(input);
      expect(result).toBe('Normal text');
    });

    it('should handle mixed content', () => {
      const input = 'Test \\u0041BC normal';
      const result = decodeUnicode(input);
      expect(result).toBe('Test ABC normal');
    });
  });

  describe('escapeMarkdown', () => {
    it('should escape markdown special characters', () => {
      const input = '# Header * bold * _italic_';
      const result = escapeMarkdown(input);
      expect(result).toBe('\\# Header \\* bold \\* \\_italic\\_');
    });

    it('should escape brackets and parentheses', () => {
      const input = '[link](url)';
      const result = escapeMarkdown(input);
      expect(result).toBe('\\[link\\]\\(url\\)');
    });

    it('should escape backslashes', () => {
      const input = 'path\\to\\file';
      const result = escapeMarkdown(input);
      expect(result).toBe('path\\\\to\\\\file');
    });

    it('should handle empty string', () => {
      const result = escapeMarkdown('');
      expect(result).toBe('');
    });
  });

  describe('truncate', () => {
    it('should truncate long text', () => {
      const input = 'This is a very long text that needs to be truncated';
      const result = truncate(input, 20);
      expect(result).toBe('This is a very lo...');
      expect(result.length).toBe(20);
    });

    it('should not truncate short text', () => {
      const input = 'Short text';
      const result = truncate(input, 20);
      expect(result).toBe('Short text');
    });

    it('should use custom suffix', () => {
      const input = 'Long text here';
      const result = truncate(input, 10, '…');
      expect(result).toBe('Long text…');
    });

    it('should handle exact length', () => {
      const input = 'Exact';
      const result = truncate(input, 5);
      expect(result).toBe('Exact');
    });
  });

  describe('toKebabCase', () => {
    it('should convert to kebab-case', () => {
      const input = 'Hello World';
      const result = toKebabCase(input);
      expect(result).toBe('hello-world');
    });

    it('should handle special characters', () => {
      const input = 'Hello@World#Test!';
      const result = toKebabCase(input);
      expect(result).toBe('hello-world-test');
    });

    it('should remove leading and trailing hyphens', () => {
      const input = '---Hello World---';
      const result = toKebabCase(input);
      expect(result).toBe('hello-world');
    });

    it('should handle numbers', () => {
      const input = 'Test 123 File';
      const result = toKebabCase(input);
      expect(result).toBe('test-123-file');
    });

    it('should handle already kebab-case strings', () => {
      const input = 'already-kebab-case';
      const result = toKebabCase(input);
      expect(result).toBe('already-kebab-case');
    });
  });
});
