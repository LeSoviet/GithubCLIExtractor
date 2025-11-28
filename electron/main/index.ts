import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { listUserRepositories } from '../../src/scanner/repo-scanner.js';
import { execGhJson } from '../../src/utils/exec-gh.js';
import { PullRequestExporter } from '../../src/exporters/prs.js';
import { IssueExporter } from '../../src/exporters/issues.js';
import { CommitExporter } from '../../src/exporters/commits.js';
import { BranchExporter } from '../../src/exporters/branches.js';
import { ReleaseExporter } from '../../src/exporters/releases.js';
import { buildOutputPath } from '../../src/utils/output.js';
import { logger } from '../../src/utils/logger.js';

// Support both ESM and CJS
const __dirname = fileURLToPath(new URL('.', import.meta.url)); // @ts-ignore - ESM compatibility

let mainWindow: BrowserWindow | null = null;
let isDarkTheme = true; // Track current theme

function updateTitlebarTheme(darkMode: boolean) {
  if (!mainWindow) return;
  isDarkTheme = darkMode;

  // Update titlebar color based on theme
  if (process.platform === 'win32') {
    // Windows: Set titlebar color dynamically
    mainWindow.setBackgroundColor(darkMode ? '#1e1e1e' : '#ffffff');
  } else if (process.platform === 'darwin') {
    // macOS: Set titlebar style
    mainWindow.setWindowButtonPosition({
      x: 13,
      y: 13,
    });
  }
}

function createWindow() {
  console.log('[Main] Creating browser window...');
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'GitHub Extractor',
    autoHideMenuBar: false,
    // Initialize with dark theme
    backgroundColor: isDarkTheme ? '#1e1e1e' : '#ffffff',
    // Show native frame to support custom titlebar styling
    frame: true,
  });

  // Load the app - use dev server in development, file in production
  if (process.env.ELECTRON_RENDERER_URL) {
    console.log('[Main] Loading from dev server:', process.env.ELECTRON_RENDERER_URL);
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else if (process.env.NODE_ENV === 'development') {
    // Fallback for dev mode when ELECTRON_RENDERER_URL is not set
    console.log('[Main] Loading from dev server (fallback):', 'http://localhost:5173');
    mainWindow.loadURL('http://localhost:5173').catch((err) => {
      console.error('[Main] Failed to load from dev server, falling back to file:', err);
      const htmlPath = join(__dirname, '../renderer/index.html');
      mainWindow!.loadFile(htmlPath).catch((fileErr) => {
        console.error('[Main] Failed to load HTML file:', fileErr);
      });
    });
  } else {
    const htmlPath = join(__dirname, '../renderer/index.html');
    console.log('[Main] Loading HTML from:', htmlPath);
    mainWindow
      .loadFile(htmlPath)
      .then(() => {
        console.log('[Main] HTML loaded successfully');
      })
      .catch((error) => {
        console.error('[Main] Failed to load HTML:', error);
      });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error('[Main] Renderer failed to load:', errorCode, errorDescription);
  });

  // Listen for theme changes from renderer
  ipcMain.on('theme-changed', (_event, isDark: boolean) => {
    updateTitlebarTheme(isDark);
  });
}

app
  .whenReady()
  .then(() => {
    console.log('[Main] App is ready, creating window...');
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  })
  .catch((error) => {
    console.error('[Main] Failed to start app:', error);
    app.quit();
  });

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers
ipcMain.handle('get-repositories', async () => {
  try {
    console.log('[Main] Fetching repositories...');

    // Check if GitHub CLI is authenticated before trying to fetch
    const { getAuthStatus } = await import('../../src/core/github-auth.js');
    const authStatus = await getAuthStatus();

    console.log('[Main] Auth status:', authStatus);

    if (!authStatus.isAuthenticated) {
      throw new Error('GitHub CLI not authenticated. Please run: gh auth login');
    }

    const repos = await listUserRepositories();
    console.log(`[Main] Successfully fetched ${repos.length} repositories`);

    return repos.map((repo) => ({
      owner: repo.owner,
      name: repo.name,
      fullName: `${repo.owner}/${repo.name}`,
    }));
  } catch (error) {
    console.error('[Main] Failed to fetch repositories:', error);
    if (error instanceof Error) {
      console.error('[Main] Error message:', error.message);
      console.error('[Main] Error stack:', error.stack);
    }
    throw error;
  }
});

ipcMain.handle('get-contributors', async (_event, repoOwner: string, repoName: string) => {
  try {
    const repoId = `${repoOwner}/${repoName}`;
    // Fetch unique contributors from commits
    const commits = await execGhJson<any[]>(`api repos/${repoId}/contributors --paginate`, {
      timeout: 30000,
      useRateLimit: false,
      useRetry: false,
    });

    const contributors = commits.map((c: any) => c.login).filter(Boolean);
    return Array.from(new Set(contributors));
  } catch (error) {
    console.error('Failed to fetch contributors:', error);
    return [];
  }
});

