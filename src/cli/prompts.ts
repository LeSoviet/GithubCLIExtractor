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

export async function selectRepository(repositories: Repository[]): Promise<Repository | null> {
  const repoOptions = [
    ...repositories.map((repo) => ({
      value: repo,
      label: `${repo.owner}/${repo.name}`,
      hint: repo.description || 'No description',
    })),
    {
      value: null,
      label: '📝 Enter a repository manually',
      hint: 'Type owner/repo (e.g., facebook/react)',
    },
  ];

  const selected = await clack.select({
    message: 'Select a repository:',
    options: repoOptions,
    initialValue: repoOptions[0].value,
  });

  if (clack.isCancel(selected)) {
    clack.cancel('Operation cancelled');
    process.exit(0);
  }

  return selected as Repository | null;
}

export async function promptRepositoryInput(): Promise<string> {
  const repoInput = await clack.text({
    message: 'Enter repository (owner/repo):',
    placeholder: 'e.g., facebook/react',
    validate: (value) => {
      if (!value) return 'Repository is required';
      if (!value.includes('/')) return 'Format must be: owner/repo';
      const parts = value.split('/');
      if (parts.length !== 2) return 'Format must be: owner/repo';
      if (!parts[0] || !parts[1]) return 'Both owner and repo name are required';
      return undefined;
    },
  });

  if (clack.isCancel(repoInput)) {
    clack.cancel('Operation cancelled');
    process.exit(0);
  }

  return repoInput;
}

export async function selectExportType(): Promise<ExportType | 'batch-export'> {
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
      {
        value: 'batch-export',
        label: '🔄 Batch Export',
        hint: 'Export from multiple repositories',
      },
    ],
  });

  if (clack.isCancel(exportType)) {
    clack.cancel('Operation cancelled');
    process.exit(0);
  }

  return exportType as ExportType | 'batch-export';
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

/**
 * Batch export prompts
 */
export async function selectBatchRepositories(repositories: Repository[]): Promise<string[]> {
  const MANUAL_ENTRY = '__manual_entry__';

  const repoOptions = [
    ...repositories.map((repo) => ({
      value: `${repo.owner}/${repo.name}`,
      label: `${repo.owner}/${repo.name}`,
      hint: repo.description || 'No description',
    })),
    {
      value: MANUAL_ENTRY,
      label: '📝 Enter public repository manually',
      hint: 'Add repos not listed above',
    },
  ];

  const selected = await clack.multiselect({
    message: 'Select repositories for batch export (space to select):',
    options: repoOptions,
    required: true,
  });

  if (clack.isCancel(selected)) {
    clack.cancel('Operation cancelled');
    process.exit(0);
  }

  const selectedRepos = selected as string[];
  const finalRepos: string[] = [];

  // Add selected repos (excluding manual entry marker)
  for (const repo of selectedRepos) {
    if (repo !== MANUAL_ENTRY) {
      finalRepos.push(repo);
    }
  }

  // If user selected manual entry, prompt for additional repos
  if (selectedRepos.includes(MANUAL_ENTRY)) {
    showInfo('Enter public repositories not listed above');
    const manualRepos = await clack.text({
      message: 'Enter repositories (comma-separated):',
      placeholder: 'e.g., facebook/react, vercel/next.js, microsoft/TypeScript',
      validate: (value) => {
        if (!value) return undefined; // Optional if repos already selected
        const repos = value.split(',').map((r) => r.trim());
        for (const repo of repos) {
          if (!repo.includes('/')) {
            return `Invalid format: "${repo}". Use owner/repo format`;
          }
          const parts = repo.split('/');
          if (parts.length !== 2 || !parts[0] || !parts[1]) {
            return `Invalid format: "${repo}". Use owner/repo format`;
          }
        }
        return undefined;
      },
    });

    if (clack.isCancel(manualRepos)) {
      clack.cancel('Operation cancelled');
      process.exit(0);
    }

    if (manualRepos) {
      const manualRepoList = manualRepos.split(',').map((r) => r.trim());
      finalRepos.push(...manualRepoList);
    }
  }

  // Ensure at least one repo was selected
  if (finalRepos.length === 0) {
    showError('At least one repository is required');
    process.exit(1);
  }

  return finalRepos;
}

export async function selectBatchExportTypes(): Promise<string[]> {
  const types = await clack.multiselect({
    message: 'What would you like to export? (space to select)',
    options: [
      { value: 'prs', label: 'Pull Requests', hint: 'Export all PRs' },
      { value: 'issues', label: 'Issues', hint: 'Export all issues' },
      { value: 'commits', label: 'Commits', hint: 'Export commit history' },
      { value: 'branches', label: 'Branches', hint: 'Export branch information' },
      { value: 'releases', label: 'Releases', hint: 'Export all releases' },
    ],
    required: true,
  });

  if (clack.isCancel(types)) {
    clack.cancel('Operation cancelled');
    process.exit(0);
  }

  return types as string[];
}

export async function promptBatchParallelism(): Promise<number> {
  const parallelism = await clack.text({
    message: 'How many repositories to process in parallel?',
    placeholder: '3',
    defaultValue: '3',
    validate: (value) => {
      const num = parseInt(value);
      if (isNaN(num)) return 'Must be a number';
      if (num < 1) return 'Must be at least 1';
      if (num > 10) return 'Maximum is 10';
      return undefined;
    },
  });

  if (clack.isCancel(parallelism)) {
    clack.cancel('Operation cancelled');
    process.exit(0);
  }

  return parseInt(parallelism);
}

export async function promptEnableDiffMode(): Promise<boolean> {
  const enableDiff = await clack.confirm({
    message: 'Enable incremental mode? (only export new/updated items)',
    initialValue: false,
  });

  if (clack.isCancel(enableDiff)) {
    clack.cancel('Operation cancelled');
    process.exit(0);
  }

  return enableDiff;
}
