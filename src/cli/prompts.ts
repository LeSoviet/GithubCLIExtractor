import * as clack from '@clack/prompts';
import chalk from 'chalk';
import type { Repository, ExportFormat, ExportType } from '../types/index.js';

export async function showWelcome(username?: string) {
  console.clear();

  clack.intro(chalk.bold.cyan('GitHub Extractor CLI'));

  if (username) {
    clack.log.success(`Logged in as: ${chalk.bold(username)}`);
  }
}

export async function selectRepository(repositories: Repository[]): Promise<Repository> {
  const repoOptions = repositories.map((repo) => ({
    value: repo,
    label: `${repo.owner}/${repo.name}`,
    hint: repo.description || 'No description',
  }));

  const selected = await clack.select({
    message: 'Select a repository:',
    options: repoOptions,
    initialValue: repoOptions[0].value,
  });

  if (clack.isCancel(selected)) {
    clack.cancel('Operation cancelled');
    process.exit(0);
  }

  return selected as Repository;
}

export async function selectExportType(): Promise<ExportType> {
  const exportType = await clack.select({
    message: 'What would you like to export?',
    options: [
      { value: 'prs', label: 'Pull Requests', hint: 'Export all PRs' },
      { value: 'commits', label: 'Commits', hint: 'Export commit history' },
      { value: 'branches', label: 'Branches', hint: 'Export branch information' },
      { value: 'issues', label: 'Issues', hint: 'Export all issues' },
      { value: 'releases', label: 'Releases', hint: 'Export all releases' },
      {
        value: 'full-backup',
        label: 'Full Repository Backup',
        hint: 'Export everything',
      },
    ],
  });

  if (clack.isCancel(exportType)) {
    clack.cancel('Operation cancelled');
    process.exit(0);
  }

  return exportType as ExportType;
}

export async function selectExportFormat(): Promise<ExportFormat> {
  const format = await clack.select({
    message: 'Select output format:',
    options: [
      { value: 'markdown', label: 'Markdown', hint: 'Human-readable .md files' },
      { value: 'json', label: 'JSON', hint: 'Machine-readable .json files' },
      { value: 'both', label: 'Both', hint: 'Export in both formats' },
    ],
  });

  if (clack.isCancel(format)) {
    clack.cancel('Operation cancelled');
    process.exit(0);
  }

  return format as ExportFormat;
}

export async function selectOutputPath(defaultPath: string): Promise<string> {
  const outputPath = await clack.text({
    message: 'Enter output path:',
    placeholder: defaultPath,
    defaultValue: defaultPath,
    validate: (value) => {
      if (!value) return 'Output path is required';
      return undefined;
    },
  });

  if (clack.isCancel(outputPath)) {
    clack.cancel('Operation cancelled');
    process.exit(0);
  }

  return outputPath;
}

export async function confirmAction(message: string): Promise<boolean> {
  const confirmed = await clack.confirm({
    message,
  });

  if (clack.isCancel(confirmed)) {
    clack.cancel('Operation cancelled');
    process.exit(0);
  }

  return confirmed;
}

export function showError(message: string) {
  clack.log.error(chalk.red(message));
}

export function showSuccess(message: string) {
  clack.log.success(chalk.green(message));
}

export function showInfo(message: string) {
  clack.log.info(chalk.blue(message));
}

export function showWarning(message: string) {
  clack.log.warn(chalk.yellow(message));
}

export function showOutro(message: string) {
  clack.outro(chalk.bold.green(message));
}
