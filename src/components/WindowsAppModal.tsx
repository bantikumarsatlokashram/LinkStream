import React, { useState } from "react";
import {
  Monitor,
  Download,
  Terminal,
  Folder,
  CheckCircle2,
  Copy,
  Check,
  Sparkles,
  ShieldCheck,
  X,
  Play,
  Layers,
} from "lucide-react";

interface WindowsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WindowsAppModal: React.FC<WindowsAppModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(label);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900/90 border border-white/10 rounded-2xl max-w-2xl w-full p-6 space-y-5 backdrop-blur-2xl shadow-2xl relative overflow-hidden text-slate-100">
        {/* Ambient Blur Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[90px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-[90px] pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Monitor className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Windows App (.exe) Builder
              </h3>
              <p className="text-xs text-slate-400">
                Convert LinkStream into a standalone Windows desktop app
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info Box */}
        <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl space-y-2 relative z-10">
          <div className="flex items-center gap-2 text-indigo-300 font-semibold text-xs uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>Windows Desktop Executable (.exe) Setup</span>
          </div>
          <p className="text-xs text-indigo-100/90 leading-relaxed">
            Electron aur Electron-Builder configurations app me configure kar diye gaye hain. Windows system par isko single click .exe installer me convert kar sakte hain:
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-3 relative z-10">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Step-by-Step (.exe File Banane Ka Tarika)
          </h4>

          {/* Step 1 */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-[11px] font-bold flex items-center justify-center">
                  1
                </span>
                <span className="text-xs font-semibold text-white">
                  Windows Builder Command chalayein
                </span>
              </div>
              <button
                onClick={() => copyToClipboard("npm run build:win", "cmd1")}
                className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-2.5 py-1 rounded-lg border border-indigo-500/20 transition-all"
              >
                {copiedCmd === "cmd1" ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Command</span>
                  </>
                )}
              </button>
            </div>
            <div className="bg-slate-950/80 p-2.5 rounded-lg border border-white/5 font-mono text-xs text-cyan-300 flex items-center justify-between">
              <span>npm run build:win</span>
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-[11px] font-bold flex items-center justify-center">
                  2
                </span>
                <span className="text-xs font-semibold text-white">
                  Ya `build-windows.bat` file par double-click karein
                </span>
              </div>
              <button
                onClick={() => copyToClipboard("./build-windows.bat", "cmd2")}
                className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 px-2.5 py-1 rounded-lg border border-cyan-500/20 transition-all"
              >
                {copiedCmd === "cmd2" ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Script Name</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Project root folder me <code className="text-cyan-300 bg-slate-950 px-1.5 py-0.5 rounded border border-white/10 font-mono">build-windows.bat</code> script banayi gayi hai. Windows me run karne par automaticaly setup ban jayega.
            </p>
          </div>

          {/* Output Info */}
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div className="text-xs text-emerald-200">
              <p className="font-semibold">Output Executable File Path:</p>
              <p className="font-mono text-[11px] text-emerald-300/90 mt-0.5">
                release/LinkStream LAN Share Setup 1.0.0.exe
              </p>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10 relative z-10">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
