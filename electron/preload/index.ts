import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Repository operations
  getRepositories: () => ipcRenderer.invoke('get-repositories'),
  getContributors: (repoOwner: string, repoName: string) =>
    ipcRenderer.invoke('get-contributors', repoOwner, repoName),

  // Export operations
  exportData: (options: {
    repository: { owner: string; name: string };
    exportTypes: string[];
    format: string;
    dateFilter?: { type: 'last-week' | 'last-month' | 'custom'; from?: string; to?: string };
    userFilter?: string;
    outputPath: string;
    generateAnalytics?: boolean;
  }) => ipcRenderer.invoke('export-data', options),

  // Folder selection
  selectFolder: () => ipcRenderer.invoke('select-folder'),

  // Open folder in file explorer
  openFolder: (path: string) => ipcRenderer.invoke('open-folder', path),

  // Progress listeners
  onExportProgress: (callback: (data: any) => void) => {
    ipcRenderer.on('export-progress', (_event, data) => callback(data));
  },
  onExportComplete: (callback: (data: any) => void) => {
    ipcRenderer.on('export-complete', (_event, data) => callback(data));
  },
  onExportError: (callback: (error: string) => void) => {
    ipcRenderer.on('export-error', (_event, error) => callback(error));
  },

  // Send messages to main process
  send: (channel: string, ...args: any[]) => {
    ipcRenderer.send(channel, ...args);
  },
});

export {};
