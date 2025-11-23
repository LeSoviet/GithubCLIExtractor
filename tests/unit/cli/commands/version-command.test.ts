import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VersionCommand } from '@/cli/commands/version-command.js';
import { join } from 'path';
import { tmpdir } from 'os';
import { mkdir, writeFile, rm } from 'fs/promises';

describe('VersionCommand', () => {
  let versionCommand: VersionCommand;
  let testDir: string;
  let originalCwd: string;

  beforeEach(() => {
    versionCommand = new VersionCommand();
    testDir = join(tmpdir(), `ghextractor-version-test-${Date.now()}`);
    originalCwd = process.cwd();
  });

  afterEach(async () => {
    // Restore original directory
    process.chdir(originalCwd);

    // Clean up test directory
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should display version from package.json when available', async () => {
    // Create test directory with package.json
    await mkdir(testDir, { recursive: true });
    process.chdir(testDir);

    // Create a mock package.json
    const packageJson = {
      name: 'ghextractor',
      version: '1.2.3-test',
    };

    await writeFile(join(testDir, 'package.json'), JSON.stringify(packageJson, null, 2), 'utf-8');

    // Mock console.log to capture output
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {
      // Intentionally empty - just capturing calls
    });

    // Execute version command
    await versionCommand.execute();

    // Verify the correct version was displayed
    expect(logSpy).toHaveBeenCalledWith('1.2.3-test');

    // Restore console.log
    logSpy.mockRestore();
  });

  it('should display "unknown" when package.json is not found', async () => {
    // Change to test directory with no package.json
    await mkdir(testDir, { recursive: true });
    process.chdir(testDir);

    // Mock console.log to capture output
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {
      // Intentionally empty - just capturing calls
    });

    // Execute version command
    await versionCommand.execute();

    // Verify "unknown" was displayed
    expect(logSpy).toHaveBeenCalledWith('unknown');

    // Restore console.log
    logSpy.mockRestore();
  });

  it('should display "unknown" when package.json is invalid', async () => {
    // Create test directory with invalid package.json
    await mkdir(testDir, { recursive: true });
    process.chdir(testDir);

    // Create an invalid package.json
    await writeFile(join(testDir, 'package.json'), 'invalid json{{{', 'utf-8');

    // Mock console.log to capture output
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {
      // Intentionally empty - just capturing calls
    });

    // Execute version command
    await versionCommand.execute();

    // Verify "unknown" was displayed
    expect(logSpy).toHaveBeenCalledWith('unknown');

    // Restore console.log
    logSpy.mockRestore();
  });

  it('should display "unknown" when package.json has no version field', async () => {
    // Create test directory with package.json but no version
    await mkdir(testDir, { recursive: true });
    process.chdir(testDir);

    // Create a mock package.json without version
    const packageJson = {
      name: 'ghextractor',
      description: 'Test package',
    };

    await writeFile(join(testDir, 'package.json'), JSON.stringify(packageJson, null, 2), 'utf-8');

    // Mock console.log to capture output
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {
      // Intentionally empty - just capturing calls
    });

    // Execute version command
    await versionCommand.execute();

    // Verify "unknown" was displayed
    expect(logSpy).toHaveBeenCalledWith('unknown');

    // Restore console.log
    logSpy.mockRestore();
  });

  it('should display "unknown" when package.json has different name', async () => {
    // Create test directory with package.json but different name
    await mkdir(testDir, { recursive: true });
    process.chdir(testDir);

    // Create a mock package.json with different name
    const packageJson = {
      name: 'different-package',
      version: '1.2.3',
    };

    await writeFile(join(testDir, 'package.json'), JSON.stringify(packageJson, null, 2), 'utf-8');

    // Mock console.log to capture output
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {
      // Intentionally empty - just capturing calls
    });

    // Execute version command
    await versionCommand.execute();

    // Verify "unknown" was displayed
    expect(logSpy).toHaveBeenCalledWith('unknown');

    // Restore console.log
    logSpy.mockRestore();
  });
});
