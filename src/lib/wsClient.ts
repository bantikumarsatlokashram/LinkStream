import { Peer, TransferRequestOffer, ClipboardItem } from "../types";

export type MessageHandler = (data: { type: string; payload: any }) => void;

class WebSocketClient {
  private socket: WebSocket | null = null;
  private roomId: string = "LAN-ZONE";
  private peerId: string = "";
  private deviceName: string = "My Device";
  private deviceType: "desktop" | "mobile" | "tablet" = "desktop";
  private osName: "windows" | "macos" | "linux" | "android" | "ios" | "unknown" = "unknown";
  private handlers: Set<MessageHandler> = new Set();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isConnecting: boolean = false;

  constructor() {
    this.detectDeviceDetails();
    this.peerId = `peer-${Math.random().toString(36).substring(2, 8)}`;
  }

  private detectDeviceDetails() {
    if (typeof window === "undefined") return;

    const ua = navigator.userAgent.toLowerCase();
    
    // Detect OS
    if (ua.includes("win")) this.osName = "windows";
    else if (ua.includes("mac")) this.osName = "macos";
    else if (ua.includes("linux")) this.osName = "linux";
    else if (ua.includes("android")) this.osName = "android";
    else if (ua.includes("iphone") || ua.includes("ipad")) this.osName = "ios";

    // Detect Device Type
    const isMobile = /mobile|android|iphone|ipad|tablet/i.test(ua);
    const isTablet = /ipad|tablet/i.test(ua);

    if (isTablet) this.deviceType = "tablet";
    else if (isMobile) this.deviceType = "mobile";
    else this.deviceType = "desktop";

    // Friendly Device Name — use real PC hostname (from Electron preload)
    const savedName = localStorage.getItem("lan_device_name");
    const electronHostname = (window as any).electronAPI?.hostname;

    // List of generic/default names that should be replaced with real hostname
    const isGenericName = (n: string) =>
      !n ||
      /^(Windows|Mac|Linux|Android|iOS)\s+(Desktop|Mobile|Tablet)$/i.test(n) ||
      n === "My Device";

    if (electronHostname) {
      // If saved name is generic or there's no saved name, use real hostname
      if (!savedName || isGenericName(savedName)) {
        this.deviceName = electronHostname;
        localStorage.setItem("lan_device_name", electronHostname);
      } else {
        // User manually set a custom name — respect it
        this.deviceName = savedName;
      }
    } else if (savedName && !isGenericName(savedName)) {
      this.deviceName = savedName;
    } else {
      // Fallback for non-Electron environment
      const osFormatted = this.osName.charAt(0).toUpperCase() + this.osName.slice(1);
      const typeFormatted = this.deviceType.charAt(0).toUpperCase() + this.deviceType.slice(1);
      this.deviceName = `${osFormatted} ${typeFormatted}`;
    }
  }

  public getPeerId(): string {
    return this.peerId;
  }

  public getDeviceName(): string {
    return this.deviceName;
  }

  public setDeviceName(name: string) {
    this.deviceName = name;
    localStorage.setItem("lan_device_name", name);
    this.rejoinRoom();
  }

  public getDeviceType(): "desktop" | "mobile" | "tablet" {
    return this.deviceType;
  }

  public getOS(): "windows" | "macos" | "linux" | "android" | "ios" | "unknown" {
    return this.osName;
  }

  public getRoomId(): string {
    return this.roomId;
  }

  public subscribe(handler: MessageHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  private notifyHandlers(type: string, payload: any) {
    this.handlers.forEach((h) => h({ type, payload }));
  }

  public connect(roomId: string = "LAN-ZONE") {
    this.roomId = roomId;

    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      if (this.socket.readyState === WebSocket.OPEN) {
        this.joinRoom();
      }
      return;
    }

    if (this.isConnecting) return;
    this.isConnecting = true;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        this.isConnecting = false;
        this.notifyHandlers("status-change", { connected: true });
        this.joinRoom();
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.notifyHandlers(data.type, data.payload);
        } catch (e) {
          console.error("Error parsing WS message:", e);
        }
      };

      this.socket.onclose = () => {
        this.isConnecting = false;
        this.notifyHandlers("status-change", { connected: false });
        this.scheduleReconnect();
      };

      this.socket.onerror = (err) => {
        this.isConnecting = false;
        console.error("WS connection error:", err);
      };
    } catch (e) {
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.connect(this.roomId);
    }, 3000);
  }

  public joinRoom(roomId?: string) {
    if (roomId) this.roomId = roomId;

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.send("join-room", {
        roomId: this.roomId,
        peerId: this.peerId,
        deviceName: this.deviceName,
        deviceType: this.deviceType,
        osName: this.osName,
      });
    }
  }

  public rejoinRoom() {
    this.joinRoom(this.roomId);
  }

  public send(type: string, payload: any) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type, payload }));
    }
  }

  public sendTransferRequest(offer: TransferRequestOffer) {
    this.send("transfer-request", offer);
  }

  public sendTransferResponse(transferId: string, accepted: boolean, targetPeerId: string, reason?: string) {
    this.send("transfer-response", { transferId, accepted, targetPeerId, reason });
  }

  public sendFileChunk(
    transferId: string,
    targetPeerId: string,
    chunkIndex: number,
    totalChunks: number,
    iv: string,
    encryptedData: string
  ) {
    this.send("file-chunk", {
      transferId,
      targetPeerId,
      chunkIndex,
      totalChunks,
      iv,
      encryptedData,
    });
  }

  public sendTransferProgress(transferId: string, targetPeerId: string, progress: number, bytesTransferred: number) {
    this.send("transfer-progress", {
      transferId,
      targetPeerId,
      progress,
      bytesTransferred,
    });
  }

  public sendTransferComplete(transferId: string, targetPeerId: string) {
    this.send("transfer-complete", { transferId, targetPeerId });
  }

  public sendTransferCancel(transferId: string, targetPeerId: string, reason?: string) {
    this.send("transfer-cancel", { transferId, targetPeerId, reason });
  }

  public shareClipboard(content: string) {
    this.send("clipboard-share", {
      id: `clip-${Date.now()}`,
      senderName: this.deviceName,
      content,
      timestamp: Date.now(),
    });
  }
}

export const wsClient = new WebSocketClient();
