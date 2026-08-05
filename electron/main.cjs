const { app, BrowserWindow, shell, ipcMain, dialog, Tray, Menu, nativeImage, Notification } = require("electron");
const path = require("path");
const dgram = require("dgram");
const os = require("os");
const fs = require("fs");
const http = require("http");
const https = require("https");

let mainWindow;
let tray = null;
let isQuitting = false;

const APP_PORT = 3000;
const DISCOVERY_PORT = 41235;

// Compute broadcast address for each network interface
function getBroadcastAddresses() {
  const ifaces = os.networkInterfaces();
  const broadcasts = new Set(["255.255.255.255"]);
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name] || []) {
      if (iface.family === "IPv4" && !iface.internal && iface.netmask) {
        const ip = iface.address.split(".").map(Number);
        const mask = iface.netmask.split(".").map(Number);
        const bcast = ip.map((p, i) => (p | (~mask[i] & 0xff))).join(".");
        broadcasts.add(bcast);
      }
    }
  }
  return [...broadcasts];
}

// Get primary LAN IPv4 address
function getLocalIp() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of (ifaces[name] || [])) {
      if (iface.family === "IPv4" && !iface.internal) return iface.address;
    }
  }
  return "127.0.0.1";
}

/**
 * Broadcast a discovery request on the LAN.
 * Resolves with the server URL if found, or null if we should become the server.
 */
function discoverLanServer() {
  return new Promise((resolve) => {
    const socket = dgram.createSocket({ type: "udp4", reuseAddr: true });
    let done = false;

    const finish = (result) => {
      if (done) return;
      done = true;
      try { socket.close(); } catch {}
      resolve(result);
    };

    socket.on("error", () => finish(null));

    socket.bind(0, () => {
      socket.setBroadcast(true);
      const myPort = socket.address().port;
      // Include our reply port in the message so the server knows where to respond
      const msg = Buffer.from(`LINKSTREAM_FIND:${myPort}`);
      for (const addr of getBroadcastAddresses()) {
        socket.send(msg, 0, msg.length, DISCOVERY_PORT, addr);
      }
    });

    socket.on("message", (msg) => {
      const str = msg.toString();
      // Response format: LINKSTREAM_HERE:<server-ip>
      if (str.startsWith("LINKSTREAM_HERE:")) {
        const serverIp = str.split(":")[1];
        finish(`http://${serverIp}:${APP_PORT}`);
      }
    });

    // Wait 2 seconds for a server to respond before giving up
    setTimeout(() => finish(null), 2000);
  });
}

/**
 * Start listening for discovery requests from other PCs on the LAN.
 * Responds with this machine's IP so other PCs can connect to us.
 */
function startServerAnnouncer() {
  const socket = dgram.createSocket({ type: "udp4", reuseAddr: true });
  const myIp = getLocalIp();

  socket.on("error", () => {});

  socket.bind(DISCOVERY_PORT, () => {
    socket.setBroadcast(true);
    console.log(`[Discovery] Listening on UDP :${DISCOVERY_PORT}, announcing as ${myIp}`);

    socket.on("message", (msg, rinfo) => {
      const str = msg.toString();
      // Discovery request format: LINKSTREAM_FIND:<requester-reply-port>
      if (str.startsWith("LINKSTREAM_FIND:")) {
        const replyPort = parseInt(str.split(":")[1], 10);
        if (!isNaN(replyPort)) {
          const response = Buffer.from(`LINKSTREAM_HERE:${myIp}`);
          socket.send(response, 0, response.length, replyPort, rinfo.address);
          console.log(`[Discovery] Replied to ${rinfo.address}:${replyPort}`);
        }
      }
    });
  });

  app.on("will-quit", () => { try { socket.close(); } catch {} });
}

async function createWindow() {
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
      preload: path.join(__dirname, "preload.cjs"),
    },
    autoHideMenuBar: true,
    backgroundColor: "#020617",
  });

  const isDev = !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL("http://localhost:3000");
  } else {
    try {
      // Step 1: Check if another LinkStream server is already running on the LAN
      console.log("[Discovery] Scanning LAN for existing server...");
      const serverUrl = await discoverLanServer();

      if (serverUrl) {
        // Another PC is the server — just connect to it, no need to start our own
        console.log(`[Discovery] Found server at ${serverUrl}, connecting as client...`);
        mainWindow.loadURL(serverUrl);
      } else {
        // No server found — we become the server for the LAN
        console.log("[Discovery] No server found, starting as LAN server...");
        require(path.join(__dirname, "../dist/server.cjs"));
        // Announce ourselves so other PCs can discover us
        startServerAnnouncer();
        // Give Express ~1.5s to bind before loading the UI
        setTimeout(() => {
          mainWindow.loadURL(`http://localhost:${APP_PORT}`);
        }, 1500);
      }
    } catch (err) {
      console.error("Startup error:", err);
      mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
    }
  }

  // Open external links in the default OS browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http")) shell.openExternal(url);
    return { action: "deny" };
  });

  // Hide to tray instead of closing
  mainWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      // Show tray balloon hint only on first hide
      if (tray && mainWindow._firstHide !== false) {
        mainWindow._firstHide = false;
        try {
          tray.displayBalloon({
            title: "LinkStream is still running",
            content: "You will still receive file requests in the background.",
            iconType: "info",
          });
        } catch {}
      }
    }
  });

  mainWindow.on("closed", () => { mainWindow = null; });

  // Create system tray after window is ready
  mainWindow.webContents.once("did-finish-load", () => createTray());
}

