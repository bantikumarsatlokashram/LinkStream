import React from "react";
import { NotificationAlert } from "../types";
import { Info, CheckCircle, AlertTriangle, XCircle, X } from "lucide-react";

interface ToastContainerProps {
  toasts: NotificationAlert[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onDismiss,
}) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const getIcon = () => {
          switch (toast.type) {
            case "success":
              return <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />;
            case "error":
              return <XCircle className="w-5 h-5 text-rose-400 shrink-0" />;
            case "warning":
              return <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />;
            default:
              return <Info className="w-5 h-5 text-cyan-400 shrink-0" />;
          }
        };

        const getBorderColor = () => {
          switch (toast.type) {
            case "success":
              return "border-emerald-500/30 bg-emerald-950/80";
            case "error":
              return "border-rose-500/30 bg-rose-950/80";
            case "warning":
              return "border-amber-500/30 bg-amber-950/80";
            default:
              return "border-cyan-500/30 bg-slate-900/90";
          }
        };

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto border rounded-xl p-3.5 shadow-2xl backdrop-blur-md flex items-start gap-3 transition-all animate-in slide-in-from-bottom-2 ${getBorderColor()}`}
          >
            {getIcon()}
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-white">{toast.title}</h4>
              <p className="text-[11px] text-slate-300 mt-0.5">{toast.message}</p>
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="text-slate-400 hover:text-white p-0.5 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
