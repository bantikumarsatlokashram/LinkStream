const { app, BrowserWindow, shell, ipcMain, dialog, Tray, Menu, nativeImage, Notification } = require("electron");
const path = require("path");
const dgram = require("dgram");
const os = require("os");
const fs = require("fs");
const http = require("http");
const https = require("https");

// ── Single Instance Lock ─────────────────────────────────────────────────────
// Prevents multiple copies of the app running. If already running, focus it.
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit(); // Second instance — tell first instance to show, then exit
}

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
      sandbox: false,           // ← Required: lets preload use require('os'), require('fs') etc.
      preload: path.join(__dirname, "preload.cjs"),
    },
    autoHideMenuBar: true,
    backgroundColor: "#020617",
  });

  const isDev = !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL("http://localhost:3000");
  } else {
    // ── Helper: wait until server is accepting connections ──────────────────────
    // Polls /api/health every 200ms for up to 10 seconds.
    const waitForServer = (port, maxMs = 10000) =>
      new Promise((resolve) => {
        const started = Date.now();
        const check = () => {
          const req = http.get(`http://localhost:${port}/api/health`, (res) => {
            resolve(true);
          });
          req.on("error", () => {
            if (Date.now() - started < maxMs) setTimeout(check, 200);
            else resolve(false);
          });
          req.setTimeout(300, () => { req.destroy(); });
        };
        check();
      });

    try {
      // Step 1: Check if another LinkStream server is already running on the LAN
      console.log("[Startup] Scanning LAN for existing server...");
      const serverUrl = await discoverLanServer();

      if (serverUrl) {
        // Another PC is the server — just connect to it
        console.log(`[Startup] Found server at ${serverUrl}, connecting as client...`);
        mainWindow.loadURL(serverUrl);
      } else {
        // No server found — we become the server
        console.log("[Startup] No server found. Starting as LAN server...");

        try {
          const serverPath = path.join(__dirname, "../dist/server.cjs");
          console.log("[Startup] Loading server from:", serverPath);
          require(serverPath);
          console.log("[Startup] server.cjs required. Waiting for Express to bind...");
        } catch (serverErr) {
          console.error("[Startup] FAILED to load server.cjs:", serverErr);
          // Show real error — never show blank screen
          mainWindow.loadURL(
            `data:text/html;charset=utf-8,<body style="background:#020617;color:#f87171;font-family:monospace;padding:2rem"><h2>LinkStream — Server Start Error</h2><pre>${encodeURIComponent(String(serverErr))}</pre></body>`
          );
          mainWindow.webContents.openDevTools();
          return;
        }

        startServerAnnouncer();

        // Wait up to 10 seconds for server to be ready
        const ready = await waitForServer(APP_PORT);
        if (ready) {
          console.log(`[Startup] Server ready. Loading http://localhost:${APP_PORT}`);
          mainWindow.loadURL(`http://localhost:${APP_PORT}`);
        } else {
          console.error("[Startup] Server never became ready after 10s");
          mainWindow.loadURL(
            `data:text/html;charset=utf-8,<body style="background:#020617;color:#f87171;font-family:monospace;padding:2rem"><h2>LinkStream — Server Timeout</h2><p>Express server did not respond on port ${APP_PORT} within 10 seconds.</p></body>`
          );
          mainWindow.webContents.openDevTools();
        }
      }
    } catch (err) {
      console.error("[Startup] Unexpected error:", err);
      mainWindow.loadURL(
        `data:text/html;charset=utf-8,<body style="background:#020617;color:#f87171;font-family:monospace;padding:2rem"><h2>LinkStream — Startup Error</h2><pre>${encodeURIComponent(String(err))}</pre></body>`
      );
      mainWindow.webContents.openDevTools();
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
  mainWindow.webContents.once("did-finish-load", () => {
    createTray();

    // ── Force-set real PC hostname in renderer localStorage ──────────────────
    // This runs in renderer context — overwrites stale "Windows Desktop" values
    // regardless of any preload/contextBridge issues.
    const hostname = os.hostname();
    mainWindow.webContents.executeJavaScript(`
      (function() {
        const hostname = ${JSON.stringify(hostname)};
        const saved = localStorage.getItem("lan_device_name");
        const isGeneric = !saved ||
          /^(Windows|Mac|Linux|Android|iOS)\\s+(Desktop|Mobile|Tablet)$/i.test(saved) ||
          saved === "My Device";
        if (isGeneric) {
          localStorage.setItem("lan_device_name", hostname);
          console.log("[LinkStream] Device name set to:", hostname);
        }
      })();
    `).catch(() => {});

    // Check for updates on startup (silent — no error toast)
    setTimeout(() => checkForUpdates(true), 5000);
    // Re-check every 4 hours
    setInterval(() => checkForUpdates(true), 4 * 60 * 60 * 1000);

  });
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

// When a second instance tries to launch — show existing window instead
app.on("second-instance", () => {
  if (mainWindow) {
    if (!mainWindow.isVisible()) mainWindow.show();
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

// Enable auto-launch on Windows startup by default
app.on("ready", () => {
  const settings = app.getLoginItemSettings();
  if (settings.openAtLogin === undefined || app.isPackaged) {
    app.setLoginItemSettings({ openAtLogin: true, openAsHidden: true });
  }
});

app.on("activate", () => {
  if (!mainWindow) createWindow();
  else { mainWindow.show(); mainWindow.focus(); }
});


// ── IPC: Native Windows Folder Picker ────────────────────────────────────────
// IMPORTANT: No parent window → standalone dialog always visible to user.
// Using dialog.showOpenDialog(win, ...) can cause dialog to appear BEHIND app
// on Windows, making it seem like nothing happened.
ipcMain.handle("show-folder-dialog", async (_event) => {
  try {
    console.log("[FolderDialog] Opening native folder picker...");

    // NO parent window → standalone, appears in taskbar, always visible
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory", "createDirectory"],
      title: "Select Save Folder",
      defaultPath: app.getPath("downloads"),
      buttonLabel: "Select Folder",
    });

    console.log("[FolderDialog] canceled:", result.canceled, "paths:", result.filePaths);

    if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
      return { canceled: true, folderPath: null };
    }
    return { canceled: false, folderPath: result.filePaths[0] };
  } catch (err) {
    const msg = err?.message || String(err);
    console.error("[FolderDialog] Error:", msg);
    return { canceled: true, folderPath: null, error: msg };
  }
});

// ── IPC: Validate Folder Path ─────────────────────────────────────────────────
// Checks that the given path exists, is a directory, and is writable.
ipcMain.handle("validate-folder", async (_event, folderPath) => {
  try {
    const trimmed = (folderPath || "").trim();
    if (!trimmed) return { valid: false, reason: "empty" };
    const stat = fs.statSync(trimmed);
    if (!stat.isDirectory()) return { valid: false, reason: "not_directory" };
    // Quick write-permission test
    fs.accessSync(trimmed, fs.constants.W_OK);
    return { valid: true, reason: "" };
  } catch (err) {
    if (err.code === "ENOENT") return { valid: false, reason: "not_found" };
    if (err.code === "EACCES") return { valid: false, reason: "no_permission" };
    return { valid: false, reason: "unknown" };
  }
});

// ── IPC: Get Default Downloads Folder ────────────────────────────────────────
ipcMain.handle("get-default-folder", () => app.getPath("downloads"));

// ── IPC: Download File Directly to Disk (Node.js HTTP → fs stream) ──────────
// Bypasses Chromium's fetch buffering. Data flows: Server → Node HTTP → disk.
// Progress events are sent back to renderer for real-time UI updates.
ipcMain.handle("download-to-disk", async (event, { downloadUrl, savePath, transferId, fileSize }) => {
  return new Promise((resolve, reject) => {
    console.log(`[Download:${transferId}] ── START ──`);
    console.log(`[Download:${transferId}] URL      : ${downloadUrl}`);
    console.log(`[Download:${transferId}] SavePath : ${savePath}`);
    console.log(`[Download:${transferId}] FileSize : ${fileSize}`);

    // ── STEP 1: Create write stream ─────────────────────────────────────────
    let file;
    try {
      file = fs.createWriteStream(savePath);
    } catch (createErr) {
      const msg = `Cannot create write stream: ${createErr.message}`;
      console.error(`[Download:${transferId}] ${msg}`);
      return reject(new Error(msg));
    }

    // Attach file error handler IMMEDIATELY (before http.get starts)
    // so errors that fire before http response are always caught.
    file.on("error", (err) => {
      console.error(`[Download:${transferId}] Write stream error: ${err.message}`);
      try { fs.unlinkSync(savePath); } catch {}
      reject(err);
    });

    // ── STEP 2: Wait for file to open, then start HTTP download ────────────
    file.on("open", () => {
      console.log(`[Download:${transferId}] Write stream opened. Starting HTTP GET...`);

      const protocol = downloadUrl.startsWith("https") ? https : http;
      let received = 0;
      let lastEmit = Date.now();
      let lastBytes = 0;
      let chunkCount = 0;

      const req = protocol.get(downloadUrl, (response) => {
        console.log(`[Download:${transferId}] HTTP response status: ${response.statusCode}`);
        console.log(`[Download:${transferId}] Content-Length header: ${response.headers["content-length"] || "(none)"}`);

        // ── STEP 3: Validate HTTP status ──────────────────────────────────
        if (response.statusCode !== 200) {
          const err = new Error(`Server returned HTTP ${response.statusCode} (${response.statusMessage}) for transfer ${transferId}`);
          console.error(`[Download:${transferId}] ${err.message}`);
          file.close();
          try { fs.unlinkSync(savePath); } catch {}
          return reject(err);
        }

        const total = parseInt(response.headers["content-length"] || String(fileSize || 0), 10);
        console.log(`[Download:${transferId}] Expected bytes: ${total}`);

        // ── STEP 4: Track progress ────────────────────────────────────────
        response.on("data", (chunk) => {
          received += chunk.length;
          chunkCount++;

          // Log first 3 chunks + every 500 chunks for debugging
          if (chunkCount <= 3 || chunkCount % 500 === 0) {
            console.log(`[Download:${transferId}] Chunk #${chunkCount}: +${chunk.length} bytes, total=${received}`);
          }

          const now = Date.now();
          const dt = (now - lastEmit) / 1000;
          if (dt >= 0.25 || received === total) {
            const speed = dt > 0 ? (received - lastBytes) / dt : 0;
            const eta   = speed > 0 && total > 0 ? (total - received) / speed : 0;
            lastBytes = received;
            lastEmit  = now;
            if (!event.sender.isDestroyed()) {
              event.sender.send("download-progress", { transferId, received, total, speed, eta });
            }
          }
        });

        // ── STEP 5: Catch response stream errors ──────────────────────────
        response.on("error", (err) => {
          console.error(`[Download:${transferId}] Response stream error: ${err.message}`);
          file.close();
          try { fs.unlinkSync(savePath); } catch {}
          reject(err);
        });

        // ── STEP 6: Pipe response → disk ──────────────────────────────────
        response.pipe(file);

        file.on("finish", () => {
          console.log(`[Download:${transferId}] ── COMPLETE ── total bytes written: ${received}`);
          file.close();
          if (!event.sender.isDestroyed()) {
            event.sender.send("download-complete", { transferId });
          }
          resolve({ success: true });
        });
      });

      // ── STEP 7: HTTP connection error ─────────────────────────────────────
      req.on("error", (err) => {
        console.error(`[Download:${transferId}] HTTP request error: ${err.message}`);
        file.close();
        try { fs.unlinkSync(savePath); } catch {}
        reject(err);
      });

      // Allow cancellation from renderer
      ipcMain.once(`cancel-download-${transferId}`, () => {
        console.log(`[Download:${transferId}] Cancelled by user`);
        req.destroy();
        file.close();
        try { fs.unlinkSync(savePath); } catch {}
        reject(new Error("Cancelled"));
      });
    });
  });
});
// ── IPC: Native Notification + Window Control ──────────────────────────────
ipcMain.on("show-notification", (_event, { title, body }) => {
  if (Notification.isSupported()) {
    const notif = new Notification({ title, body, silent: false });
    notif.on("click", () => { mainWindow?.show(); mainWindow?.focus(); });
    notif.show();
  }
});

ipcMain.on("bring-to-front", () => { mainWindow?.show(); mainWindow?.focus(); });

ipcMain.handle("get-auto-launch", () => ({ openAtLogin: app.getLoginItemSettings().openAtLogin }));

ipcMain.handle("set-auto-launch", (_event, enabled) => {
  app.setLoginItemSettings({ openAtLogin: enabled, openAsHidden: true });
  return { success: true };
});

// ── Auto Update via GitHub Releases ─────────────────────────────────────────
function checkForUpdates(silent = false) {
  const options = {
    hostname: "api.github.com",
    path: "/repos/bantikumarsatlokashram/LinkStream/releases/latest",
    headers: { "User-Agent": "LinkStream-App/" + app.getVersion() },
  };
  https.get(options, (res) => {
    let data = "";
    res.on("data", (c) => (data += c));
    res.on("end", () => {
      try {
        const release = JSON.parse(data);
        const latest = (release.tag_name || "").replace(/^v/, "");
        const current = app.getVersion();
        if (latest && latest !== current) {
          // Find the NSIS setup .exe asset
          const asset = (release.assets || []).find(
            (a) => a.name.endsWith(".exe") && a.name.toLowerCase().includes("setup")
          );
          if (asset && mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send("update-available", {
              version: latest,
              currentVersion: current,
              downloadUrl: asset.browser_download_url,
              fileName: asset.name,
              fileSize: asset.size,
              releaseNotes: release.body || "",
            });
          }
        }
      } catch (e) {
        if (!silent) console.log("[Update] Parse error:", e.message);
      }
    });
  }).on("error", (e) => {
    if (!silent) console.log("[Update] Check failed:", e.message);
  });
}

// IPC: Download update installer and report progress
ipcMain.handle("download-update", (event, { downloadUrl, fileName }) => {
  return new Promise((resolve, reject) => {
    const savePath = path.join(app.getPath("downloads"), fileName);
    const file = fs.createWriteStream(savePath);

    function doGet(url, redirectCount = 0) {
      if (redirectCount > 5) return reject(new Error("Too many redirects"));
      https.get(url, { headers: { "User-Agent": "LinkStream-App" } }, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          return doGet(response.headers.location, redirectCount + 1);
        }
        const total = parseInt(response.headers["content-length"] || "0", 10);
        let received = 0;
        response.on("data", (chunk) => {
          received += chunk.length;
          if (!event.sender.isDestroyed()) {
            event.sender.send("update-download-progress", {
              received,
              total,
              percent: total > 0 ? Math.round((received / total) * 100) : 0,
            });
          }
        });
        response.pipe(file);
        file.on("finish", () => { file.close(); resolve({ savePath }); });
        file.on("error", reject);
      }).on("error", reject);
    }
    doGet(downloadUrl);
  });
});

// IPC: Launch installer and quit app
ipcMain.on("install-update", (_event, { savePath }) => {
  shell.openPath(savePath).then(() => {
    setTimeout(() => { isQuitting = true; app.quit(); }, 1500);
  });
});

app.on("window-all-closed", () => {
  if (process.platform === "darwin") app.quit();
});

app.on("before-quit", () => { isQuitting = true; });