// ── System Tray ──────────────────────────────────────────────────────────
function createTray() {
  if (tray) return; // Already created

  // Try to load app icon for tray
  let icon = nativeImage.createEmpty();
  const iconCandidates = [
    path.join(__dirname, "../build/icon.png"),
    path.join(__dirname, "../public/icon.png"),
    path.join(process.resourcesPath || "", "icon.png"),
  ];
  for (const p of iconCandidates) {
    try {
      const img = nativeImage.createFromPath(p);
      if (!img.isEmpty()) { icon = img.resize({ width: 16, height: 16 }); break; }
    } catch {}
  }

  tray = new Tray(icon);
  tray.setToolTip("LinkStream - File Transfer");

  const buildMenu = () => Menu.buildFromTemplate([
    { label: "Open LinkStream", click: () => { mainWindow?.show(); mainWindow?.focus(); } },
    { type: "separator" },
    { label: "Start with Windows", type: "checkbox", checked: app.getLoginItemSettings().openAtLogin,
      click: (item) => {
        app.setLoginItemSettings({ openAtLogin: item.checked, openAsHidden: true });
        tray.setContextMenu(buildMenu());
      }
    },
    { type: "separator" },
    { label: "Quit", click: () => { isQuitting = true; app.quit(); } },
  ]);

  tray.setContextMenu(buildMenu());

  tray.on("click", () => {
    if (mainWindow?.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow?.show();
      mainWindow?.focus();
    }
  });

  tray.on("double-click", () => {
    mainWindow?.show();
    mainWindow?.focus();
  });
}


app.whenReady().then(createWindow);

// Enable auto-launch on Windows startup by default
app.on("ready", () => {
  // Only set default on first run (don't override if user changed it)
  const settings = app.getLoginItemSettings();
  if (settings.openAtLogin === undefined || app.isPackaged) {
    app.setLoginItemSettings({ openAtLogin: true, openAsHidden: true });
  }
});

app.on("activate", () => {
  if (!mainWindow) createWindow();
  else { mainWindow.show(); mainWindow.focus(); }
});

// ── IPC: Native Save Dialog ─────────────────────────────────────────────────
// Opens OS native "Save As" dialog and returns the chosen file path.
ipcMain.handle("show-save-dialog", async (_event, defaultName) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName,
    properties: ["createDirectory", "showOverwriteConfirmation"],
  });
  return result; // { canceled: bool, filePath: string | undefined }
});

// ── IPC: Download File Directly to Disk (Node.js HTTP → fs stream) ──────────
// Bypasses Chromium's fetch buffering. Data flows: Server → Node HTTP → disk.
// Progress events are sent back to renderer for real-time UI updates.
ipcMain.handle("download-to-disk", async (event, { downloadUrl, savePath, transferId, fileSize }) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(savePath);
    let received = 0;
    let lastEmit = Date.now();
    let lastBytes = 0;

    const protocol = downloadUrl.startsWith("https") ? https : http;

    const req = protocol.get(downloadUrl, (response) => {
      const total = parseInt(response.headers["content-length"] || String(fileSize || 0), 10);

      response.on("data", (chunk) => {
        received += chunk.length;
        const now = Date.now();
        const dt = (now - lastEmit) / 1000;
        if (dt >= 0.25 || received === total) {
          const speed = dt > 0 ? (received - lastBytes) / dt : 0;
          const eta = speed > 0 && total > 0 ? (total - received) / speed : 0;
          lastBytes = received;
          lastEmit = now;
          // Send progress to renderer
          if (!event.sender.isDestroyed()) {
            event.sender.send("download-progress", {
              transferId,
              received,
              total,
              speed,
              eta,
            });
          }
        }
      });

      response.pipe(file);

      file.on("finish", () => {
        file.close();
        if (!event.sender.isDestroyed()) {
          event.sender.send("download-complete", { transferId });
        }
        resolve({ success: true });
      });

      file.on("error", (err) => {
        try { fs.unlinkSync(savePath); } catch {}
        reject(err);
      });
    });

    req.on("error", (err) => {
      try { fs.unlinkSync(savePath); } catch {}
      reject(err);
    });

    // Allow cancellation from renderer
    ipcMain.once(`cancel-download-${transferId}`, () => {
      req.destroy();
      file.close();
      try { fs.unlinkSync(savePath); } catch {}
      reject(new Error("Cancelled"));
    });
  });
});
// ── IPC: Native Notification + Window Control ──────────────────────────────
ipcMain.on("show-notification", (_event, { title, body }) => {
  if (Notification.isSupported()) {
    const notif = new Notification({
      title,
      body,
      silent: false,
    });
    notif.on("click", () => {
      mainWindow?.show();
      mainWindow?.focus();
    });
    notif.show();
  }
});

ipcMain.on("bring-to-front", () => {
  mainWindow?.show();
  mainWindow?.focus();
});

ipcMain.handle("get-auto-launch", () => ({
  openAtLogin: app.getLoginItemSettings().openAtLogin,
}));

ipcMain.handle("set-auto-launch", (_event, enabled) => {
  app.setLoginItemSettings({ openAtLogin: enabled, openAsHidden: true });
  // Rebuild tray menu to reflect change
  return { success: true };
});


app.on("window-all-closed", () => {
  // On Windows/Linux: don’t quit — keep running in tray
  if (process.platform === "darwin") app.quit();
});

app.on("before-quit", () => { isQuitting = true; });
