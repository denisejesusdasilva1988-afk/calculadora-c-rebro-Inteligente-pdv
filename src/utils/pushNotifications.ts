/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Gerenciador centralizado de Notificações Push (Foco: Supermercados, Mercadinhos & Ofertas).
 */

export type PushPermissionState = "granted" | "denied" | "default" | "unsupported";

export function getPushPermissionState(): PushPermissionState {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission as PushPermissionState;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function requestAndSubscribeToPush(): Promise<{
  permission: PushPermissionState;
  subscribedToServer: boolean;
}> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return { permission: "unsupported", subscribedToServer: false };
  }

  let permission: PushPermissionState = Notification.permission as PushPermissionState;
  if (permission === "default") {
    permission = (await Notification.requestPermission()) as PushPermissionState;
  }

  if (permission !== "granted") {
    try {
      localStorage.setItem("push_notifications_enabled", "false");
    } catch {}
    return { permission, subscribedToServer: false };
  }

  try {
    localStorage.setItem("push_notifications_enabled", "true");
    localStorage.setItem("push_supermercados_enabled", "true");
  } catch {}

  let subscribedToServer = false;

  if ("serviceWorker" in navigator && "PushManager" in window) {
    try {
      const registration = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500)),
      ]);

      if (registration) {
        try {
          const vapidRes = await fetch("/api/push/vapid-public-key", { cache: "no-store" });
          if (vapidRes.ok) {
            const { publicKey } = await vapidRes.json();
            if (publicKey) {
              let subscription = await registration.pushManager.getSubscription();
              if (!subscription) {
                subscription = await registration.pushManager.subscribe({
                  userVisibleOnly: true,
                  applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as BufferSource,
                });
              }

              const saveRes = await fetch("/api/push/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  subscription,
                  topics: ["supermercados", "mercadinhos", "encartes", "ofertas"],
                }),
              });
              subscribedToServer = saveRes.ok;
            }
          }
        } catch {
          // Fallback silencioso caso rodando em hospedagem estática (Netlify) sem backend Node
        }

        // Notificação local de boas-vindas confirmando ativação
        try {
          if (typeof registration.showNotification === "function") {
            await registration.showNotification("Calculadora Cérebro PDV • Ofertas Ativas! 🔔", {
              body: "Você receberá avisos de anúncios e encartes de supermercados e mercadinhos do bairro!",
              icon: "/icon-192.png",
              badge: "/icon-192.png",
              data: { url: "/?shortcut=encartes" },
            });
          }
        } catch {
          // ignore if blocked in iframe
        }
      }
    } catch {
      // ignore SW edge cases
    }
  }

  return { permission: "granted", subscribedToServer };
}
