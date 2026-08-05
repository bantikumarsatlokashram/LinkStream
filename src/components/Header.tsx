import React, { useState } from "react";
import {
  Wifi,
  WifiOff,
  Volume2,
  VolumeX,
  Laptop,
  Smartphone,
  Tablet,
  Edit2,
  Check,
  Zap,
  Network,
} from "lucide-react";
import { soundManager } from "../lib/audio";
import { NetworkInfo } from "../types";

interface HeaderProps {
  isConnected: boolean;
  roomId: string;
  deviceName: string;
  deviceType: "desktop" | "mobile" | "tablet";
  onUpdateDeviceName: (name: string) => void;
  onOpenNetworkModal: () => void;
  networkInfo: NetworkInfo | null;
}

export const Header: React.FC<HeaderProps> = ({
  isConnected,
  roomId,
  deviceName,
  deviceType,
  onUpdateDeviceName,
  onOpenNetworkModal,
  networkInfo,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(deviceName);
  const [soundEnabled, setSoundEnabled] = useState(soundManager.isSoundEnabled());

  const handleSaveName = () => {
    if (nameInput.trim()) {
      onUpdateDeviceName(nameInput.trim());
    }
    setIsEditingName(false);
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundManager.setSoundEnabled(next);
  };

  const getDeviceIcon = () => {
    switch (deviceType) {
      case "mobile":
        return <Smartphone className="w-4 h-4 text-indigo-400" />;
      case "tablet":
        return <Tablet className="w-4 h-4 text-indigo-400" />;
      default:
        return <Laptop className="w-4 h-4 text-indigo-400" />;
    }
  };

  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/5 border-b border-white/10 text-white px-4 py-3 shadow-2xl">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Logo & LAN Status */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Network className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xl tracking-tight text-white">
                  LinkStream
                </span>
                <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-white/10">
                  Local Only
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Fastest File Transfer app</span>
              </p>
            </div>
          </div>

          {/* Connection Pill */}
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenNetworkModal}
              title="Click to view LAN network info"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                isConnected
                  ? "bg-indigo-500/10 text-emerald-400 border-indigo-500/20 hover:bg-indigo-500/20"
                  : "bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20"
              }`}
            >
              {isConnected ? (
                <>
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                  <Wifi className="w-3.5 h-3.5" />
                  <span className="font-mono text-emerald-400">LAN Active</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 animate-pulse" />
                  <span>Connecting...</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right: Device Name + Sound */}
        <div className="flex items-center justify-end gap-2 w-full md:w-auto flex-wrap">
          {/* Device Name Chip */}
          <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-200">
            {getDeviceIcon()}
            {isEditingName ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="bg-slate-950 text-white px-2 py-0.5 rounded border border-indigo-500/50 outline-none w-28 text-xs"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                />
                <button
                  onClick={handleSaveName}
                  className="p-1 hover:bg-white/10 text-emerald-400 rounded"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="font-medium max-w-[120px] truncate">{deviceName}</span>
                <button
                  onClick={() => { setNameInput(deviceName); setIsEditingName(true); }}
                  className="text-slate-400 hover:text-indigo-400 p-0.5 rounded transition-colors"
                  title="Change device name"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Mute/Sound Toggle */}
          <button
            onClick={toggleSound}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors"
            title={soundEnabled ? "Mute alert sounds" : "Enable alert sounds"}
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-indigo-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-400" />
            )}
          </button>
        </div>
      </div>

    </header>
  );
};

