import { describe, bench } from 'vitest';
import { sanitizeFilename, decodeUnicode, toKebabCase } from '@/utils/sanitize';
import { withRetry } from '@/utils/retry';

/**
 * Performance benchmarks for critical operations
 * Run with: npm run test:bench
 */
describe('Performance Benchmarks', () => {
  describe('Sanitization Performance', () => {
    const testStrings = {
      short: 'test-file-name.txt',
      medium: 'This is a medium length filename with some special characters!@#$%',
      long: 'a'.repeat(300),
      unicode: 'Test \\u0041\\u0042\\u0043 unicode string',
      special: 'file<>:"/\\|?*name with lots of invalid characters!!!',
    };

    bench('sanitizeFilename - short string', () => {
      sanitizeFilename(testStrings.short);
    });

    bench('sanitizeFilename - medium string', () => {
      sanitizeFilename(testStrings.medium);
    });

    bench('sanitizeFilename - long string', () => {
      sanitizeFilename(testStrings.long);
    });

    bench('sanitizeFilename - special characters', () => {
      sanitizeFilename(testStrings.special);
    });

    bench('decodeUnicode - with unicode', () => {
      decodeUnicode(testStrings.unicode);
    });

    bench('toKebabCase - conversion', () => {
      toKebabCase(testStrings.medium);
    });
  });

  describe('Retry Logic Performance', () => {
    bench('withRetry - immediate success', async () => {
      await withRetry(async () => 'success', { maxRetries: 3 });
    });

    bench('withRetry - success after 1 retry', async () => {
      let attempts = 0;
      await withRetry(
        async () => {
          attempts++;
          if (attempts < 2) throw new Error('fail');
          return 'success';
        },
        { maxRetries: 3, initialDelay: 1 }
      );
    });
  });

  describe('File Operations Performance', () => {
    bench('Array creation - 100 items', () => {
      Array.from({ length: 100 }, (_, i) => ({
        id: i,
        title: `Item ${i}`,
        body: `Body for item ${i}`,
      }));
    });

    bench('Array creation - 1000 items', () => {
      Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        title: `Item ${i}`,
        body: `Body for item ${i}`,
      }));
    });

    bench('JSON stringify - small object', () => {
      JSON.stringify({ id: 1, title: 'Test', body: 'Body' });
    });

    bench('JSON stringify - large object', () => {
      const largeObj = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        title: `Item ${i}`,
        body: `Body for item ${i}`,
        metadata: {
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
        },
      }));
      JSON.stringify(largeObj);
    });
  });

  describe('String Operations Performance', () => {
    const longText = 'Lorem ipsum dolor sit amet, '.repeat(100);

    bench('String replace - single', () => {
      longText.replace('Lorem', 'Test');
    });

    bench('String replace - global regex', () => {
      longText.replace(/Lorem/g, 'Test');
    });

    bench('String split and join', () => {
      longText.split(' ').join('-');
    });

    bench('String toLowerCase', () => {
      longText.toLowerCase();
    });

    bench('String substring', () => {
      longText.substring(0, 100);
    });
  });

  describe('Object Operations Performance', () => {
    const testObject = {
      id: 1,
      title: 'Test',
      body: 'Body text',
      metadata: {
        created: '2024-01-01',
        updated: '2024-01-02',
      },
      labels: ['bug', 'enhancement'],
    };

    bench('Object spread', () => {
      const copy = { ...testObject };
      // Access the copy to prevent optimization
      copy.id;
    });

    bench('Object.assign', () => {
      const copy = Object.assign({}, testObject);
      // Access the copy to prevent optimization
      copy.id;
    });

    bench('JSON parse/stringify clone', () => {
      const copy = JSON.parse(JSON.stringify(testObject));
      // Access the copy to prevent optimization
      copy.id;
    });

    bench('Object.keys', () => {
      Object.keys(testObject);
    });

    bench('Object.values', () => {
      Object.values(testObject);
    });

    bench('Object.entries', () => {
      Object.entries(testObject);
    });
  });

  describe('Array Operations Performance', () => {
    const smallArray = Array.from({ length: 10 }, (_, i) => i);
    const mediumArray = Array.from({ length: 100 }, (_, i) => i);
    const largeArray = Array.from({ length: 1000 }, (_, i) => i);

    bench('Array.map - small array', () => {
      smallArray.map((x) => x * 2);
    });

    bench('Array.map - medium array', () => {
      mediumArray.map((x) => x * 2);
    });

    bench('Array.map - large array', () => {
      largeArray.map((x) => x * 2);
    });

    bench('Array.filter - small array', () => {
      smallArray.filter((x) => x % 2 === 0);
    });

    bench('Array.filter - medium array', () => {
      mediumArray.filter((x) => x % 2 === 0);
    });

    bench('Array.reduce - sum', () => {
      mediumArray.reduce((acc, x) => acc + x, 0);
    });

    bench('Array.find', () => {
      mediumArray.find((x) => x === 50);
    });

    bench('Array.includes', () => {
      mediumArray.includes(50);
    });
  });

  describe('Date Operations Performance', () => {
    const dateString = '2024-01-01T00:00:00Z';

    bench('new Date()', () => {
      new Date();
    });

    bench('Date.parse', () => {
      Date.parse(dateString);
    });

    bench('new Date(string)', () => {
      new Date(dateString);
    });

    bench('Date.toISOString', () => {
      new Date().toISOString();
    });

    bench('Date.toLocaleString', () => {
      new Date().toLocaleString();
    });
  });

  describe('RegExp Performance', () => {
    const testText = 'This is a test string with multiple words and numbers 123';

    bench('RegExp test - literal', () => {
      /test/.test(testText);
    });

    bench('RegExp test - new RegExp', () => {
      new RegExp('test').test(testText);
    });

    bench('String.includes', () => {
      testText.includes('test');
    });

    bench('String.indexOf', () => {
      testText.indexOf('test') !== -1;
    });

    bench('RegExp match - global', () => {
      testText.match(/\w+/g);
    });
  });
});
