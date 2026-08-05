import React, { useEffect, useRef } from "react";
import QRCode from "qrcode";
import { QrCode, Copy, Check, ExternalLink, Wifi, Smartphone, X } from "lucide-react";
import { NetworkInfo } from "../types";

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  networkInfo: NetworkInfo | null;
  roomId: string;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  onClose,
  networkInfo,
  roomId,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = React.useState(false);

  // Compute pairing URL
  const localIp = networkInfo?.localIps?.[0] || window.location.hostname;
  const port = window.location.port ? `:${window.location.port}` : "";
  const pairingUrl = `${window.location.protocol}//${localIp}${port}?room=${roomId}`;

  useEffect(() => {
    if (isOpen && canvasRef.current) {
      QRCode.toCanvas(
        canvasRef.current,
        pairingUrl,
        {
          width: 220,
          margin: 2,
          color: {
            dark: "#0f172a",
            light: "#ffffff",
          },
        },
        (error) => {
          if (error) console.error("QR generation error:", error);
        }
      );
    }
  }, [isOpen, pairingUrl]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(pairingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-1">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto mb-2">
            <QrCode className="w-5 h-5 text-cyan-400" />
          </div>
          <h3 className="text-base font-bold text-white">Scan to Pair Device</h3>
          <p className="text-xs text-slate-400">
            Point your smartphone camera to connect instantly on the same WiFi
          </p>
        </div>

        {/* QR Code Canvas */}
        <div className="flex justify-center p-3 bg-white rounded-2xl border border-slate-800 shadow-inner">
          <canvas ref={canvasRef} className="rounded-lg" />
        </div>

        {/* Pairing URL & Copy */}
        <div className="space-y-2">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between">
            <span className="text-xs font-mono text-cyan-300 truncate mr-2">
              {pairingUrl}
            </span>
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors shrink-0"
              title="Copy URL"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-cyan-400" />
              )}
            </button>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-400 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
            <Wifi className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>Ensure both mobile and desktop are connected to the same local WiFi network.</span>
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
