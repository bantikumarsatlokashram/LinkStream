import express from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import path from "path";
import os from "os";


interface Peer {
  id: string;
  ws: WebSocket;
  roomId: string;
  deviceName: string;
  deviceType: "desktop" | "mobile" | "tablet";
  os: "windows" | "macos" | "linux" | "android" | "ios" | "unknown";
  ip: string;
  joinedAt: number;
}

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

const PORT = 3000;
app.use(express.json({ limit: "100mb" }));

// Store active peers by room ID
const rooms: Map<string, Map<string, Peer>> = new Map();

// Helper to get local network IPv4 addresses
function getLocalNetworkAddresses(): string[] {
  const interfaces = os.networkInterfaces();
  const addresses: string[] = [];

  for (const name of Object.keys(interfaces)) {
    const ifaceList = interfaces[name];
    if (!ifaceList) continue;
    for (const iface of ifaceList) {
      if (iface.family === "IPv4" && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }

  return addresses.length > 0 ? addresses : ["127.0.0.1"];
}

// API Routes
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: Date.now() });
});

app.get("/api/network-info", (req, res) => {
  const localIps = getLocalNetworkAddresses();
  const host = req.headers.host || `localhost:${PORT}`;
  
  res.json({
    localIps,
    hostname: os.hostname(),
    platform: os.platform(),
    appUrl: `http://${localIps[0] || "localhost"}:${PORT}`,
    currentHost: host,
    totalRooms: rooms.size,
    timestamp: Date.now(),
  });
});

// ── HTTP File Transfer — Zero-Copy LAN Pipe ───────────────────────────────────
// Sender POSTs raw binary; receiver GETs. Server pipes them directly together.
// No disk I/O, no base64, no JSON overhead — transfers run at full LAN bandwidth.

interface LiveTransfer {
  uploadReq: import("http").IncomingMessage | null;
  downloadRes: import("express").Response | null;
  connectFn: (() => void) | null;
}
const liveTransfers = new Map<string, LiveTransfer>();

