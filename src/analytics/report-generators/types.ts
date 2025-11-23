import type { AnalyticsReport } from '../../types/analytics.js';

/**
 * Interface for section generators
 */
export interface SectionGenerator {
  generate(report: AnalyticsReport): string;
}

/**
 * Helper functions for status determination
 */
export interface StatusHelpers {
  getHealthStatus(value: number, minGood: number, minExcellent: number): string;
  getContributorStatus(count: number): string;
  getBusFactorStatus(factor: number): string;
  getDeploymentStatus(releases: number): string;
}
