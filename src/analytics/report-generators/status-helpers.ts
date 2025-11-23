import type { StatusHelpers } from './types.js';

/**
 * Helper functions for determining health status of metrics
 */
export const statusHelpers: StatusHelpers = {
  /**
   * Get health status with emoji and text based on value and thresholds
   */
  getHealthStatus(value: number, minGood: number, minExcellent: number): string {
    if (value >= minExcellent) return '🟢 Excellent';
    if (value >= minGood) return '🟡 Fair';
    return '🔴 Needs Improvement';
  },

  /**
   * Get status for contributor count
   */
  getContributorStatus(count: number): string {
    if (count >= 10) return '🟢 Healthy';
    if (count >= 5) return '🟡 Moderate';
    return '🔴 Limited';
  },

  /**
   * Get status for bus factor (number of critical contributors)
   */
  getBusFactorStatus(factor: number): string {
    if (factor >= 5) return '🟢 Low Risk';
    if (factor >= 3) return '🟡 Medium Risk';
    return '🔴 High Risk';
  },

  /**
   * Get status for deployment frequency
   */
  getDeploymentStatus(releases: number): string {
    if (releases >= 20) return '🟢 Very Active';
    if (releases >= 10) return '🟡 Active';
    if (releases >= 5) return '🟠 Moderate';
    return '🔴 Low Activity';
  },
};
