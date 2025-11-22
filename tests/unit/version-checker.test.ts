import { describe, it, expect } from 'vitest';
import { getCurrentVersion } from '../../src/utils/version-checker.js';

describe('Version Checker', () => {
  it('should get current version from package.json', async () => {
    const version = await getCurrentVersion();
    expect(version).toMatch(/^\d+\.\d+\.\d+$/); // Should match semver format
    expect(version).not.toBe('unknown');
  });

  it('should return a valid semver version', async () => {
    const version = await getCurrentVersion();
    const parts = version.split('.');
    expect(parts).toHaveLength(3);
    expect(parseInt(parts[0])).toBeGreaterThanOrEqual(0);
    expect(parseInt(parts[1])).toBeGreaterThanOrEqual(0);
    expect(parseInt(parts[2])).toBeGreaterThanOrEqual(0);
  });
});
