// A ref so a tapped push can navigate even from outside React (cold start / background).

import { createNavigationContainerRef } from "@react-navigation/native";

export const navRef = createNavigationContainerRef<any>();

export function reportParamsFromData(data: Record<string, any>) {
  const p: any = { period: data.period };
  if (data.date) p.date = String(data.date);
  if (data.start) p.start = String(data.start);
  if (data.year) p.year = Number(data.year);
  if (data.month) p.month = Number(data.month);
  return p;
}

export function navigateFromPush(data: Record<string, any>, attempt = 0): void {
  if (!navRef.isReady()) { if (attempt < 20) setTimeout(() => navigateFromPush(data, attempt + 1), 150); return; }
  const txId = data?.transactionId;
  if (txId) { navRef.navigate("Transactions", { screen: "TxDetail", params: { id: String(txId) } }); return; }
  if (data?.screen === "report" && data?.period) { navRef.navigate("Analytics", { screen: "Report", params: reportParamsFromData(data) }); return; }
  navRef.navigate("Notifications");
}

// import { createNavigationContainerRef } from "@react-navigation/native";

// export const navRef = createNavigationContainerRef<any>();

// export function navigateFromPush(data: Record<string, any>, attempt = 0): void {
//   if (!navRef.isReady()) { if (attempt < 20) setTimeout(() => navigateFromPush(data, attempt + 1), 150); return; }
//   const txId = data?.transactionId;
//   if (txId) navRef.navigate("Transactions", { screen: "TxDetail", params: { id: String(txId) } });
//   else navRef.navigate("Notifications");
// }