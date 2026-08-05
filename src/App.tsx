/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef, useCallback } from "react";
import { Header } from "./components/Header";
import { DeviceScanner } from "./components/DeviceScanner";
import { FileDropzone } from "./components/FileDropzone";
import { TransferManager } from "./components/TransferManager";
import { ClipboardSync } from "./components/ClipboardSync";
import { IncomingTransferModal } from "./components/IncomingTransferModal";
import { QRCodeModal } from "./components/QRCodeModal";
import { NetworkInfoModal } from "./components/NetworkInfoModal";
import { WindowsAppModal } from "./components/WindowsAppModal";
import { ToastContainer } from "./components/ToastContainer";

import { wsClient } from "./lib/wsClient";
import {
  requestNotificationPermission,
  createToast,
} from "./lib/notifications";


import {
  Peer,
  FileTransfer,
  ClipboardItem,
  NetworkInfo,
  NotificationAlert,
  TransferRequestOffer,
} from "./types";


export default function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [roomId, setRoomId] = useState("LAN-ZONE");
  const [peers, setPeers] = useState<Peer[]>([]);
  const [selectedPeerId, setSelectedPeerId] = useState<string | null>(null);
  const [deviceName, setDeviceName] = useState(wsClient.getDeviceName());

  const [transfers, setTransfers] = useState<FileTransfer[]>([]);
  const [incomingOffer, setIncomingOffer] = useState<TransferRequestOffer | null>(null);
  const [clipboards, setClipboards] = useState<ClipboardItem[]>([]);
  const [toasts, setToasts] = useState<NotificationAlert[]>([]);

  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isNetworkModalOpen, setIsNetworkModalOpen] = useState(false);
  const [isWindowsModalOpen, setIsWindowsModalOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  // Stores outgoing file references (no CryptoKey needed — raw HTTP transfer)
  const pendingFilesRef = useRef<Map<string, { file: File; targetPeerId: string }>>(new Map());
  const speedTrackerRef = useRef<Map<string, { lastBytes: number; lastTime: number }>>(new Map());

  // Handle Toast Alerts
  const addToast = useCallback(
    (title: string, message: string, type: "info" | "success" | "warning" | "error" = "info") => {
      const newToast = createToast(title, message, type);
      setToasts((prev) => [newToast, ...prev].slice(0, 5));
    },
    []
  );

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Fetch Network Info
  const fetchNetworkInfo = async () => {
    try {
      const res = await fetch("/api/network-info");
      if (res.ok) {
        const data = await res.json();
        setNetworkInfo(data);
      }
    } catch (e) {
      console.warn("Could not fetch network info:", e);
    }
  };

  useEffect(() => {
    // Check URL query for room code
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get("room");
    if (roomParam) {
      setRoomId(roomParam.toUpperCase());
    }

    fetchNetworkInfo();
    requestNotificationPermission();

    // Connect WebSocket
    const currentRoom = roomParam ? roomParam.toUpperCase() : "LAN-ZONE";
    wsClient.connect(currentRoom);

    // Subscribe to WebSocket events
    const unsubscribe = wsClient.subscribe(async ({ type, payload }) => {
      switch (type) {
        case "status-change":
          setIsConnected(payload.connected);
          break;

        case "peer-list":
          setPeers(payload.peers || []);
          break;

        case "transfer-request": {
          const offer: TransferRequestOffer = payload;
          setIncomingOffer(offer);
          addToast(
            "Incoming File Request",
            `${offer.senderName} wants to send ${offer.fileName}`,
            "info"
          );

          // Show native OS notification so user sees it even if app is in background/tray
          const eAPI = (window as any).electronAPI;
          if (eAPI?.showNotification) {
            const sizeMB = (offer.fileSize / (1024 * 1024)).toFixed(1);
            eAPI.showNotification(
              "📁 Incoming File Request",
              `${offer.senderName} wants to send "${offer.fileName}" (${sizeMB} MB)`
            );
            eAPI.bringToFront(); // Bring window to front so user can accept
          }
          break;
        }


        case "transfer-response": {
          const { transferId, accepted, reason } = payload;
          if (accepted) {
            addToast("Transfer Accepted", "Starting LAN stream...", "info");
            startHttpUpload(transferId);
          } else {
            addToast("Transfer Declined", reason || "Target peer declined transfer", "warning");
            setTransfers((prev) =>
              prev.map((t) =>
                t.id === transferId ? { ...t, status: "failed", error: "Declined by peer" } : t
              )
            );
          }
          break;
        }

        case "transfer-progress": {
          const { transferId, progress, bytesTransferred } = payload;
          updateTransferProgress(transferId, progress, bytesTransferred);
          break;
        }

        case "transfer-complete": {
          const { transferId } = payload;
          handleTransferCompletedRemote(transferId);
          break;
        }

        case "transfer-cancel": {
          const { transferId, reason } = payload;
          addToast("Transfer Cancelled", reason || "Peer cancelled transfer", "warning");
          setTransfers((prev) =>
            prev.map((t) =>
              t.id === transferId ? { ...t, status: "cancelled", error: "Cancelled by peer" } : t
            )
          );
          break;
        }

        case "clipboard-share": {
          const item: ClipboardItem = payload;
          setClipboards((prev) => [item, ...prev].slice(0, 30));
          addToast("Clipboard Sync", `Received text snippet from ${item.senderName}`, "info");
          break;
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [addToast]);

  // Handle Device Name Change
  const handleUpdateDeviceName = (name: string) => {
    setDeviceName(name);
    wsClient.setDeviceName(name);
  };

  // Join New Room
  const handleJoinRoom = (newRoomId: string) => {
    setRoomId(newRoomId);
    wsClient.joinRoom(newRoomId);
    addToast("Joined Room", `Switched to room PIN: ${newRoomId}`, "info");
  };

  // ── Send Files (HTTP Streaming) ─────────────────────────────────────────────
  // No encryption overhead, no base64, no chunking — raw binary at full LAN speed.
  const handleSendFiles = async (files: File[], targetPeerId: string | null) => {
    for (const file of files) {
      const transferId = `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const resolvedTargetId = targetPeerId || "";
      const targetPeer = peers.find((p) => p.id === resolvedTargetId);
      const targetName = resolvedTargetId ? targetPeer?.deviceName || "Peer" : "All Devices";

      pendingFilesRef.current.set(transferId, { file, targetPeerId: resolvedTargetId });

      const newTransfer: FileTransfer = {
        id: transferId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type || "application/octet-stream",
        direction: "outgoing",
        status: "pending",
        progress: 0,
        bytesTransferred: 0,
        totalBytes: file.size,
        speedBytesPerSec: 0,
        etaSeconds: 0,
        senderId: wsClient.getPeerId(),
        senderName: deviceName,
        targetPeerId: resolvedTargetId,
        targetPeerName: targetName,
        sha256Checksum: "",
        isEncrypted: false,
        chunksTransferred: 0,
        totalChunks: 1,
        downloadUrl: null,
        previewUrl: null,
        error: null,
        timestamp: Date.now(),
      };

      setTransfers((prev) => [newTransfer, ...prev]);

      wsClient.sendTransferRequest({
        transferId,
        senderId: wsClient.getPeerId(),
        senderName: deviceName,
        targetPeerId: resolvedTargetId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type || "application/octet-stream",
        totalChunks: 1,
        sha256Checksum: "",
        isEncrypted: false,
      });

      addToast("Request Sent", `Waiting for ${targetName} to accept...`, "info");
    }
  };

  // ── HTTP Upload (called when receiver accepts) ────────────────────────────────
  // Uses XHR so we get upload progress events. The browser streams the File
  // object directly from disk — no memory buffering, works for any size.
  const startHttpUpload = (transferId: string) => {
    const entry = pendingFilesRef.current.get(transferId);
    if (!entry) return;
    const { file, targetPeerId } = entry;

    setTransfers((prev) =>
      prev.map((t) => (t.id === transferId ? { ...t, status: "transferring" } : t))
    );

    speedTrackerRef.current.set(transferId, { lastBytes: 0, lastTime: Date.now() });

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/transfer/upload/${transferId}`);
    xhr.setRequestHeader("X-File-Name", encodeURIComponent(file.name));
    // Content-Type set to file's MIME so server can forward it to receiver
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      const tracker = speedTrackerRef.current.get(transferId);
      const now = Date.now();
      let speed = 0, eta = 0;
      if (tracker) {
        const dt = (now - tracker.lastTime) / 1000;
        if (dt > 0.25) {
          speed = (event.loaded - tracker.lastBytes) / dt;
          eta   = speed > 0 ? (event.total - event.loaded) / speed : 0;
          speedTrackerRef.current.set(transferId, { lastBytes: event.loaded, lastTime: now });
        }
      }
      setTransfers((prev) =>
        prev.map((t) =>
          t.id === transferId
            ? { ...t, status: "transferring", progress: Math.round((event.loaded / event.total) * 100), bytesTransferred: event.loaded, speedBytesPerSec: speed || t.speedBytesPerSec, etaSeconds: eta || t.etaSeconds }
            : t
        )
      );
    };

    xhr.onload = () => {
      setTransfers((prev) =>
        prev.map((t) =>
          t.id === transferId ? { ...t, status: "completed", progress: 100, bytesTransferred: file.size } : t
        )
      );
      wsClient.sendTransferComplete(transferId, targetPeerId);
      addToast("Transfer Completed", `Sent ${file.name}`, "success");
      pendingFilesRef.current.delete(transferId);
    };

    xhr.onerror = () => {
      setTransfers((prev) =>
        prev.map((t) =>
          t.id === transferId ? { ...t, status: "failed", error: "Upload failed" } : t
        )
      );
      addToast("Transfer Failed", `Failed to send ${file.name}`, "error");
    };

    // Send the File object directly — browser streams it from disk
    xhr.send(file);
  };

  // ── Accept Incoming Offer ─────────────────────────────────────────────────
  // savePath is chosen by the user INSIDE the modal (via native save dialog).
  // Download goes: Server → Node.js HTTP (main process) → disk
  // Zero Chromium buffering — real-time progress at full LAN speed.
  const handleAcceptOffer = async (savePath: string) => {
    if (!incomingOffer) return;
    const offer = incomingOffer;
    setIncomingOffer(null);

    // Register transfer in UI
    const newTransfer: FileTransfer = {
      id: offer.transferId,
      fileName: offer.fileName,
      fileSize: offer.fileSize,
      fileType: offer.fileType,
      direction: "incoming",
      status: "transferring",
      progress: 0,
      bytesTransferred: 0,
      totalBytes: offer.fileSize,
      speedBytesPerSec: 0,
      etaSeconds: 0,
      senderId: offer.senderId,
      senderName: offer.senderName,
      targetPeerId: wsClient.getPeerId(),
      targetPeerName: deviceName,
      sha256Checksum: "",
      isEncrypted: false,
      chunksTransferred: 0,
      totalChunks: 1,
      downloadUrl: null,
      previewUrl: null,
      error: null,
      timestamp: Date.now(),
    };
    setTransfers((prev) => [newTransfer, ...prev]);

    // Signal sender to start uploading
    wsClient.sendTransferResponse(offer.transferId, true, offer.senderId);
    addToast("Receiving File", `Saving ${offer.fileName}...`, "info");

    const electronAPI = (window as any).electronAPI;
    const tid = offer.transferId;
    const downloadUrl = `${window.location.origin}/api/transfer/download/${tid}`;

    if (electronAPI?.downloadToDisk && savePath) {
      // ── IPC path: Node.js HTTP → fs.WriteStream → disk ─────────────────────
      // Progress events come back from main process via IPC
      electronAPI.onDownloadProgress(({ transferId, received, total, speed, eta }: any) => {
        if (transferId !== tid) return;
        setTransfers((prev) =>
          prev.map((t) =>
            t.id === tid
              ? {
                  ...t,
                  progress: total > 0 ? Math.round((received / total) * 100) : t.progress,
                  bytesTransferred: received,
                  speedBytesPerSec: speed || t.speedBytesPerSec,
                  etaSeconds: eta || t.etaSeconds,
                }
              : t
          )
        );
      });

      electronAPI.onDownloadComplete(({ transferId }: any) => {
        if (transferId !== tid) return;
        setTransfers((prev) =>
          prev.map((t) =>
            t.id === tid ? { ...t, status: "completed", progress: 100, bytesTransferred: offer.fileSize } : t
          )
        );
        electronAPI.removeDownloadListeners(tid);
        addToast("File Saved!", `${offer.fileName} saved`, "success");
      });

      try {
        await electronAPI.downloadToDisk({
          downloadUrl,
          savePath,
          transferId: tid,
          fileSize: offer.fileSize,
        });
      } catch (err: any) {
        const msg = String(err?.message || err);
        electronAPI.removeDownloadListeners(tid);
        setTransfers((prev) =>
          prev.map((t) =>
            t.id === tid ? { ...t, status: "failed", error: msg } : t
          )
        );
        addToast("Transfer Failed", msg, "error");
      }
    }
  };


  // ── Decline Incoming Offer ───────────────────────────────────────────────────
  const handleDeclineOffer = () => {
    if (incomingOffer) {
      wsClient.sendTransferResponse(incomingOffer.transferId, false, incomingOffer.senderId, "User declined request");
      setIncomingOffer(null);
    }
  };

  // ── Progress update from WebSocket (optional, for compatibility) ─────────────
  const updateTransferProgress = (transferId: string, progress: number, bytesTransferred: number) => {
    setTransfers((prev) =>
      prev.map((t) => (t.id === transferId ? { ...t, progress, bytesTransferred } : t))
    );
  };

  const handleTransferCompletedRemote = (transferId: string) => {
    setTransfers((prev) =>
      prev.map((t) =>
        t.id === transferId ? { ...t, status: "completed", progress: 100 } : t
      )
    );
  };

  // Cancel Transfer
  const handleCancelTransfer = (transferId: string) => {
    const transfer = transfers.find((t) => t.id === transferId);
    if (transfer) {
      wsClient.sendTransferCancel(transferId, transfer.targetPeerId || transfer.senderId);
      setTransfers((prev) =>
        prev.map((t) => (t.id === transferId ? { ...t, status: "cancelled" } : t))
      );
      addToast("Transfer Cancelled", `Cancelled ${transfer.fileName}`, "info");
    }
  };

  // Pause / Resume Transfer
  const handlePauseResumeTransfer = (transferId: string) => {
    setTransfers((prev) =>
      prev.map((t) => {
        if (t.id === transferId) {
          const nextStatus = t.status === "paused" ? "transferring" : "paused";
          return { ...t, status: nextStatus };
        }
        return t;
      })
    );
  };

  // Clear Completed
  const handleClearCompleted = () => {
    setTransfers((prev) =>
      prev.filter(
        (t) =>
          t.status === "pending" ||
          t.status === "preparing" ||
          t.status === "encrypting" ||
          t.status === "transferring" ||
          t.status === "decrypting" ||
          t.status === "verifying" ||
          t.status === "paused"
      )
    );
  };

  // Delete Individual Transfer from History
  const handleDeleteTransfer = (transferId: string) => {
    setTransfers((prev) => prev.filter((t) => t.id !== transferId));
  };

  // Share Clipboard
  const handleShareClipboard = (text: string) => {
    wsClient.shareClipboard(text);
    const newItem: ClipboardItem = {
      id: `clip-${Date.now()}`,
      senderId: wsClient.getPeerId(),
      senderName: deviceName,
      content: text,
      timestamp: Date.now(),
    };
    setClipboards((prev) => [newItem, ...prev]);
    addToast("Clipboard Shared", "Broadcasted text snippet to room", "info");
  };

  return (
    <div className={`min-h-screen ${darkMode ? "dark bg-slate-950 text-slate-100" : "bg-slate-950 text-slate-100"} font-sans transition-colors duration-300 relative overflow-x-hidden`}>
      {/* Frosted Glass Ambient Spotlights */}
      <div className="fixed -top-40 -left-40 w-[600px] h-[600px] bg-indigo-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="fixed -bottom-40 -right-40 w-[700px] h-[700px] bg-cyan-600/15 rounded-full blur-[160px] pointer-events-none" />
      <div className="fixed top-1/3 left-1/3 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[130px] pointer-events-none" />

      {/* Header */}
      <Header
        isConnected={isConnected}
        roomId={roomId}
        deviceName={deviceName}
        deviceType={wsClient.getDeviceType()}
        onUpdateDeviceName={handleUpdateDeviceName}
        onOpenNetworkModal={() => setIsNetworkModalOpen(true)}
        networkInfo={networkInfo}
      />


      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6 relative z-10">
        {/* Device Discovery Grid */}
        <DeviceScanner
          peers={peers}
          currentPeerId={wsClient.getPeerId()}
          selectedPeerId={selectedPeerId}
          onSelectPeer={setSelectedPeerId}
          roomId={roomId}
          onJoinRoom={handleJoinRoom}
        />

        {/* Two Column Layout: Dropzone & Manager */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* File Dropzone & Quick Send */}
          <div className="lg:col-span-5 space-y-6">
            <FileDropzone
              peers={peers.filter((p) => p.id !== wsClient.getPeerId())}
              selectedPeerId={selectedPeerId}
              onSelectPeer={setSelectedPeerId}
              onSendFiles={handleSendFiles}
            />

            <ClipboardSync
              clipboards={clipboards}
              onShareClipboard={handleShareClipboard}
              onClearClipboards={() => setClipboards([])}
            />
          </div>

          {/* Transfers & Progress Monitor */}
          <div className="lg:col-span-7">
            <TransferManager
              transfers={transfers}
              onCancelTransfer={handleCancelTransfer}
              onPauseResumeTransfer={handlePauseResumeTransfer}
              onClearCompleted={handleClearCompleted}
              onDeleteTransfer={handleDeleteTransfer}
            />
          </div>
        </div>
      </main>

      {/* Modals & Alerts */}
      <IncomingTransferModal
        offer={incomingOffer}
        onAccept={handleAcceptOffer}
        onDecline={handleDeclineOffer}
      />

      <QRCodeModal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
        networkInfo={networkInfo}
        roomId={roomId}
      />

      <NetworkInfoModal
        isOpen={isNetworkModalOpen}
        onClose={() => setIsNetworkModalOpen(false)}
        networkInfo={networkInfo}
        roomId={roomId}
      />

      <WindowsAppModal
        isOpen={isWindowsModalOpen}
        onClose={() => setIsWindowsModalOpen(false)}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
