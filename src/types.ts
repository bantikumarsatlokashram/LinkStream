export type DeviceType = "desktop" | "mobile" | "tablet";

export type OSType = "windows" | "macos" | "linux" | "android" | "ios" | "unknown";

export interface Peer {
  id: string;
  deviceName: string;
  deviceType: DeviceType;
  os: OSType;
  ip: string;
  joinedAt: number;
}

export type TransferStatus =
  | "pending"
  | "preparing"
  | "encrypting"
  | "transferring"
  | "decrypting"
  | "verifying"
  | "completed"
  | "paused"
  | "failed"
  | "cancelled";

export type TransferDirection = "outgoing" | "incoming";

export interface FileTransfer {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  direction: TransferDirection;
  status: TransferStatus;
  progress: number; // 0 to 100
  bytesTransferred: number;
  totalBytes: number;
  speedBytesPerSec: number; // MB/s formatted in UI
  etaSeconds: number;
  senderId: string;
  senderName: string;
  targetPeerId: string;
  targetPeerName: string;
  sha256Checksum: string;
  isEncrypted: boolean;
  chunksTransferred: number;
  totalChunks: number;
  downloadUrl: string | null;
  previewUrl: string | null;
  fileData?: ArrayBuffer[];
  error: string | null;
  timestamp: number;
}

export interface ClipboardItem {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: number;
}

export interface NetworkInfo {
  localIps: string[];
  hostname: string;
  platform: string;
  appUrl: string;
  currentHost: string;
  totalRooms: number;
}

export interface NotificationAlert {
  id: string;
  type: "info" | "success" | "warning" | "error";
  title: string;
  message: string;
  timestamp: number;
}

export interface TransferRequestOffer {
  transferId: string;
  senderId: string;
  senderName: string;
  targetPeerId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  totalChunks: number;
  sha256Checksum: string;
  isEncrypted: boolean;
}
