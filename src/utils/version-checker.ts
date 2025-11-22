import updateNotifier from 'update-notifier';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

// Support both ESM and CJS
const getCurrentDir = (): string => {
  try {
    return typeof __dirname !== 'undefined' ? __dirname : dirname(fileURLToPath(import.meta.url));
  } catch {
    return process.cwd();
  }
};

/**
 * Check for updates and notify the user if a new version is available
 */
export async function checkForUpdates(): Promise<void> {
  try {
    const currentDir = getCurrentDir();
    const packageJsonPath = join(currentDir, '../../package.json');
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'));

    // Check for updates
    const notifier = updateNotifier({
      pkg: packageJson,
      updateCheckInterval: 1000 * 60 * 60 * 24, // Check once per day
    });

    // If an update is available, show a custom notification
    if (notifier.update) {
      const { current, latest } = notifier.update;

      console.log('\n' + chalk.yellow('┌') + chalk.yellow('─'.repeat(70)) + chalk.yellow('┐'));
      console.log(chalk.yellow('│') + ' '.repeat(70) + chalk.yellow('│'));
      console.log(
        chalk.yellow('│') +
          chalk.bold.white('  Update available! ') +
          chalk.dim(`${current}`) +
          chalk.white(' → ') +
          chalk.green.bold(`${latest}`) +
          ' '.repeat(70 - 40 - current.length - latest.length) +
          chalk.yellow('│')
      );
      console.log(chalk.yellow('│') + ' '.repeat(70) + chalk.yellow('│'));

      // Show update command
      const updateCommand = 'npm install -g ghextractor';
      console.log(
        chalk.yellow('│') +
          '  Run ' +
          chalk.cyan.bold(updateCommand) +
          ' to update' +
          ' '.repeat(70 - 12 - updateCommand.length - 10) +
          chalk.yellow('│')
      );

      console.log(chalk.yellow('│') + ' '.repeat(70) + chalk.yellow('│'));

      // Show changelog link
      const changelogUrl = `https://github.com/LeSoviet/GithubCLIExtractor/releases/tag/v${latest}`;
      console.log(
        chalk.yellow('│') +
          '  ' +
          chalk.dim('Changelog: ') +
          chalk.blue.underline(changelogUrl) +
          ' '.repeat(Math.max(0, 70 - 14 - changelogUrl.length - 2)) +
          chalk.yellow('│')
      );

      console.log(chalk.yellow('│') + ' '.repeat(70) + chalk.yellow('│'));
      console.log(chalk.yellow('└') + chalk.yellow('─'.repeat(70)) + chalk.yellow('┘'));
      console.log('');
    }
  } catch (error) {
    // Silently fail if we can't check for updates
    // We don't want to interrupt the user's workflow
  }
}

/**
 * Get the current version of the package
 */
export async function getCurrentVersion(): Promise<string> {
  try {
    const currentDir = getCurrentDir();
    const packageJsonPath = join(currentDir, '../../package.json');
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'));
    return packageJson.version || 'unknown';
  } catch (error) {
    return 'unknown';
  }
}
