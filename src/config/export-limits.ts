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

export const EXPORT_LIMITS = {
  /**
   * Pull Requests
   * Default: 2000 (comprehensive coverage for most repos)
   * Increased from 1000 in v0.9.5 for better analytics
   */
  prs: 2000,

  /**
   * Issues
   * Default: 2000 (comprehensive coverage)
   * Increased from 1000 in v0.9.5 for better analytics
   */
  issues: 2000,

  /**
   * Commits
   * Uses --paginate for unlimited retrieval with date filters
   * Will fetch ALL commits since specified date via GitHub API
   */
  commits: 0, // 0 means unlimited (uses --paginate)

  /**
   * Branches
   * Default: 500 (most repos have < 500 branches)
   * Increased from 100 in v0.9.5
   */
  branches: 500,

  /**
   * Releases
   * Default: 500 (comprehensive coverage for most projects)
   * Increased from 100 in v0.9.5
   */
  releases: 500,
} as const;

/**
 * Export limit descriptions for user feedback
 */
export const LIMIT_DESCRIPTIONS = {
  prs: `Pull Requests limit: ${EXPORT_LIMITS.prs} items (comprehensive coverage)`,
  issues: `Issues limit: ${EXPORT_LIMITS.issues} items (comprehensive coverage)`,
  commits: `Commits: unlimited with date filters (uses GitHub API pagination)`,
  branches: `Branches limit: ${EXPORT_LIMITS.branches} items (most repos have fewer)`,
  releases: `Releases limit: ${EXPORT_LIMITS.releases} items (comprehensive coverage)`,
} as const;

/**
 * Get limit for a specific export type
 */
export function getExportLimit(
  type: 'prs' | 'issues' | 'commits' | 'branches' | 'releases'
): number {
  return EXPORT_LIMITS[type];
}

/**
 * Get description for a specific export type
 */
export function getLimitDescription(
  type: 'prs' | 'issues' | 'commits' | 'branches' | 'releases'
): string {
  return LIMIT_DESCRIPTIONS[type];
}
