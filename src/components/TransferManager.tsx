import React, { useState } from "react";
import {
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  XCircle,
  Pause,
  Play,
  Download,
  Eye,
  ShieldCheck,
  Zap,
  Clock,
  Trash2,
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  Archive,
  Code,
  File,
  Search,
  ExternalLink,
} from "lucide-react";
import { FileTransfer, TransferStatus } from "../types";

interface TransferManagerProps {
  transfers: FileTransfer[];
  onCancelTransfer: (transferId: string) => void;
  onPauseResumeTransfer: (transferId: string) => void;
  onClearCompleted: () => void;
  onDeleteTransfer: (transferId: string) => void;
}

export const TransferManager: React.FC<TransferManagerProps> = ({
  transfers,
  onCancelTransfer,
  onPauseResumeTransfer,
  onClearCompleted,
  onDeleteTransfer,
}) => {
  const [activeTab, setActiveTab] = useState<"active" | "history">("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [previewFile, setPreviewFile] = useState<FileTransfer | null>(null);

  const activeTransfers = transfers.filter(
    (t) =>
      t.status === "pending" ||
      t.status === "preparing" ||
      t.status === "encrypting" ||
      t.status === "transferring" ||
      t.status === "decrypting" ||
      t.status === "verifying" ||
      t.status === "paused"
  );

  const completedTransfers = transfers.filter(
    (t) => t.status === "completed" || t.status === "failed" || t.status === "cancelled"
  );

  const filteredHistory = completedTransfers.filter(
    (t) =>
      t.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.senderName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatSpeed = (bytesPerSec: number): string => {
    if (bytesPerSec <= 0) return "0 KB/s";
    const mbPerSec = bytesPerSec / (1024 * 1024);
    if (mbPerSec >= 1) {
      return `${mbPerSec.toFixed(1)} MB/s`;
    }
    const kbPerSec = bytesPerSec / 1024;
    return `${kbPerSec.toFixed(0)} KB/s`;
  };

  const formatSeconds = (sec: number): string => {
    if (sec <= 0 || !isFinite(sec)) return "0s";
    if (sec < 60) return `${Math.ceil(sec)}s`;
    const min = Math.floor(sec / 60);
    const remainingSec = Math.ceil(sec % 60);
    return `${min}m ${remainingSec}s`;
  };

  const getStatusBadge = (status: TransferStatus) => {
    switch (status) {
      case "encrypting":
        return (
          <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full flex items-center gap-1 font-mono">
            <ShieldCheck className="w-3 h-3" /> Encrypting AES-256
          </span>
        );
      case "decrypting":
        return (
          <span className="text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-full flex items-center gap-1 font-mono">
            <ShieldCheck className="w-3 h-3" /> Decrypting Payload
          </span>
        );
      case "verifying":
        return (
          <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full flex items-center gap-1 font-mono">
            <ShieldCheck className="w-3 h-3" /> Verifying SHA-256
          </span>
        );
      case "transferring":
        return (
          <span className="text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-full flex items-center gap-1 font-mono">
            <Zap className="w-3 h-3 animate-pulse" /> Transferring LAN Chunks
          </span>
        );
      case "paused":
        return (
          <span className="text-[10px] bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded-full font-mono">
            Paused
          </span>
        );
      case "completed":
        return (
          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1 font-mono">
            <CheckCircle2 className="w-3 h-3" /> Verified Complete
          </span>
        );
      case "failed":
      case "cancelled":
        return (
          <span className="text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-full flex items-center gap-1 font-mono">
            <XCircle className="w-3 h-3" /> {status === "cancelled" ? "Cancelled" : "Failed"}
          </span>
        );
      default:
        return (
          <span className="text-[10px] bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded-full font-mono">
            Preparing
          </span>
        );
    }
  };

  const getFileIcon = (fileType: string, fileName: string) => {
    const name = fileName.toLowerCase();
    if (fileType.startsWith("image/")) return <ImageIcon className="w-5 h-5 text-emerald-400" />;
    if (fileType.startsWith("video/")) return <Film className="w-5 h-5 text-purple-400" />;
    if (fileType.startsWith("audio/")) return <Music className="w-5 h-5 text-pink-400" />;
    if (fileType.includes("pdf") || name.endsWith(".txt"))
      return <FileText className="w-5 h-5 text-amber-400" />;
    if (name.endsWith(".zip") || name.endsWith(".rar") || name.endsWith(".7z"))
      return <Archive className="w-5 h-5 text-cyan-400" />;
    if (name.endsWith(".ts") || name.endsWith(".js") || name.endsWith(".json"))
      return <Code className="w-5 h-5 text-blue-400" />;

    return <File className="w-5 h-5 text-slate-400" />;
  };

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden h-full flex flex-col">
      {/* Header Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 mb-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("active")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "active"
                ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-lg shadow-indigo-500/10"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>Active Transfers</span>
            <span
              className={`text-[10px] px-2 py-0.2 rounded-full font-bold ${
                activeTransfers.length > 0
                  ? "bg-indigo-500 text-white"
                  : "bg-white/10 text-slate-400"
              }`}
            >
              {activeTransfers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "history"
                ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-lg shadow-indigo-500/10"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>Transfer History</span>
            <span className="text-[10px] bg-white/10 text-slate-400 px-2 py-0.2 rounded-full font-bold">
              {completedTransfers.length}
            </span>
          </button>
        </div>

        {activeTab === "history" && completedTransfers.length > 0 && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-48">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search history..."
                className="bg-slate-950 border border-white/10 text-white text-xs pl-8 pr-3 py-1.5 rounded-xl outline-none w-full focus:border-indigo-500"
              />
            </div>

            <button
              onClick={onClearCompleted}
              className="text-slate-400 hover:text-rose-400 text-xs px-2.5 py-1.5 rounded-xl border border-white/10 hover:border-rose-500/30 transition-colors shrink-0"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* ACTIVE TRANSFERS TAB */}
      {activeTab === "active" && (
        <div className="space-y-3 flex-1">
          {activeTransfers.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl bg-white/5 backdrop-blur-md flex flex-col items-center justify-center">
              <Zap className="w-8 h-8 text-slate-500 mb-2" />
              <p className="text-sm font-bold text-white">No active transfers</p>
              <p className="text-xs text-slate-400 max-w-xs mt-1">
                Drop files in the dropzone or receive incoming files over LAN.
              </p>
            </div>
          ) : (
            activeTransfers.map((transfer) => (
              <div
                key={transfer.id}
                className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3 shadow-xl hover:border-white/20 transition-all backdrop-blur-md"
              >
                {/* File Title & Direction */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-3 rounded-xl bg-slate-950 border border-white/10">
                      {getFileIcon(transfer.fileType, transfer.fileName)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white truncate max-w-xs">
                          {transfer.fileName}
                        </h4>
                        <span className="flex items-center text-[10px] text-slate-400 font-medium">
                          {transfer.direction === "outgoing" ? (
                            <span className="flex items-center gap-0.5 text-indigo-400">
                              <ArrowUpRight className="w-3 h-3" /> Outgoing to {transfer.targetPeerName}
                            </span>
                          ) : (
                            <span className="flex items-center gap-0.5 text-emerald-400">
                              <ArrowDownLeft className="w-3 h-3" /> Incoming from {transfer.senderName}
                            </span>
                          )}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-slate-400 font-mono">
                          {formatFileSize(transfer.fileSize)}
                        </span>
                        <span>•</span>
                        {getStatusBadge(transfer.status)}
                      </div>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => onPauseResumeTransfer(transfer.id)}
                      className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 transition-colors"
                      title={transfer.status === "paused" ? "Resume Transfer" : "Pause Transfer"}
                    >
                      {transfer.status === "paused" ? (
                        <Play className="w-4 h-4 text-indigo-400" />
                      ) : (
                        <Pause className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                    <button
                      onClick={() => onCancelTransfer(transfer.id)}
                      className="p-1.5 rounded-xl bg-white/10 hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 transition-colors"
                      title="Cancel Transfer"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                    <span>
                      {formatFileSize(transfer.bytesTransferred)} / {formatFileSize(transfer.totalBytes)}
                    </span>
                    <span className="text-indigo-400 font-bold">{Math.round(transfer.progress)}%</span>
                  </div>

                  <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden p-0.5 border border-white/10">
                    <div
                      className="bg-gradient-to-r from-indigo-500 to-blue-400 h-full rounded-full transition-all duration-300 shadow-[0_0_12px_rgba(99,102,241,0.4)]"
                      style={{ width: `${Math.max(2, transfer.progress)}%` }}
                    />
                  </div>
                </div>

                {/* Speed & ETA stats */}
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1">
                  <div className="flex items-center gap-1">
                    <Zap className="w-3 h-3 text-indigo-400" />
                    <span>Speed: {formatSpeed(transfer.speedBytesPerSec)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-400" />
                    <span>ETA: {formatSeconds(transfer.etaSeconds)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* HISTORY TAB */}
      {activeTab === "history" && (
        <div className="space-y-3 flex-1">
          {filteredHistory.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl bg-white/5 backdrop-blur-md flex flex-col items-center justify-center">
              <Clock className="w-8 h-8 text-slate-500 mb-2" />
              <p className="text-sm font-bold text-white">No transfer history</p>
              <p className="text-xs text-slate-400 max-w-xs mt-1">
                Completed file transfers will be listed here.
              </p>
            </div>
          ) : (
            filteredHistory.map((transfer) => (
              <div
                key={transfer.id}
                className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between gap-3 hover:border-white/20 transition-all backdrop-blur-md"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-white/10">
                    {getFileIcon(transfer.fileType, transfer.fileName)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-white truncate max-w-xs">
                        {transfer.fileName}
                      </h4>
                      {getStatusBadge(transfer.status)}
                    </div>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {formatFileSize(transfer.fileSize)} • {transfer.direction === "outgoing" ? `To ${transfer.targetPeerName}` : `From ${transfer.senderName}`}
                    </p>
                  </div>
                </div>

                {/* Download / Preview / Delete Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {transfer.downloadUrl && (
                    <a
                      href={transfer.downloadUrl}
                      download={transfer.fileName}
                      className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all"
                      title="Download received file"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Download</span>
                    </a>
                  )}

                  {transfer.previewUrl && (
                    <button
                      onClick={() => setPreviewFile(transfer)}
                      className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 transition-colors"
                      title="Preview File"
                    >
                      <Eye className="w-3.5 h-3.5 text-indigo-400" />
                    </button>
                  )}

                  <button
                    onClick={() => onDeleteTransfer(transfer.id)}
                    className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-400 hover:text-rose-400 transition-colors"
                    title="Remove from history"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* File Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white truncate max-w-md">
                Preview: {previewFile.fileName}
              </h3>
              <button
                onClick={() => setPreviewFile(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="flex justify-center bg-slate-950 rounded-xl p-4 border border-slate-800 min-h-[200px] items-center">
              {previewFile.fileType.startsWith("image/") ? (
                <img
                  src={previewFile.previewUrl!}
                  alt="Preview"
                  className="max-h-96 rounded-lg object-contain"
                />
              ) : previewFile.fileType.startsWith("video/") ? (
                <video
                  src={previewFile.previewUrl!}
                  controls
                  className="max-h-96 rounded-lg w-full"
                />
              ) : previewFile.fileType.startsWith("audio/") ? (
                <audio src={previewFile.previewUrl!} controls className="w-full" />
              ) : (
                <div className="text-center p-6 text-slate-400 text-xs">
                  <FileText className="w-12 h-12 mx-auto mb-2 text-cyan-400" />
                  <span>Preview not supported for this format. Download to view.</span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              {previewFile.downloadUrl && (
                <a
                  href={previewFile.downloadUrl}
                  download={previewFile.fileName}
                  className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" /> Download File
                </a>
              )}
              <button
                onClick={() => setPreviewFile(null)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold px-4 py-2 rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
