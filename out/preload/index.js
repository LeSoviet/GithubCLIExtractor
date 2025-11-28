"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  // Repository operations
  getRepositories: () => electron.ipcRenderer.invoke("get-repositories"),
  getContributors: (repoOwner, repoName) => electron.ipcRenderer.invoke("get-contributors", repoOwner, repoName),
  // Export operations
  exportData: (options) => electron.ipcRenderer.invoke("export-data", options),
  // Folder selection
  selectFolder: () => electron.ipcRenderer.invoke("select-folder"),
  // Open folder in file explorer
  openFolder: (path) => electron.ipcRenderer.invoke("open-folder", path),
  // Progress listeners
  onExportProgress: (callback) => {
    electron.ipcRenderer.on("export-progress", (_event, data) => callback(data));
  },
  onExportComplete: (callback) => {
    electron.ipcRenderer.on("export-complete", (_event, data) => callback(data));
  },
  onExportError: (callback) => {
    electron.ipcRenderer.on("export-error", (_event, error) => callback(error));
  }
});
