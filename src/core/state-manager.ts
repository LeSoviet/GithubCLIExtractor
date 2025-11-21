import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import type { StateStore, ExportState, DiffModeOptions } from '../types/state.js';
import type { SingleExportType } from '../types/index.js';

/**
 * State Manager for incremental exports
 * Tracks last export timestamps to enable diff mode
 */
export class StateManager {
  private readonly stateDir: string;
  private readonly stateFile: string;
  private state: StateStore | null = null;

  constructor() {
    this.stateDir = join(homedir(), '.ghextractor', 'state');
    this.stateFile = join(this.stateDir, 'exports.json');
  }

  /**
   * Load state from disk
   */
  async load(): Promise<StateStore> {
    if (this.state) {
      return this.state;
    }

    try {
      const data = await readFile(this.stateFile, 'utf-8');
      this.state = JSON.parse(data);
      return this.state!;
    } catch (error) {
      // State file doesn't exist or is invalid, create new
      this.state = {
        version: '1.0.0',
        exports: [],
        updatedAt: new Date().toISOString(),
      };
      return this.state;
    }
  }

  /**
   * Save state to disk
   */
  async save(): Promise<void> {
    if (!this.state) {
      return;
    }

    try {
      // Ensure state directory exists
      await mkdir(this.stateDir, { recursive: true });

      // Update timestamp
      this.state.updatedAt = new Date().toISOString();

      // Write state file
      await writeFile(this.stateFile, JSON.stringify(this.state, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save state:', error);
    }
  }

  /**
   * Get last export state for a repository and type
   */
  async getLastExport(
    repository: string,
    type: SingleExportType
  ): Promise<ExportState | null> {
    const state = await this.load();

    const exportState = state.exports.find(
      (e) => e.repository === repository && e.type === type
    );

    return exportState || null;
  }

  /**
   * Update export state after successful export
   */
  async updateExportState(
    repository: string,
    type: SingleExportType,
    count: number,
    format: 'markdown' | 'json' | 'both',
    outputPath: string
  ): Promise<void> {
    const state = await this.load();

    const existingIndex = state.exports.findIndex(
      (e) => e.repository === repository && e.type === type
    );

    const newState: ExportState = {
      repository,
      type,
      lastExportAt: new Date().toISOString(),
      lastCount: count,
      format,
      outputPath,
    };

    if (existingIndex >= 0) {
      // Update existing state
      state.exports[existingIndex] = newState;
    } else {
      // Add new state
      state.exports.push(newState);
    }

    await this.save();
  }

  /**
   * Get diff mode options based on last export
   */
  async getDiffModeOptions(
    repository: string,
    type: SingleExportType,
    forceFullExport: boolean = false
  ): Promise<DiffModeOptions> {
    if (forceFullExport) {
      return {
        enabled: false,
        forceFullExport: true,
      };
    }

    const lastExport = await this.getLastExport(repository, type);

    if (!lastExport) {
      // No previous export, do full export
      return {
        enabled: false,
      };
    }

    // Enable diff mode with since date
    return {
      enabled: true,
      since: lastExport.lastExportAt,
    };
  }

  /**
   * Clear all state (for testing or reset)
   */
  async clear(): Promise<void> {
    this.state = {
      version: '1.0.0',
      exports: [],
      updatedAt: new Date().toISOString(),
    };
    await this.save();
  }

  /**
   * Get all export states for a repository
   */
  async getRepositoryStates(repository: string): Promise<ExportState[]> {
    const state = await this.load();
    return state.exports.filter((e) => e.repository === repository);
  }

  /**
   * Delete export state for a repository and type
   */
  async deleteExportState(repository: string, type: SingleExportType): Promise<void> {
    const state = await this.load();
    state.exports = state.exports.filter(
      (e) => !(e.repository === repository && e.type === type)
    );
    await this.save();
  }
}

// Singleton instance
let stateManagerInstance: StateManager | null = null;

/**
 * Get singleton state manager instance
 */
export function getStateManager(): StateManager {
  if (!stateManagerInstance) {
    stateManagerInstance = new StateManager();
  }
  return stateManagerInstance;
}
