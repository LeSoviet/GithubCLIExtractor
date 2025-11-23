/**
 * Report generators module
 * Provides modular components for generating analytics reports
 */

export { MarkdownReportGenerator } from './markdown-generator.js';
export { ActivitySectionGenerator } from './activity-section.js';
export { ContributorSectionGenerator } from './contributor-section.js';
export { LabelSectionGenerator } from './label-section.js';
export { HealthSectionGenerator } from './health-section.js';
export { RecommendationsGenerator } from './recommendations.js';
export { statusHelpers } from './status-helpers.js';
export type { SectionGenerator, StatusHelpers } from './types.js';

// Export factory and exporter interfaces
export {
  AnalyticsExporterFactory,
  MarkdownAnalyticsExporter,
  JsonAnalyticsExporter,
} from './exporter-factory.js';
export type { AnalyticsExporter, ExportFormat } from './exporter-factory.js';

// Export metrics calculator
export { MetricsCalculator } from './metrics-calculator.js';
export type { CalculatedMetrics } from './metrics-calculator.js';

// Export orchestrator
export { ExportOrchestrator } from './export-orchestrator.js';
export type {
  ExportOperationResult,
  OrchestrationResult,
  ExportOrchestratorOptions,
} from './export-orchestrator.js';
