const { contextBridge, ipcRenderer } = require("electron");
const os = require("os");

contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: true,
  platform: process.platform,

  // Real Windows computer name (e.g. "BANTI-PC", "OFFICE-DESKTOP")
  hostname: os.hostname(),

  // ── Native Windows Folder Picker ─────────────────────────────────────────────
  // Opens the OS-native folder selection dialog (like VS Code / LocalSend).
  // Returns { canceled: boolean, folderPath: string | null }
  showFolderDialog: () =>
    ipcRenderer.invoke("show-folder-dialog"),

  // Validate that a folder path exists and is writable
  validateFolder: (folderPath) =>
    ipcRenderer.invoke("validate-folder", folderPath),

  // Get user's default Downloads folder path
  getDefaultFolder: () =>
    ipcRenderer.invoke("get-default-folder"),

  // ── File save dialog (legacy compat) ────────────────────────────────────────
  showSaveDialog: (defaultName) =>
    ipcRenderer.invoke("show-save-dialog", defaultName),

  // ── Disk download (Node.js HTTP → fs stream, bypasses Chromium buffering) ───
  downloadToDisk: (opts) =>
    ipcRenderer.invoke("download-to-disk", opts),

  onDownloadProgress: (cb) =>
    ipcRenderer.on("download-progress", (_e, data) => cb(data)),

  onDownloadComplete: (cb) =>
    ipcRenderer.on("download-complete", (_e, data) => cb(data)),

  removeDownloadListeners: (transferId) => {
    ipcRenderer.removeAllListeners("download-progress");
    ipcRenderer.removeAllListeners("download-complete");
  },

  cancelDownload: (transferId) =>
    ipcRenderer.send(`cancel-download-${transferId}`),

  // ── Native OS notification ──────────────────────────────────────────────────
  showNotification: (title, body) =>
    ipcRenderer.send("show-notification", { title, body }),

  bringToFront: () =>
    ipcRenderer.send("bring-to-front"),

  // ── Auto-launch (Start with Windows) ────────────────────────────────────────
  getAutoLaunch: () =>
    ipcRenderer.invoke("get-auto-launch"),

  setAutoLaunch: (enabled) =>
    ipcRenderer.invoke("set-auto-launch", enabled),

  // ── Auto Update ─────────────────────────────────────────────────────────────
  onUpdateAvailable: (cb) =>
    ipcRenderer.on("update-available", (_e, data) => cb(data)),

  downloadUpdate: (opts) =>
    ipcRenderer.invoke("download-update", opts),

  onUpdateDownloadProgress: (cb) =>
    ipcRenderer.on("update-download-progress", (_e, data) => cb(data)),

  removeUpdateListeners: () => {
    ipcRenderer.removeAllListeners("update-available");
    ipcRenderer.removeAllListeners("update-download-progress");
  },

  installUpdate: (opts) =>
    ipcRenderer.send("install-update", opts),
});
