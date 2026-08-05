const { app, BrowserWindow, shell, ipcMain } = require("electron");
const path = require("path");
const { spawn } = require("child_process");

let mainWindow;
let serverProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1240,
    height: 820,
    minWidth: 920,
    minHeight: 640,
    title: "LinkStream - Encrypted LAN Share",
    icon: path.join(__dirname, "../public/icon.png"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
    autoHideMenuBar: true,
    backgroundColor: "#020617",
  });

  const isDev = !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL("http://localhost:3000");
  } else {
    // In production package, spawn the compiled Express LAN backend server
    const expressServerPath = path.join(__dirname, "../dist/server.cjs");
    try {
      serverProcess = spawn("node", [expressServerPath], {
        env: { ...process.env, PORT: "3000", NODE_ENV: "production" },
      });

      // Wait 1 sec for server to listen on port 3000
      setTimeout(() => {
        mainWindow.loadURL("http://localhost:3000");
      }, 1200);
    } catch (err) {
      console.error("Failed to start local Express server, fallback to index.html", err);
      mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
    }
  }

  // Open external links in default OS browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http")) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
    if (serverProcess) {
      serverProcess.kill();
    }
  });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (serverProcess) {
    serverProcess.kill();
  }
  if (process.platform !== "darwin") {
    app.quit();
  }
});
