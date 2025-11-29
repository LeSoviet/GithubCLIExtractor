import { logger } from '../utils/logger.js';
import { MarkdownParser } from './markdown-parser.js';

/**
 * Interface representing data completeness status
 */
export interface DataCompleteness {
  isComplete: boolean;
  prs: number;
  issues: number;
  commits: number;
  branches: number;
  releases: number;
  missingTypes: string[];
}

/**
 * Validates that exported data is complete before generating analytics
 * Prevents generation of misleading reports from partial exports
 *
 * Note: Commits and Branches may be 0 if the directories don't exist yet,
 * but this doesn't mean they're "missing" - they may have been exported
 * in JSON or other formats, or the export may have had legitimate 0 items.
 * Only mark as missing if PRs, Issues, or Releases are 0 (these are core data types).
 */
export async function validateExportedData(path: string): Promise<DataCompleteness> {
  const parser = new MarkdownParser(path);

  logger.debug('Validating exported data completeness...');

  // Parse all data types
  const [prs, issues, commits, branches, releases] = await Promise.all([
    parser.parsePullRequests().catch(() => []),
    parser.parseIssues().catch(() => []),
    parser.parseCommits().catch(() => []),
    parser.parseBranches().catch(() => []),
    parser.parseReleases().catch(() => []),
  ]);

  const counts = {
    prs: prs.length,
    issues: issues.length,
    commits: commits.length,
    branches: branches.length,
    releases: releases.length,
  };

  // Determine which types are missing
  // Only consider core data types (PRs, Issues, Releases) as "missing"
  // Commits and Branches may be 0 legitimately, or may have been exported in other formats
  const missingTypes: string[] = [];
  if (counts.prs === 0) missingTypes.push('Pull Requests');
  if (counts.issues === 0) missingTypes.push('Issues');
  // Do NOT mark commits/branches as missing - they might exist but parsing failed due to directory structure
  if (counts.releases === 0) missingTypes.push('Releases');

  const isComplete = missingTypes.length === 0;

  logger.debug(
    `Data completeness: ${isComplete ? 'Complete' : 'Partial'} (${Object.values(counts).filter((c) => c > 0).length}/5 types)`
  );
  logger.debug(
    `  → PRs: ${counts.prs}, Issues: ${counts.issues}, Commits: ${counts.commits}, Branches: ${counts.branches}, Releases: ${counts.releases}`
  );

  return {
    isComplete,
    ...counts,
    missingTypes,
  };
}

/**
 * Display data completeness status to user
 */
export function displayDataCompletenessStatus(completeness: DataCompleteness): void {
  if (completeness.isComplete) {
    logger.success('✅ Complete data detected - generating comprehensive analytics');
    return;
  }

  // Show what was exported
  logger.warn('');
  logger.warn('⚠️  Partial export detected:');
  if (completeness.prs > 0) logger.warn(`   ✓ Pull Requests: ${completeness.prs} files`);
  else logger.warn('   ✗ Pull Requests: missing');

  if (completeness.issues > 0) logger.warn(`   ✓ Issues: ${completeness.issues} files`);
  else logger.warn('   ✗ Issues: missing');

  if (completeness.commits > 0) logger.warn(`   ✓ Commits: ${completeness.commits} files`);
  else logger.warn('   ✗ Commits: missing');

  if (completeness.branches > 0) logger.warn(`   ✓ Branches: ${completeness.branches} files`);
  else logger.warn('   ✗ Branches: missing');

  if (completeness.releases > 0) logger.warn(`   ✓ Releases: ${completeness.releases} files`);
  else logger.warn('   ✗ Releases: missing');

  logger.warn('');
  logger.warn('📊 Analytics options:');
  logger.warn('   1. ⏭️  Skip analytics (recommended)');
  logger.warn('   2. ⚠️  Generate partial report (data quality affected)');
  logger.warn('');
  logger.info('💡 To generate comprehensive analytics:');
  logger.info('   Use "Full Repository Backup" option');
  logger.info('   This exports all data types needed for accurate metrics');
}