ipcMain.handle('select-folder', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openDirectory', 'createDirectory'],
    });

    if (result.canceled) {
      return null;
    }

    return result.filePaths[0];
  } catch (error) {
    console.error('Failed to open folder dialog:', error);
    return null;
  }
});

ipcMain.handle('open-folder', async (_event, folderPath: string) => {
  try {
    // Resolve relative paths to absolute paths
    const { resolve } = await import('path');
    console.log('[Main] open-folder received path:', folderPath);

    // Check if it's already an absolute path
    const { isAbsolute } = await import('path');
    let absolutePath: string;

    if (isAbsolute(folderPath)) {
      // Already absolute
      absolutePath = folderPath;
      console.log('[Main] Path is already absolute:', absolutePath);
    } else {
      // Relative path - resolve from current working directory
      absolutePath = resolve(folderPath);
      console.log('[Main] Resolved relative path from CWD to:', absolutePath);
    }

    console.log('[Main] Final path to open:', absolutePath);
    const result = await shell.openPath(absolutePath);
    if (result) {
      console.error('[Main] Failed to open folder:', result);
      throw new Error(result);
    }
    console.log('[Main] Successfully opened folder');
  } catch (error) {
    console.error('[Main] Failed to open folder:', error);
    throw error;
  }
});

ipcMain.handle('export-data', async (_event, options) => {
  try {
    const {
      repository,
      exportTypes,
      format,
      dateFilter,
      userFilter,
      outputPath,
      generateAnalytics,
    } = options;

    if (!mainWindow) {
      throw new Error('Main window not available');
    }

    // Send progress update
    const sendProgress = (stage: string, progress: number, currentType?: string) => {
      mainWindow!.webContents.send('export-progress', { stage, progress, currentType });
    };

    sendProgress('Initializing export...', 0);

    const totalTypes = exportTypes.length;
    let completedTypes = 0;

    for (const type of exportTypes) {
      sendProgress(`Exporting ${type}`, (completedTypes / totalTypes) * 100, type);

      const finalOutputPath = buildOutputPath(
        outputPath,
        repository.owner,
        repository.name,
        getExportTypeName(type)
      );

      const exporterOptions: any = {
        repository,
        outputPath: finalOutputPath,
        format,
      };

      // Add date filter if provided
      if (dateFilter) {
        const diffModeOptions = {
          enabled: true,
          since: dateFilter.from,
          until: dateFilter.to,
        };
        exporterOptions.diffMode = diffModeOptions;
      }

      // Add user filter if provided
      if (userFilter) {
        exporterOptions.userFilter = userFilter;
      }

      const exporter = createExporter(type, exporterOptions);
      await exporter.export();

      completedTypes++;
    }

    sendProgress('Export completed!', 100);

    // Generate analytics if requested
    if (generateAnalytics) {
      sendProgress('Generating analytics report...', 100);
      try {
        const { AnalyticsProcessor } = await import('../../src/analytics/analytics-processor.js');
        const repoOutputPath = outputPath + `/${repository.owner}/${repository.name}`;
        const analyticsOptions = {
          enabled: true,
          format,
          outputPath: repoOutputPath,
          repository,
          offline: true,
          exportedDataPath: repoOutputPath,
        };
        const processor = new AnalyticsProcessor(analyticsOptions);
        await processor.generateReport();
        logger.info('Analytics report generated successfully');
      } catch (error) {
        logger.error(
          `Analytics generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    mainWindow!.webContents.send('export-complete', {
      success: true,
      message: `Successfully exported ${totalTypes} data types${generateAnalytics ? ' with analytics' : ''}`,
    });

    return { success: true, message: 'Export completed successfully' };
  } catch (error) {
    console.error('Export failed:', error);
    if (mainWindow) {
      mainWindow.webContents.send(
        'export-error',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
    throw error;
  }
});

function createExporter(type: string, options: any) {
  switch (type) {
    case 'prs':
      return new PullRequestExporter(options);
    case 'issues':
      return new IssueExporter(options);
    case 'commits':
      return new CommitExporter(options);
    case 'branches':
      return new BranchExporter(options);
    case 'releases':
      return new ReleaseExporter(options);
    default:
      throw new Error(`Unknown export type: ${type}`);
  }
}

function getExportTypeName(type: string): string {
  const names: Record<string, string> = {
    prs: 'Pull Requests',
    issues: 'Issues',
    commits: 'Commits',
    branches: 'Branches',
    releases: 'Releases',
  };
  return names[type] || type;
}