// Sender uploads raw binary file stream here
app.post("/api/transfer/upload/:transferId", (req: import("express").Request, res: import("express").Response) => {
  const tid = req.params.transferId;
  if (!liveTransfers.has(tid)) liveTransfers.set(tid, { uploadReq: null, downloadRes: null, connectFn: null });
  const entry = liveTransfers.get(tid)!;
  entry.uploadReq = req as any;

  const connect = () => {
    const dl = entry.downloadRes!;
    const name = decodeURIComponent((req.headers["x-file-name"] as string) || "file");
    const mime = (req.headers["content-type"] as string) || "application/octet-stream";
    const len  = req.headers["content-length"];

    dl.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(name)}`);
    dl.setHeader("Content-Type", mime);
    dl.setHeader("Cache-Control", "no-store");
    if (len) dl.setHeader("Content-Length", len);

    (req as any).pipe(dl);

    (req as any).on("end",   () => { liveTransfers.delete(tid); try { res.json({ ok: true }); } catch {} });
    (req as any).on("error", () => { liveTransfers.delete(tid); try { dl.end(); } catch {}; try { res.status(500).end(); } catch {}; });
    dl.on("close",           () => { liveTransfers.delete(tid); try { (req as any).destroy(); } catch {}; });
  };

  entry.connectFn = connect;
  if (entry.downloadRes) connect();

  // Timeout: receiver must connect within 2 minutes
  const timeout = setTimeout(() => {
    if (liveTransfers.has(tid) && !entry.downloadRes) {
      liveTransfers.delete(tid);
      try { res.status(408).json({ error: "No receiver connected" }); } catch {}
    }
  }, 120_000);
  (req as any).on("close", () => clearTimeout(timeout));
});

// Receiver downloads file stream here
app.get("/api/transfer/download/:transferId", (req: import("express").Request, res: import("express").Response) => {
  const tid = req.params.transferId;
  if (!liveTransfers.has(tid)) liveTransfers.set(tid, { uploadReq: null, downloadRes: null, connectFn: null });
  const entry = liveTransfers.get(tid)!;
  entry.downloadRes = res;

  if (entry.connectFn) entry.connectFn(); // Sender already waiting — connect now

  res.on("close", () => {
    if (liveTransfers.has(tid)) {
      liveTransfers.delete(tid);
      try { (entry.uploadReq as any)?.destroy(); } catch {}
    }
  });
});


wss.on("connection", (ws: WebSocket, req) => {
  let currentPeerId: string | null = null;
  let currentRoomId: string | null = null;

  const clientIp =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
    req.socket.remoteAddress ||
    "127.0.0.1";

  ws.on("message", (rawMessage: Buffer | string) => {
    try {
      const data = JSON.parse(rawMessage.toString());
      const { type, payload } = data;

      switch (type) {
        case "join-room": {
          const { roomId, peerId, deviceName, deviceType, osName } = payload;

          if (!roomId || !peerId) return;

          currentPeerId = peerId;
          currentRoomId = roomId;

          if (!rooms.has(roomId)) {
            rooms.set(roomId, new Map());
          }

          const room = rooms.get(roomId)!;
          const peer: Peer = {
            id: peerId,
            ws,
            roomId,
            deviceName: deviceName || "Unknown Device",
            deviceType: deviceType || "desktop",
            os: osName || "unknown",
            ip: clientIp,
            joinedAt: Date.now(),
          };

          room.set(peerId, peer);

          // Notify room of updated peer list
          broadcastPeerList(roomId);
          break;
        }

        case "transfer-request":
        case "transfer-response":
        case "file-chunk":
        case "transfer-progress":
        case "transfer-complete":
        case "transfer-cancel":
        case "clipboard-share": {
          // Forward targeted messages to specific peer or broadcast to room
          const { targetPeerId } = payload || {};
          if (currentRoomId && rooms.has(currentRoomId)) {
            const room = rooms.get(currentRoomId)!;

            if (targetPeerId && room.has(targetPeerId)) {
              // Direct target peer
              const targetPeer = room.get(targetPeerId)!;
              if (targetPeer.ws.readyState === WebSocket.OPEN) {
                targetPeer.ws.send(
                  JSON.stringify({
                    type,
                    payload: { ...payload, senderId: currentPeerId },
                  })
                );
              }
            } else {
              // Broadcast to room except sender
              room.forEach((peer, pId) => {
                if (pId !== currentPeerId && peer.ws.readyState === WebSocket.OPEN) {
                  peer.ws.send(
                    JSON.stringify({
                      type,
                      payload: { ...payload, senderId: currentPeerId },
                    })
                  );
                }
              });
            }
          }
          break;
        }

        case "ping": {
          ws.send(JSON.stringify({ type: "pong", payload: { timestamp: Date.now() } }));
          break;
        }
      }
    } catch (err) {
      console.error("Failed to parse WebSocket message:", err);
    }
  });

  ws.on("close", () => {
    if (currentRoomId && currentPeerId && rooms.has(currentRoomId)) {
      const room = rooms.get(currentRoomId)!;
      room.delete(currentPeerId);

      if (room.size === 0) {
        rooms.delete(currentRoomId);
      } else {
        broadcastPeerList(currentRoomId);
      }
    }
  });
});

function broadcastPeerList(roomId: string) {
  if (!rooms.has(roomId)) return;
  const room = rooms.get(roomId)!;

  const peerList = Array.from(room.values()).map((p) => ({
    id: p.id,
    deviceName: p.deviceName,
    deviceType: p.deviceType,
    os: p.os,
    ip: p.ip,
    joinedAt: p.joinedAt,
  }));

  room.forEach((peer) => {
    if (peer.ws.readyState === WebSocket.OPEN) {
      peer.ws.send(
        JSON.stringify({
          type: "peer-list",
          payload: { peers: peerList, currentPeerId: peer.id },
        })
      );
    }
  });
}

// Start Vite middleware or static serving
async function initServer() {
  if (process.env.NODE_ENV !== "production") {
    // Dynamic import so vite is not required in production builds
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // __dirname is dist/ since server.cjs is bundled there
    const distPath = __dirname;
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`LAN Share Server running at http://0.0.0.0:${PORT}`);
  });
}

initServer();
