import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import type { ConfigFile, CLIConfig } from '../types/config.js';
import { logger } from './logger.js';

const CONFIG_FILENAMES = ['.ghextractorrc.json', 'ghextractor.config.json'];
const GLOBAL_CONFIG_PATH = join(homedir(), '.ghextractor', 'config.json');

/**
 * Configuration Manager
 */
export class ConfigManager {
  private config: CLIConfig | null = null;

  /**
   * Find configuration file in current directory or home directory
   */
  private async findConfigFile(): Promise<string | null> {
    // Check current directory
    for (const filename of CONFIG_FILENAMES) {
      const localPath = join(process.cwd(), filename);
      if (existsSync(localPath)) {
        logger.debug(`Found local config: ${localPath}`);
        return localPath;
      }
    }

    // Check home directory
    if (existsSync(GLOBAL_CONFIG_PATH)) {
      logger.debug(`Found global config: ${GLOBAL_CONFIG_PATH}`);
      return GLOBAL_CONFIG_PATH;
    }

    return null;
  }

  /**
   * Load configuration from file
   */
  async load(): Promise<CLIConfig> {
    if (this.config) {
      return this.config;
    }

    const configPath = await this.findConfigFile();

    if (!configPath) {
      // Return default configuration
      this.config = this.getDefaultConfig();
      logger.debug('Using default configuration');
      return this.config;
    }

    try {
      const content = await readFile(configPath, 'utf-8');
      const fileConfig: ConfigFile = JSON.parse(content);

      // Merge with defaults
      this.config = {
        ...this.getDefaultConfig(),
        ...fileConfig,
      };

      logger.info(`Loaded configuration from: ${configPath}`);
      return this.config;
    } catch (error) {
      logger.warn(`Failed to load config from ${configPath}: ${error}`);
      this.config = this.getDefaultConfig();
      return this.config;
    }
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): CLIConfig {
    return {
      version: '0.1.0',
      defaultFormat: 'markdown',
      outputPath: './github-export',
      excludeLabels: [],
      excludeBranches: [],
      rateLimitThreshold: 100,
      parallelExports: 3,
      cacheEnabled: true,
      cacheTTL: 24,
    };
  }

  /**
   * Save configuration to file
   */
  async save(config: Partial<ConfigFile>, global = false): Promise<void> {
    const path = global ? GLOBAL_CONFIG_PATH : join(process.cwd(), CONFIG_FILENAMES[0]);

    try {
      const currentConfig = await this.load();
      const updatedConfig = { ...currentConfig, ...config };

      // Remove internal fields before saving
      const { version, lastRun, tokens, ...fileConfig } = updatedConfig;

      await writeFile(path, JSON.stringify(fileConfig, null, 2), 'utf-8');
      logger.info(`Configuration saved to: ${path}`);
    } catch (error) {
      throw new Error(`Failed to save configuration: ${error}`);
    }
  }

  /**
   * Get configuration value
   */
  async get<K extends keyof CLIConfig>(key: K): Promise<CLIConfig[K]> {
    const config = await this.load();
    return config[key];
  }

  /**
   * Set configuration value
   */
  async set<K extends keyof ConfigFile>(key: K, value: ConfigFile[K]): Promise<void> {
    const config = await this.load();
    (config as any)[key] = value;
    this.config = config;
  }

  /**
   * Create a sample configuration file
   */
  async createSample(path?: string): Promise<string> {
    const sampleConfig: ConfigFile = {
      defaultFormat: 'markdown',
      outputPath: './github-export',
      excludeLabels: ['wontfix', 'duplicate'],
      excludeBranches: ['temp-*', 'experiment-*'],
      rateLimitThreshold: 100,
      parallelExports: 3,
      cacheEnabled: true,
      cacheTTL: 24,
      templates: {
        pr: './templates/pr.hbs',
        commit: './templates/commit.hbs',
        issue: './templates/issue.hbs',
        release: './templates/release.hbs',
      },
    };

    const targetPath = path || join(process.cwd(), CONFIG_FILENAMES[0]);
    await writeFile(targetPath, JSON.stringify(sampleConfig, null, 2), 'utf-8');
    logger.info(`Created sample configuration: ${targetPath}`);
    return targetPath;
  }

  /**
   * Check if configuration file exists
   */
  async exists(): Promise<boolean> {
    const configPath = await this.findConfigFile();
    return configPath !== null;
  }
}

// Singleton instance
let configManagerInstance: ConfigManager | null = null;

/**
 * Get the global configuration manager instance
 */
export function getConfigManager(): ConfigManager {
  if (!configManagerInstance) {
    configManagerInstance = new ConfigManager();
  }
  return configManagerInstance;
}

/**
 * Load configuration
 */
export async function loadConfig(): Promise<CLIConfig> {
  const manager = getConfigManager();
  return manager.load();
}

/**
 * Get configuration value
 */
export async function getConfig<K extends keyof CLIConfig>(key: K): Promise<CLIConfig[K]> {
  const manager = getConfigManager();
  return manager.get(key);
}
