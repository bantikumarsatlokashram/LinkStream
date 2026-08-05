import React, { useState } from "react";
import {
  FileText,
  Download,
  XCircle,
  Laptop,
  FolderOpen,
  CheckCircle2,
  Zap,
} from "lucide-react";
import { TransferRequestOffer } from "../types";

interface IncomingTransferModalProps {
  offer: TransferRequestOffer | null;
  onAccept: (savePath: string) => void;
  onDecline: () => void;
}

export const IncomingTransferModal: React.FC<IncomingTransferModalProps> = ({
  offer,
  onAccept,
  onDecline,
}) => {
  const [savePath, setSavePath] = useState<string>("");
  const [isChoosing, setIsChoosing] = useState(false);

  if (!offer) return null;

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleChooseSavePath = async () => {
    const electronAPI = (window as any).electronAPI;
    if (!electronAPI?.showSaveDialog) return;

    setIsChoosing(true);
    try {
      const result = await electronAPI.showSaveDialog(offer.fileName);
      if (!result.canceled && result.filePath) {
        setSavePath(result.filePath);
      }
    } catch (e) {
      console.error("Save dialog error:", e);
    } finally {
      setIsChoosing(false);
    }
  };

  const handleAccept = () => {
    if (!savePath) return;
    onAccept(savePath);
  };

  // Show just the filename from the path for display
  const displayPath = savePath
    ? savePath.split(/[/\\]/).pop() + " (" + savePath.split(/[/\\]/).slice(0, -1).join("\\") + ")"
    : "";

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 relative overflow-hidden">
        {/* Top accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500" />

        {/* Title */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
            </span>
            <h3 className="text-base font-bold text-white">Incoming LAN File Request</h3>
          </div>
          <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-0.5 rounded-full flex items-center gap-1 font-mono">
            <Zap className="w-3 h-3" /> High Speed
          </span>
        </div>

        {/* Sender Info */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
            <Laptop className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <p className="text-xs text-slate-400">Sender Device</p>
            <p className="text-sm font-bold text-white">{offer.senderName}</p>
          </div>
        </div>

        {/* File Details */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-300">File Details:</p>
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                <span className="text-xs font-bold text-white truncate">{offer.fileName}</span>
              </div>
              <span className="text-xs font-mono font-bold text-cyan-400 shrink-0">
                {formatFileSize(offer.fileSize)}
              </span>
            </div>
          </div>
        </div>

        {/* Save Location Picker — REQUIRED before accepting */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-300">
            Save Location <span className="text-red-400">*</span>
          </p>
          <button
            onClick={handleChooseSavePath}
            disabled={isChoosing}
            className={`w-full flex items-center gap-2 px-4 py-3 rounded-xl border text-xs font-medium transition-all ${
              savePath
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : "bg-slate-950 border-slate-700 hover:border-indigo-500/50 hover:bg-indigo-500/5 text-slate-400"
            }`}
          >
            {savePath ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="truncate text-left">{displayPath}</span>
              </>
            ) : (
              <>
                <FolderOpen className="w-4 h-4 shrink-0" />
                <span>{isChoosing ? "Choosing..." : "Choose where to save the file..."}</span>
              </>
            )}
          </button>
          {!savePath && (
            <p className="text-[10px] text-slate-500">
              You must choose a save location before accepting the transfer.
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={onDecline}
            className="flex-1 py-2.5 px-4 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
          >
            <XCircle className="w-4 h-4 text-slate-400" />
            <span>Decline</span>
          </button>

          <button
            onClick={handleAccept}
            disabled={!savePath}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              savePath
                ? "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-lg shadow-cyan-500/20 active:scale-95"
                : "bg-slate-800 text-slate-500 cursor-not-allowed"
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Accept &amp; Save</span>
          </button>
        </div>
      </div>
    </div>
  );
};
