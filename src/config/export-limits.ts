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
   * Default: 1000 (covers most repos; facebook/react has ~500 merged PRs)
   * Increased from 500 in v0.9.2
   */
  prs: 1000,

  /**
   * Issues
   * Default: 1000
   * Increased from 500 in v0.9.2
   */
  issues: 1000,

  /**
   * Commits
   * Default: 500 (per_page=100 with automatic pagination)
   * Note: Commits endpoint uses per_page parameter
   * GitHub CLI will automatically paginate through all results
   */
  commits: 500,

  /**
   * Branches
   * Default: 100
   * Most repos have < 100 branches
   */
  branches: 100,

  /**
   * Releases
   * Default: 100
   * Most repos have < 100 releases
   */
  releases: 100,
} as const;

/**
 * Export limit descriptions for user feedback
 */
export const LIMIT_DESCRIPTIONS = {
  prs: `Pull Requests limit: ${EXPORT_LIMITS.prs} items (increased for completeness)`,
  issues: `Issues limit: ${EXPORT_LIMITS.issues} items (increased for completeness)`,
  commits: `Commits limit: ${EXPORT_LIMITS.commits} items with automatic pagination`,
  branches: `Branches limit: ${EXPORT_LIMITS.branches} items (typical repos have fewer)`,
  releases: `Releases limit: ${EXPORT_LIMITS.releases} items`,
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
