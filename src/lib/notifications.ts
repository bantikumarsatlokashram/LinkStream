import { soundManager } from "./audio";
import { NotificationAlert } from "../types";

export function requestNotificationPermission() {
  if (typeof window !== "undefined" && "Notification" in window) {
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }
  }
}

export function sendLocalNotification(
  title: string,
  options?: {
    body?: string;
    icon?: string;
    type?: "info" | "success" | "warning" | "error";
  }
) {
  const { body, type = "info" } = options || {};

  // 1. Play sound chime
  if (type === "success") {
    soundManager.playSuccessChime();
  } else if (type === "error" || type === "warning") {
    soundManager.playErrorSound();
  } else {
    soundManager.playRequestChime();
  }

  // 2. Native OS / Browser Desktop Notification
  if (
    typeof window !== "undefined" &&
    "Notification" in window &&
    Notification.permission === "granted"
  ) {
    try {
      new Notification(title, {
        body: body || "",
        icon: "/favicon.ico",
        silent: true, // We already play our custom Web Audio sound
      });
    } catch (e) {
      console.warn("Desktop notification error:", e);
    }
  }
}

export function createToast(
  title: string,
  message: string,
  type: "info" | "success" | "warning" | "error" = "info"
): NotificationAlert {
  sendLocalNotification(title, { body: message, type });
  return {
    id: `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    type,
    title,
    message,
    timestamp: Date.now(),
  };
}
