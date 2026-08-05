import React from "react";
import { NetworkInfo } from "../types";
import { Network, Server, Wifi, Cpu, X, ShieldCheck, Check } from "lucide-react";

interface NetworkInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  networkInfo: NetworkInfo | null;
  roomId: string;
}

export const NetworkInfoModal: React.FC<NetworkInfoModalProps> = ({
  isOpen,
  onClose,
  networkInfo,
  roomId,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
            <Network className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">LAN Network Details</h3>
            <p className="text-xs text-slate-400">Local Wi-Fi interfaces & active room</p>
          </div>
        </div>

        <div className="space-y-2 text-xs">
          {/* Hostname & OS */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Server className="w-4 h-4 text-cyan-400" /> Hostname:
            </span>
            <span className="font-mono font-bold text-white">
              {networkInfo?.hostname || "localhost"}
            </span>
          </div>

          {/* Local IP Addresses */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1">
            <span className="text-slate-400 flex items-center gap-1.5 mb-1">
              <Wifi className="w-4 h-4 text-emerald-400" /> Local IPv4 Interfaces:
            </span>
            {networkInfo?.localIps && networkInfo.localIps.length > 0 ? (
              networkInfo.localIps.map((ip, idx) => (
                <div
                  key={idx}
                  className="font-mono text-cyan-300 font-semibold bg-slate-900 px-2.5 py-1 rounded border border-slate-800"
                >
                  http://{ip}:3000
                </div>
              ))
            ) : (
              <span className="font-mono text-slate-400">127.0.0.1</span>
            )}
          </div>

          {/* Encryption & Room Status */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-400" /> Room Security:
            </span>
            <span className="font-mono font-bold text-emerald-400">
              AES-256 E2EE ({roomId})
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
};
