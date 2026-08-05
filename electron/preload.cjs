const { contextBridge, ipcRenderer } = require("electron");
const os = require("os");

contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: true,
  platform: process.platform,

  // Returns the real Windows computer name (e.g. "BANTI-PC" or "DESKTOP-XYZ")
  hostname: os.hostname(),

  // ── File save dialog ────────────────────────────────────────────────────────
  // Opens the native OS "Save As" dialog — returns { canceled, filePath }
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
    ipcRenderer.removeAllListeners(`cancel-download-${transferId}`);
  },

  cancelDownload: (transferId) =>
    ipcRenderer.send(`cancel-download-${transferId}`),

  // ── Native OS notification (shows even when window is hidden) ───────────────
  showNotification: (title, body) =>
    ipcRenderer.send("show-notification", { title, body }),

  // Bring the window to front (call after showNotification so user can see it)
  bringToFront: () =>
    ipcRenderer.send("bring-to-front"),

  // ── Auto-launch (Start with Windows) ────────────────────────────────────────
  getAutoLaunch: () =>
    ipcRenderer.invoke("get-auto-launch"),

  setAutoLaunch: (enabled) =>
    ipcRenderer.invoke("set-auto-launch", enabled),
});
