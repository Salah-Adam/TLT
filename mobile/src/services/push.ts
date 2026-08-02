// expo-notifications wiring: permission, Android channel, FCM token registration, foreground
// receipt, tap deep-link, and token-refresh. Android-only for now (iOS deferred).
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { api } from "../api/client";
import { useNotifications } from "../store/useNotifications";
import { navigateFromPush } from "../navigation/navRef";
import { syncAll } from "../data/sync";
import { markRead } from "../data/notifications";
import { useNetwork } from "../store/useNetwork";
import { useUnreadTx } from "../store/useUnreadTx";

// Foreground: still show a banner + list entry.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false,
  }),
});

async function sendToken(token: string): Promise<void> {
  try { await api.post("/api/v1/users/me/devices", { token, platform: Platform.OS }); } catch {}
}

// Ask permission, ensure a channel, grab the raw FCM token, register it with the server.
export async function registerPush(): Promise<void> {
  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "TLT", importance: Notifications.AndroidImportance.HIGH,
      });
    }
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== "granted") return;

    const token = await Notifications.getDevicePushTokenAsync(); // Android → raw FCM token
    await sendToken(String(token.data));
  } catch { /* best-effort; never block the app */ }
}

// Foreground receipt + tap handling + token refresh. Returns an unsubscribe.
export function initPushListeners(): () => void {
  const onReceive = Notifications.addNotificationReceivedListener(async () => {
  try { await syncAll(); } catch {}
    useNotifications.getState().refresh();
    useUnreadTx.getState().refresh();     // ← add
  });
  // const onReceive = Notifications.addNotificationReceivedListener(async () => {
  //   try { await syncAll(); } catch {}
  //   useNotifications.getState().refresh();
  // });

  const onTap = Notifications.addNotificationResponseReceivedListener((resp) => {
    handlePushTap((resp.notification.request.content.data ?? {}) as Record<string, any>);
  });
  const onTokenChange = Notifications.addPushTokenListener((t) => { sendToken(String(t.data)); });

  const last = Notifications.getLastNotificationResponse();
  if (last) handlePushTap((last.notification.request.content.data ?? {}) as Record<string, any>);

  return () => { onReceive.remove(); onTap.remove(); onTokenChange.remove(); };
}

async function handlePushTap(data: Record<string, any>): Promise<void> {
  const notifId = data?.notificationId;
  if (notifId) {
    try { await markRead(String(notifId), useNetwork.getState().online); } catch {}
    useNotifications.getState().refresh();
  }
  navigateFromPush(data);
}