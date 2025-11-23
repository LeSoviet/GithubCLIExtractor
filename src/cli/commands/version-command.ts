import { readFile } from 'fs/promises';
import { join } from 'path';
import type { CommandHandler } from './types.js';

/**
 * Command handler for displaying version information
 */
export class VersionCommand implements CommandHandler {
  async execute(): Promise<void> {
    try {
      const packageJsonPath = join(__dirname, '../../../package.json');
      const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'));
      console.log(packageJson.version || '0.1.0');
    } catch (error) {
      console.log('0.1.0');
    }
  }
}
