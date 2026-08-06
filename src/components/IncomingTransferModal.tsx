import React, { useState, useEffect, useRef } from "react";
import {
  FileText,
  Download,
  XCircle,
  Laptop,
  FolderOpen,
  CheckCircle2,
  Zap,
  AlertCircle,
} from "lucide-react";
import { TransferRequestOffer } from "../types";

const SAVED_FOLDER_KEY = "linkstream_save_folder";

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
  const [folderPath, setFolderPath] = useState<string>("");
  const [validationMsg, setValidationMsg] = useState<string>("");
  const [isValid, setIsValid] = useState<boolean>(false);
  const [remember, setRemember] = useState<boolean>(false);
  const [isBrowsing, setIsBrowsing] = useState<boolean>(false);
  const [diagError, setDiagError] = useState<string>("");
  const validationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Validate folder path via Electron IPC ────────────────────────────────────
  // IMPORTANT: must be declared BEFORE the useEffect that calls it and before
  // any early return — otherwise the production bundle hits TDZ (const in
  // dead zone) when useEffect fires while offer===null on first render.
  const validatePath = async (p: string) => {
    const eAPI = (window as any).electronAPI;
    const trimmed = p.trim();
    if (!trimmed) {
      setIsValid(false);
      setValidationMsg("");
      return;
    }
    if (!eAPI?.validateFolder) {
      // Fallback: assume valid if non-empty (non-Electron dev mode)
      setIsValid(true);
      setValidationMsg("");
      return;
    }
    try {
      const result = await eAPI.validateFolder(trimmed);
      if (result.valid) {
        setIsValid(true);
        setValidationMsg("");
      } else {
        setIsValid(false);
        if (result.reason === "no_permission") {
          setValidationMsg("No write permission to this folder.");
        } else {
          setValidationMsg("Folder does not exist. Please choose a valid folder.");
        }
      }
    } catch {
      setIsValid(false);
      setValidationMsg("Could not validate folder.");
    }
  };

  // On mount: load remembered folder OR default to Downloads
  useEffect(() => {
    const eAPI = (window as any).electronAPI;
    const remembered = localStorage.getItem(SAVED_FOLDER_KEY);
    if (remembered) {
      setFolderPath(remembered);
      setRemember(true);
      validatePath(remembered);
    } else if (eAPI?.getDefaultFolder) {
      eAPI.getDefaultFolder().then((p: string) => {
        if (p) {
          setFolderPath(p);
          validatePath(p);
        }
      });
    }
  }, []);

  if (!offer) return null;

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Debounce validation when user types manually
  const handlePathChange = (value: string) => {
    setFolderPath(value);
    setIsValid(false);
    setValidationMsg("");
    if (validationTimer.current) clearTimeout(validationTimer.current);
    if (!value.trim()) return;
    validationTimer.current = setTimeout(() => validatePath(value), 600);
  };

  // ── Native Windows Folder Picker via Electron IPC ────────────────────────────
  const handleBrowse = async () => {
    const eAPI = (window as any).electronAPI;
    console.log("[Browse] clicked. electronAPI:", !!eAPI, "showFolderDialog:", !!eAPI?.showFolderDialog);
    setDiagError("");

    if (!eAPI?.showFolderDialog) {
      setDiagError("Folder picker IPC not available. Please type the path manually.");
      return;
    }

    setIsBrowsing(true);
    try {
      console.log("[Browse] Calling showFolderDialog via IPC...");
      const result = await eAPI.showFolderDialog();
      console.log("[Browse] Result:", JSON.stringify(result));

      if (result?.error) {
        setDiagError(`Folder picker error: ${result.error}`);
      } else if (!result?.canceled && result?.folderPath) {
        setFolderPath(result.folderPath);
        setValidationMsg("");
        setDiagError("");
        setIsValid(true); // dialog only returns existing folders
        if (remember) {
          localStorage.setItem(SAVED_FOLDER_KEY, result.folderPath);
        }
      }
      // result.canceled = user clicked Cancel → do nothing
    } catch (err: any) {
      const msg = err?.message || String(err);
      console.error("[Browse] IPC error:", msg);
      setDiagError(`Failed to open folder picker: ${msg}`);
    } finally {
      setIsBrowsing(false);
    }
  };

  const handleToggleRemember = () => {
    const next = !remember;
    setRemember(next);
    if (next && folderPath.trim()) {
      localStorage.setItem(SAVED_FOLDER_KEY, folderPath.trim());
    } else if (!next) {
      localStorage.removeItem(SAVED_FOLDER_KEY);
    }
  };

  const handleAccept = () => {
    if (!isValid || !folderPath.trim()) return;
    const savePath = folderPath.trim().replace(/[\\/]$/, "") + "\\" + offer.fileName;
    if (remember) {
      localStorage.setItem(SAVED_FOLDER_KEY, folderPath.trim());
    }
    onAccept(savePath);
  };

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
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
              <span className="text-xs font-bold text-white truncate">{offer.fileName}</span>
            </div>
            <span className="text-xs font-mono font-bold text-cyan-400 shrink-0">
              {formatFileSize(offer.fileSize)}
            </span>
          </div>
        </div>

        {/* Save Location */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-300">
            Save Location <span className="text-red-400">*</span>
          </p>

          {/* Folder path text input + Browse button */}
          <div className="flex gap-2">
            <div className="relative flex-1 min-w-0">
              <input
                type="text"
                value={folderPath}
                onChange={(e) => handlePathChange(e.target.value)}
                placeholder="C:\Users\YourName\Downloads"
                spellCheck={false}
                autoComplete="off"
                className={`w-full bg-slate-950 border rounded-xl px-3 py-2.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none font-mono transition-colors pr-7 ${
                  folderPath.trim() === ""
                    ? "border-slate-700 focus:border-indigo-500/60"
                    : isValid
                    ? "border-emerald-500/50 focus:border-emerald-500"
                    : "border-red-500/50 focus:border-red-500/70"
                }`}
              />
              {/* Inline status icon */}
              {folderPath.trim() !== "" && (
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
                  {isValid ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                  )}
                </span>
              )}
            </div>

            {/* Browse button */}
            <button
              type="button"
              onClick={handleBrowse}
              disabled={isBrowsing}
              className="shrink-0 flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-500 text-xs font-semibold text-slate-300 hover:text-white transition-all active:scale-95 disabled:opacity-50"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              {isBrowsing ? "Opening..." : "Browse..."}
            </button>
          </div>

          {/* Validation error */}
          {validationMsg && (
            <p className="text-[11px] text-red-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 shrink-0" />
              {validationMsg}
            </p>
          )}

          {/* Browse/dialog error */}
          {diagError && (
            <p className="text-[11px] text-amber-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 shrink-0" />
              {diagError}
            </p>
          )}

          {/* Save path preview */}
          {isValid && folderPath.trim() && (
            <p className="text-[10px] text-slate-500 font-mono truncate">
              → {folderPath.trim().replace(/[\\/]$/, "")}\{offer.fileName}
            </p>
          )}

          {/* Remember checkbox */}
          <label className="flex items-center gap-2 cursor-pointer select-none group w-fit pt-0.5">
            <div
              onClick={handleToggleRemember}
              className={`w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0 ${
                remember
                  ? "bg-cyan-500 border-cyan-500"
                  : "bg-transparent border-slate-600 group-hover:border-slate-400"
              }`}
            >
              {remember && (
                <svg className="w-2.5 h-2.5 text-slate-950" fill="none" viewBox="0 0 10 10">
                  <path
                    d="M1.5 5l2.5 2.5 4.5-4.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
            <span
              onClick={handleToggleRemember}
              className="text-[11px] text-slate-400 group-hover:text-slate-300 transition-colors"
            >
              Remember this location for future transfers
            </span>
          </label>
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
            disabled={!isValid}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              isValid
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
