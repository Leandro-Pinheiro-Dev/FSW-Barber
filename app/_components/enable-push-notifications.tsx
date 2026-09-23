"use client";

import { useState } from "react";

export default function EnablePushNotifications() {
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(false);

  const enableNotifications = async () => {
    try {
      setLoading(true);

      if (
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        alert("Seu navegador não suporta notificações push.");
        return;
      }

      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        alert("As notificações não foram autorizadas.");
        return;
      }

      const registration = await navigator.serviceWorker.ready;

      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

      if (!vapidPublicKey) {
        throw new Error("NEXT_PUBLIC_VAPID_PUBLIC_KEY não configurada.");
      }

      const applicationServerKey = urlBase64ToArrayBuffer(vapidPublicKey);

      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });
      }

      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(subscription),
      });

      if (!response.ok) {
        throw new Error("Não foi possível salvar a inscrição.");
      }

      setEnabled(true);

      alert("Notificações ativadas com sucesso! 🔔");
    } catch (error) {
      console.error("Erro ao ativar notificações:", error);

      alert("Não foi possível ativar as notificações.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={enableNotifications}
      disabled={loading || enabled}
      className="rounded-md border px-4 py-2 text-sm font-medium"
    >
      {loading
        ? "Ativando..."
        : enabled
          ? "Notificações ativadas ✓"
          : "Ativar notificações 🔔"}
    </button>
  );
}

function urlBase64ToArrayBuffer(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);

  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);

  const bytes = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i++) {
    bytes[i] = rawData.charCodeAt(i);
  }

  return bytes.buffer;
}
