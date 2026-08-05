import React, { useState, useRef } from "react";
import {
  UploadCloud,
  File,
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  Archive,
  Code,
  X,
  Send,
  Lock,
  ChevronDown,
  FolderPlus,
  Sparkles,
} from "lucide-react";
import { Peer } from "../types";

interface FileDropzoneProps {
  peers: Peer[];
  selectedPeerId: string | null;
  onSelectPeer: (peerId: string | null) => void;
  onSendFiles: (files: File[], targetPeerId: string | null) => void;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  peers,
  selectedPeerId,
  onSelectPeer,
  onSendFiles,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileQueue, setFileQueue] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      setFileQueue((prev) => [...prev, ...droppedFiles]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      setFileQueue((prev) => [...prev, ...selectedFiles]);
    }
  };

  const removeFileFromQueue = (index: number) => {
    setFileQueue((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSendAll = () => {
    if (fileQueue.length > 0) {
      onSendFiles(fileQueue, selectedPeerId);
      setFileQueue([]);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (file: File) => {
    const type = file.type;
    const name = file.name.toLowerCase();

    if (type.startsWith("image/")) return <ImageIcon className="w-5 h-5 text-emerald-400" />;
    if (type.startsWith("video/")) return <Film className="w-5 h-5 text-purple-400" />;
    if (type.startsWith("audio/")) return <Music className="w-5 h-5 text-pink-400" />;
    if (type.includes("pdf") || type.includes("text") || name.endsWith(".txt"))
      return <FileText className="w-5 h-5 text-amber-400" />;
    if (
      name.endsWith(".zip") ||
      name.endsWith(".rar") ||
      name.endsWith(".7z") ||
      name.endsWith(".tar") ||
      name.endsWith(".gz")
    )
      return <Archive className="w-5 h-5 text-cyan-400" />;
    if (
      name.endsWith(".ts") ||
      name.endsWith(".js") ||
      name.endsWith(".html") ||
      name.endsWith(".css") ||
      name.endsWith(".py") ||
      name.endsWith(".json")
    )
      return <Code className="w-5 h-5 text-blue-400" />;

    return <File className="w-5 h-5 text-slate-400" />;
  };

  const getTargetPeerName = () => {
    if (selectedPeerId === null) return "All Online Devices";
    const found = peers.find((p) => p.id === selectedPeerId);
    return found ? found.deviceName : "Select Peer";
  };

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-indigo-400" />
            <span>Share Files</span>
          </h3>
          <p className="text-xs text-slate-400">
            End-to-end encrypted and sent directly over local network
          </p>
        </div>

        {/* Target Recipient Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 hidden sm:inline">Target Node:</span>
          <div className="relative">
            <select
              value={selectedPeerId || "all"}
              onChange={(e) =>
                onSelectPeer(e.target.value === "all" ? null : e.target.value)
              }
              className="bg-slate-950 border border-white/10 text-indigo-300 text-xs font-medium rounded-xl px-3 py-1.5 pr-8 appearance-none outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="all">Broadcast All Nodes ({peers.length})</option>
              {peers.map((peer) => (
                <option key={peer.id} value={peer.id}>
                  {peer.deviceName} ({peer.os})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Drag & Drop Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 group ${
          isDragOver
            ? "border-indigo-400 bg-indigo-500/10 scale-[1.01]"
            : "border-white/20 hover:border-indigo-500/50 bg-white/5 hover:bg-white/10"
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center pointer-events-none">
          <div className="w-16 h-16 rounded-full bg-indigo-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <UploadCloud className="w-8 h-8 text-indigo-400" />
          </div>

          <h3 className="text-lg font-bold text-white mb-1">Drag and drop to share</h3>

          <p className="text-slate-400 text-sm">
            Files are end-to-end encrypted and sent directly over your local network.
          </p>

          <div className="mt-6 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl cursor-pointer shadow-lg shadow-indigo-600/20 transition-all text-xs">
            Browse Files
          </div>
        </div>
      </div>

      {/* Selected File Queue */}
      {fileQueue.length > 0 && (
        <div className="mt-5 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
            <span>Ready to Send ({fileQueue.length} files)</span>
            <button
              onClick={() => setFileQueue([])}
              className="text-slate-400 hover:text-rose-400 text-[11px] transition-colors"
            >
              Clear All
            </button>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {fileQueue.map((file, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-slate-200 hover:border-white/20 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-slate-950 border border-white/10">
                    {getFileIcon(file)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-white truncate">{file.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => removeFileFromQueue(idx)}
                  className="p-1 text-slate-400 hover:text-rose-400 hover:bg-white/10 rounded-lg transition-colors"
                  title="Remove file"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Action Send Button */}
          <button
            onClick={handleSendAll}
            disabled={peers.length === 0}
            className={`w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${
              peers.length > 0
                ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20 active:scale-[0.99]"
                : "bg-white/10 text-slate-500 cursor-not-allowed border border-white/10"
            }`}
          >
            <Send className="w-4 h-4" />
            <span>
              {peers.length === 0
                ? "Waiting for active LAN nodes"
                : `Transfer ${fileQueue.length} ${
                    fileQueue.length === 1 ? "File" : "Files"
                  } to ${getTargetPeerName()}`}
            </span>
          </button>
        </div>
      )}
    </div>
  );
};
