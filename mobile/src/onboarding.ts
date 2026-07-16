// One-time onboarding flags, kept in secure-store so they survive logout (shown once per install).
import * as SecureStore from "expo-secure-store";

const KEYS = {
  intro: "tlt_onb_intro",
  tipHome: "tlt_onb_tip_home",
  tipTx: "tlt_onb_tip_tx",
  tipAnalytics: "tlt_onb_tip_analytics",
} as const;
export type OnbKey = keyof typeof KEYS;

export async function hasSeen(key: OnbKey): Promise<boolean> {
  return (await SecureStore.getItemAsync(KEYS[key])) === "1";
}
export async function markSeen(key: OnbKey): Promise<void> {
  await SecureStore.setItemAsync(KEYS[key], "1");
}