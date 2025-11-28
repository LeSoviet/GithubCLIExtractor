#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import readline from 'readline';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Check if --gui flag is passed
const args = process.argv.slice(2);
const hasGuiFlag = args.includes('--gui');
const hasCliFlag = args.includes('--cli');

if (hasGuiFlag) {
  // Launch GUI directly
  launchGUI();
} else if (hasCliFlag || args.length > 0) {
  // Launch CLI if --cli flag or other arguments present
  launchCLI();
} else {
  // No flags - show interactive menu
  showMenu();
}

function showMenu() {
  console.log('\n🚀 GitHub Extractor\n');
  console.log('Choose your interface:');
  console.log('  1) CLI - Command Line Interface (recommended for automation)');
  console.log('  2) GUI - Graphical User Interface (with filters & preview)');
  console.log('  q) Quit\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('Your choice (1/2/q): ', async (answer) => {
    rl.close();

    switch (answer.trim()) {
      case '1':
        launchCLI();
        break;
      case '2':
        await launchGUI();
        break;
      case 'q':
      case 'Q':
        console.log('Goodbye! 👋\n');
        process.exit(0);
        break;
      default:
        console.log('Invalid choice. Please run again and choose 1, 2, or q.\n');
        process.exit(1);
    }
  });
}

function launchCLI() {
  import('../dist/index.js').catch(() => import('../dist/index.cjs')).catch((err) => {
    console.error('Failed to launch CLI:', err.message);
    process.exit(1);
  });
}

async function launchGUI() {
  const fs = await import('fs');
  const { execSync } = await import('child_process');
  const mainPath = join(__dirname, '..', 'out', 'main', 'index.js');
  const rendererPath = join(__dirname, '..', 'out', 'renderer', 'index.html');

  // Check if GUI is built (both main and renderer must exist)
  if (!fs.existsSync(mainPath) || !fs.existsSync(rendererPath)) {
    console.log('\n⏳ GUI not built yet. Building now...\n');

    try {
      const isWindows = process.platform === 'win32';
      const npmCmd = isWindows ? 'npm.cmd' : 'npm';

      // Show building message
      console.log('🔨 Building GUI...');

      execSync(`${npmCmd} run build:gui`, {
        stdio: 'inherit',
        cwd: join(__dirname, '..')
      });

      console.log('\n✅ GUI built successfully!\n');
      // Continue to launch GUI
    } catch (err) {
      console.error('\n❌ Build failed. Please try again.\n');
      process.exit(1);
    }
  }

  try {
    // Use npx to run electron - works cross-platform
    const isWindows = process.platform === 'win32';
    const npmCmd = isWindows ? 'npm.cmd' : 'npm';

    execSync(`${npmCmd} run preview:gui`, {
      stdio: 'inherit',
      cwd: join(__dirname, '..')
    });
  } catch (err) {
    if (err.status) {
      process.exit(err.status);
    }
    console.error('\n❌ Failed to start GUI.\n');
    process.exit(1);
  }
}
