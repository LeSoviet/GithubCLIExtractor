import { checkGhInstalled, getAuthStatus } from '../../core/github-auth.js';
import type { CommandHandler } from './types.js';

/**
 * Command handler for checking GitHub CLI setup
 */
export class CheckCommand implements CommandHandler {
  async execute(): Promise<void> {
    console.log('Checking GitHub CLI setup...\n');

    const ghInstalled = await checkGhInstalled();
    if (ghInstalled) {
      console.log('✔ GitHub CLI (gh) is installed');
    } else {
      console.log('✖ GitHub CLI (gh) is not installed');
      console.log('  Install from: https://cli.github.com/');
      // In test mode, don't exit with error
      if (!process.env.GHX_TEST_MODE) {
        process.exit(1);
      }
    }

    const authStatus = await getAuthStatus();
    if (authStatus.isAuthenticated) {
      console.log(`✔ Authenticated as: ${authStatus.username}`);
    } else {
      console.log('✖ Not authenticated');
      console.log('  Run: gh auth login');
      // In test mode, don't exit with error
      if (!process.env.GHX_TEST_MODE) {
        process.exit(1);
      }
    }

    console.log('\n✔ Setup is complete!');
  }
}
