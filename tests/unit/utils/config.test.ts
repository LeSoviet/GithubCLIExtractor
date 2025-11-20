import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ConfigManager } from '@/utils/config';
import { mkdir, writeFile, rm } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import type { ConfigFile } from '@/types/config';

describe('ConfigManager', () => {
  let configManager: ConfigManager;
  let testDir: string;
  let originalCwd: string;

  beforeEach(() => {
    configManager = new ConfigManager();
    testDir = join(tmpdir(), `ghextractor-config-test-${Date.now()}`);
    originalCwd = process.cwd();
  });

  afterEach(async () => {
    // Restore original directory
    process.chdir(originalCwd);
    
    // Clean up test directory
    if (existsSync(testDir)) {
      await rm(testDir, { recursive: true, force: true });
    }
  });

  describe('load', () => {
    it('should load default configuration if no config file exists', async () => {
      // Change to test directory with no config
      await mkdir(testDir, { recursive: true });
      process.chdir(testDir);

      const config = await configManager.load();

      expect(config).toBeDefined();
      expect(config.defaultFormat).toBeDefined();
      expect(config.outputPath).toBeDefined();
      expect(config.version).toBeDefined();
    });

    it('should load configuration from local file', async () => {
      await mkdir(testDir, { recursive: true });
      process.chdir(testDir);

      const configData: ConfigFile = {
        defaultFormat: 'json',
        outputPath: './custom-output',
        cacheEnabled: true,
        cacheTTL: 48,
      };

      await writeFile(
        join(testDir, '.ghextractorrc.json'),
        JSON.stringify(configData, null, 2),
        'utf-8'
      );

      const config = await configManager.load();

      expect(config.outputPath).toBe('./custom-output');
      expect(config.defaultFormat).toBe('json');
      expect(config.cacheTTL).toBe(48);
    });

    it('should cache loaded configuration', async () => {
      await mkdir(testDir, { recursive: true });
      process.chdir(testDir);

      const config1 = await configManager.load();
      const config2 = await configManager.load();

      expect(config1).toBe(config2);
    });

    it('should handle malformed JSON gracefully', async () => {
      await mkdir(testDir, { recursive: true });
      process.chdir(testDir);

      await writeFile(join(testDir, '.ghextractorrc.json'), 'invalid json{{{', 'utf-8');

      // Should fall back to default config
      const config = await configManager.load();
      expect(config).toBeDefined();
      expect(config.version).toBeDefined();
    });
  });

  describe('get', () => {
    it('should get configuration value', async () => {
      await mkdir(testDir, { recursive: true });
      process.chdir(testDir);

      const configData: ConfigFile = {
        defaultFormat: 'json',
        outputPath: './test-output',
        cacheEnabled: true,
      };

      await writeFile(
        join(testDir, '.ghextractorrc.json'),
        JSON.stringify(configData, null, 2),
        'utf-8'
      );

      const outputPath = await configManager.get('outputPath');
      const defaultFormat = await configManager.get('defaultFormat');

      expect(outputPath).toBe('./test-output');
      expect(defaultFormat).toBe('json');
    });

    it('should get default value for undefined keys', async () => {
      await mkdir(testDir, { recursive: true });
      process.chdir(testDir);

      const version = await configManager.get('version');

      expect(version).toBeDefined();
      expect(typeof version).toBe('string');
    });
  });

  describe('set', () => {
    it('should set configuration value', async () => {
      await mkdir(testDir, { recursive: true });
      process.chdir(testDir);

      await configManager.load();
      await configManager.set('outputPath', './new-path');

      const value = await configManager.get('outputPath');

      expect(value).toBe('./new-path');
    });

    it('should set format value', async () => {
      await mkdir(testDir, { recursive: true });
      process.chdir(testDir);

      await configManager.load();
      await configManager.set('defaultFormat', 'json');

      const value = await configManager.get('defaultFormat');

      expect(value).toBe('json');
    });
  });

  describe('save', () => {
    it('should save configuration to file', async () => {
      await mkdir(testDir, { recursive: true });
      process.chdir(testDir);

      await configManager.load();
      await configManager.save({ outputPath: './saved-output' });

      // Verify file was saved
      const configPath = join(testDir, '.ghextractorrc.json');
      expect(existsSync(configPath)).toBe(true);
    });

    it('should persist configuration across instances', async () => {
      await mkdir(testDir, { recursive: true });
      process.chdir(testDir);

      const configManager1 = new ConfigManager();
      await configManager1.load();
      await configManager1.save({ outputPath: './persistent-path' });

      // Create new instance and load
      const configManager2 = new ConfigManager();
      await configManager2.load();
      const value = await configManager2.get('outputPath');

      expect(value).toBe('./persistent-path');
    });
  });

  describe('exists', () => {
    it('should return false when no config file exists', async () => {
      await mkdir(testDir, { recursive: true });
      process.chdir(testDir);

      const exists = await configManager.exists();

      expect(exists).toBe(false);
    });

    it('should return true when config file exists', async () => {
      await mkdir(testDir, { recursive: true });
      process.chdir(testDir);

      await writeFile(
        join(testDir, '.ghextractorrc.json'),
        JSON.stringify({ defaultFormat: 'markdown' }),
        'utf-8'
      );

      const exists = await configManager.exists();

      expect(exists).toBe(true);
    });
  });

  describe('createSample', () => {
    it('should create sample configuration file', async () => {
      await mkdir(testDir, { recursive: true });
      process.chdir(testDir);

      const path = await configManager.createSample();

      expect(existsSync(path)).toBe(true);
    });
  });
});
