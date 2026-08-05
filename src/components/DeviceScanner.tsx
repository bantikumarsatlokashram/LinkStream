import React, { useState } from "react";
import {
  Monitor,
  Smartphone,
  Tablet,
  Laptop,
  Radio,
  Lock,
  KeyRound,
  Users,
  CheckCircle2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Peer } from "../types";

interface DeviceScannerProps {
  peers: Peer[];
  currentPeerId: string;
  selectedPeerId: string | null;
  onSelectPeer: (peerId: string | null) => void;
  roomId: string;
  onJoinRoom: (newRoomId: string) => void;
}

export const DeviceScanner: React.FC<DeviceScannerProps> = ({
  peers,
  currentPeerId,
  selectedPeerId,
  onSelectPeer,
  roomId,
  onJoinRoom,
}) => {
  const [roomInput, setRoomInput] = useState(roomId);
  const [isChangingRoom, setIsChangingRoom] = useState(false);

  const handleRoomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomInput.trim()) {
      onJoinRoom(roomInput.trim().toUpperCase());
      setIsChangingRoom(false);
    }
  };

  const getOsBadge = (os: string) => {
    switch (os) {
      case "windows":
        return "Windows";
      case "macos":
        return "macOS";
      case "linux":
        return "Linux";
      case "android":
        return "Android";
      case "ios":
        return "iOS";
      default:
        return "Device";
    }
  };

  const getDeviceIcon = (deviceType: string, os: string) => {
    if (deviceType === "mobile" || os === "android" || os === "ios") {
      return <Smartphone className="w-6 h-6 text-cyan-400" />;
    }
    if (deviceType === "tablet") {
      return <Tablet className="w-6 h-6 text-cyan-400" />;
    }
    if (os === "macos" || os === "windows" || os === "linux") {
      return <Laptop className="w-6 h-6 text-cyan-400" />;
    }
    return <Monitor className="w-6 h-6 text-cyan-400" />;
  };

  const otherPeers = peers.filter((p) => p.id !== currentPeerId);

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-indigo-400 animate-pulse" />
            <h2 className="text-base font-bold text-white uppercase tracking-wider">
              Active Nodes
            </h2>
            <span className="bg-white/10 text-slate-300 text-xs px-2.5 py-0.5 rounded-full font-medium border border-white/10 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              {otherPeers.length} {otherPeers.length === 1 ? "Node" : "Nodes"} Online
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Devices synchronized across local network mesh
          </p>
        </div>

        {/* Room Code Selector */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {isChangingRoom ? (
            <form onSubmit={handleRoomSubmit} className="flex items-center gap-1.5 w-full">
              <input
                type="text"
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value)}
                placeholder="Room PIN"
                className="bg-slate-950 border border-indigo-500/50 text-white text-xs px-3 py-1.5 rounded-xl outline-none uppercase font-mono tracking-wider w-28"
                autoFocus
              />
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3.5 py-1.5 rounded-xl transition-colors shadow-lg shadow-indigo-600/20"
              >
                Join
              </button>
              <button
                type="button"
                onClick={() => setIsChangingRoom(false)}
                className="text-xs text-slate-400 hover:text-white px-2 py-1.5"
              >
                Cancel
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5">
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              <div className="text-xs">
                <span className="text-slate-400 mr-1">Room:</span>
                <span className="font-mono font-bold text-indigo-300 uppercase tracking-wider">
                  {roomId}
                </span>
              </div>
              <button
                onClick={() => {
                  setRoomInput(roomId);
                  setIsChangingRoom(true);
                }}
                className="text-[11px] text-indigo-400 hover:underline ml-1 font-medium"
              >
                Change
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Peers Discovery Grid */}
      {otherPeers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 px-4 text-center border-2 border-dashed border-white/20 rounded-2xl bg-white/5 backdrop-blur-md">
          <div className="w-12 h-12 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center mb-3">
            <Radio className="w-6 h-6 text-indigo-400 animate-ping" />
          </div>
          <h3 className="text-sm font-bold text-white">
            Scanning Local Network Mesh...
          </h3>
          <p className="text-xs text-slate-400 max-w-md mt-1 mb-4">
            Open <span className="text-indigo-300 font-mono font-medium">LinkStream</span> on another laptop, desktop, or mobile connected to the same WiFi or room (<span className="text-amber-300 font-mono">{roomId}</span>).
          </p>
          <div className="flex items-center gap-2 text-[11px] text-slate-400 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Tip: Pair mobile devices instantly via QR code</span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Target All Peers Option */}
          <div
            onClick={() => onSelectPeer(null)}
            className={`cursor-pointer p-3.5 rounded-xl border transition-all flex items-center justify-between ${
              selectedPeerId === null
                ? "bg-white/10 border-indigo-500/50 shadow-lg shadow-indigo-500/10"
                : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                <Users className="w-5 h-5 text-indigo-300" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Broadcast to All</h4>
                <p className="text-[11px] text-slate-400">
                  Send to all {otherPeers.length} active nodes
                </p>
              </div>
            </div>
            {selectedPeerId === null && (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            )}
          </div>

          {/* Individual Peer Cards */}
          {otherPeers.map((peer) => {
            const isSelected = selectedPeerId === peer.id;
            return (
              <div
                key={peer.id}
                onClick={() => onSelectPeer(peer.id)}
                className={`cursor-pointer p-3.5 rounded-xl border transition-all flex items-center justify-between group ${
                  isSelected
                    ? "bg-white/10 border-indigo-500/50 shadow-lg shadow-indigo-500/10"
                    : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center group-hover:border-indigo-500/40 transition-colors">
                      {getDeviceIcon(peer.deviceType, peer.os)}
                    </div>
                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-bold text-white truncate max-w-[120px]">
                        {peer.deviceName}
                      </h4>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-medium">
                        {getOsBadge(peer.os)}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                      {peer.ip.replace("::ffff:", "")}
                    </p>
                  </div>
                </div>

                {isSelected && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 ml-2" />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Security Banner Footer */}
      <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-emerald-400" />
          <span>AES-256 Direct E2EE Sync Active</span>
        </div>
        <span className="text-slate-500 hidden sm:inline">
          3 Devices Synchronized Across LAN
        </span>
      </div>
    </div>
  );
};
