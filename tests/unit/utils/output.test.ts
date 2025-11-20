import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { buildOutputPath, ensureDirectory, generateFilename } from '../../../src/utils/output.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

describe('output utilities', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ghx-output-test-'));
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('buildOutputPath', () => {
    it('should build correct output path', () => {
      const result = buildOutputPath('./export', 'owner', 'repo', 'prs');
      
      expect(result).toContain('export');
      expect(result).toContain('owner');
      expect(result).toContain('repo');
      expect(result).toContain('prs');
    });

    it('should handle absolute paths', () => {
      const absolutePath = path.join(tempDir, 'export');
      const result = buildOutputPath(absolutePath, 'owner', 'repo', 'issues');
      
      expect(result).toContain(absolutePath);
      expect(result).toContain('owner');
      expect(result).toContain('repo');
      expect(result).toContain('issues');
    });

    it('should normalize paths correctly', () => {
      const result = buildOutputPath('./export', 'owner', 'repo', 'commits');
      
      // Should not contain double slashes or backslashes
      expect(result).not.toMatch(/[\/\\]{2,}/);
    });
  });

  describe('ensureDirectory', () => {
    it('should create directory if it does not exist', async () => {
      const testDir = path.join(tempDir, 'new-directory');
      
      await ensureDirectory(testDir);
      
      const exists = await fs.access(testDir).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it('should not throw if directory already exists', async () => {
      const testDir = path.join(tempDir, 'existing-directory');
      await fs.mkdir(testDir);
      
      await expect(ensureDirectory(testDir)).resolves.not.toThrow();
    });

    it('should create nested directories', async () => {
      const nestedDir = path.join(tempDir, 'level1', 'level2', 'level3');
      
      await ensureDirectory(nestedDir);
      
      const exists = await fs.access(nestedDir).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });
  });

  describe('generateFilename', () => {
    it('should generate filename with prefix and identifier', () => {
      const result = generateFilename('PR', 123, 'md');
      
      expect(result).toBe('PR-123.md');
    });

    it('should generate filename with string identifier', () => {
      const result = generateFilename('commit', 'abc123', 'json');
      
      expect(result).toBe('commit-abc123.json');
    });

    it('should sanitize special characters', () => {
      const result = generateFilename('issue', '456-title', 'md');
      
      expect(result).toContain('issue-456');
      expect(result).toContain('.md');
    });
  });
});
