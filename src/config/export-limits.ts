/**
 * Export limits configuration
 *
 * These limits are used across all exporters and analytics modules
 * to ensure consistent data fetching behavior.
 *
 * IMPORTANT: These limits determine what data the user gets:
 * - Lower limits = faster export but potentially incomplete data
 * - Higher limits = complete data but may take longer, especially for large repos
 *
 * The validator will warn if exported data is smaller than the limit,
 * indicating the export is complete. If data equals the limit exactly,
 * it might be capped and incomplete.
 */

import type { ConfigFile, ExportLimitType } from '../types/config.js';

/**
 * Default export limits used when no configuration override is provided.
 */
const DEFAULT_EXPORT_LIMITS: Record<ExportLimitType, number> = {
  prs: 10000,
  issues: 10000,
  branches: 500,
  releases: 1000,
};

/**
 * Resolve the effective export limits, applying user configuration overrides
 * on top of the defaults.
 */
export function resolveExportLimits(
  config?: Partial<ConfigFile>
): Record<ExportLimitType, number> {
  const overrides = config?.exportLimits ?? {};
  return {
    prs: overrides.prs ?? DEFAULT_EXPORT_LIMITS.prs,
    issues: overrides.issues ?? DEFAULT_EXPORT_LIMITS.issues,
    branches: overrides.branches ?? DEFAULT_EXPORT_LIMITS.branches,
    releases: overrides.releases ?? DEFAULT_EXPORT_LIMITS.releases,
  };
}

/**
 * Get the effective limit for a specific export type.
 * When a config is provided, user overrides are honored; otherwise the default
 * (matching previous behavior) is returned.
 */
export function getExportLimit(
  type: ExportLimitType,
  config?: Partial<ConfigFile>
): number {
  return resolveExportLimits(config)[type];
}

/**
 * Get the default export limit for a specific export type.
 */
export function getDefaultExportLimit(type: ExportLimitType): number {
  return DEFAULT_EXPORT_LIMITS[type];
}

/**
 * Get description for a specific export type
 */
export function getLimitDescription(type: ExportLimitType): string {
  const descriptions: Record<ExportLimitType, string> = {
    prs: `Pull Requests limit: configurable (default ${DEFAULT_EXPORT_LIMITS.prs} items)`,
    issues: `Issues limit: configurable (default ${DEFAULT_EXPORT_LIMITS.issues} items)`,
    branches: `Branches limit: configurable (default ${DEFAULT_EXPORT_LIMITS.branches} items)`,
    releases: `Releases limit: configurable (default ${DEFAULT_EXPORT_LIMITS.releases} items)`,
  };
  return descriptions[type];
}
