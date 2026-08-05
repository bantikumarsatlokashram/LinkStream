import React, { useState } from "react";
import { ClipboardItem } from "../types";
import {
  Copy,
  Check,
  Send,
  Share2,
  Trash2,
  Clock,
  Sparkles,
  ExternalLink,
} from "lucide-react";

interface ClipboardSyncProps {
  clipboards: ClipboardItem[];
  onShareClipboard: (text: string) => void;
  onClearClipboards: () => void;
}

export const ClipboardSync: React.FC<ClipboardSyncProps> = ({
  clipboards,
  onShareClipboard,
  onClearClipboards,
}) => {
  const [inputText, setInputText] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleShare = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      onShareClipboard(inputText.trim());
      setInputText("");
    }
  };

  const handleCopy = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const isUrl = (text: string) => {
    try {
      new URL(text);
      return true;
    } catch (_) {
      return false;
    }
  };

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Share2 className="w-5 h-5 text-indigo-400" />
            <span>Cross-Platform LAN Clipboard</span>
          </h3>
          <p className="text-xs text-slate-400">
            Instantly sync links, code snippets, or notes between desktop and mobile devices
          </p>
        </div>

        {clipboards.length > 0 && (
          <button
            onClick={onClearClipboards}
            className="text-slate-400 hover:text-rose-400 text-xs px-2.5 py-1.5 rounded-xl border border-white/10 hover:border-rose-500/30 transition-colors"
          >
            Clear History
          </button>
        )}
      </div>

      {/* Share Input Form */}
      <form onSubmit={handleShare} className="space-y-3 mb-5">
        <div className="relative">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Paste text, URL, code snippet, or note to broadcast to all connected devices..."
            rows={3}
            className="w-full bg-slate-950 border border-white/10 focus:border-indigo-500 rounded-xl p-3 text-xs text-white outline-none resize-none placeholder:text-slate-500"
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Broadcasts in real-time over LAN</span>
          </span>

          <button
            type="submit"
            disabled={!inputText.trim()}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              inputText.trim()
                ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 active:scale-95"
                : "bg-white/10 text-slate-500 cursor-not-allowed border border-white/10"
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Share Text</span>
          </button>
        </div>
      </form>

      {/* Shared Clipboards List */}
      <div className="space-y-2">
        {clipboards.length === 0 ? (
          <div className="text-center py-6 border border-dashed border-white/10 rounded-2xl bg-white/5 backdrop-blur-md">
            <Share2 className="w-6 h-6 text-slate-500 mx-auto mb-1" />
            <p className="text-xs text-slate-400">No shared clipboard items yet</p>
          </div>
        ) : (
          clipboards.map((item) => (
            <div
              key={item.id}
              className="bg-white/5 border border-white/10 rounded-2xl p-3.5 space-y-2 hover:border-white/20 transition-all backdrop-blur-md"
            >
              <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-white/10 pb-1.5">
                <span className="font-bold text-indigo-300">{item.senderName}</span>
                <span className="font-mono text-[10px]">
                  {new Date(item.timestamp).toLocaleTimeString()}
                </span>
              </div>

              <div className="text-xs text-slate-200 font-mono whitespace-pre-wrap break-all max-h-36 overflow-y-auto custom-scrollbar bg-slate-950/80 p-2.5 rounded-xl border border-white/5">
                {item.content}
              </div>

              <div className="flex items-center justify-end gap-2 pt-1 border-t border-white/10">
                {isUrl(item.content) && (
                  <a
                    href={item.content}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-indigo-400 hover:underline flex items-center gap-1 mr-auto"
                  >
                    <ExternalLink className="w-3 h-3" /> Open Link
                  </a>
                )}

                <button
                  onClick={() => handleCopy(item.id, item.content)}
                  className="flex items-center gap-1 bg-white/10 hover:bg-white/20 text-slate-200 border border-white/10 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors"
                >
                  {copiedId === item.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
