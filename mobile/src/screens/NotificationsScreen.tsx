// Level 1: the folder inbox — one row per notification type, newest-active on top,
// with a preview of the latest message and an unread-count badge. Tap → open the folder.
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { colors } from "../theme";
import { useNetwork } from "../store/useNetwork";
import { useNotifications } from "../store/useNotifications";
import { readFolders, refreshNotifications, flushPendingReads, type Folder } from "../data/notifications";
import { syncAll } from "../data/sync";
import { EmptyState } from "../components/EmptyState";

function familyIcon(key: string) {
  switch (key) {
    case "transactions": return { name: "swap-horizontal", bg: "#DCFCE7", fg: "#059669" };
    case "alerts": return { name: "alert-circle", bg: "#FEF3C7", fg: "#B45309" };
    case "summaries": return { name: "stats-chart", bg: "#DBEAFE", fg: "#1D4ED8" };
    case "reports": return { name: "document-text", bg: "#D1FAE5", fg: "#059669" };
    default: return { name: "person-circle", bg: "#F1F5F9", fg: "#64748B" };
  }
}

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const nav = useNavigation<any>();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => { setFolders(await readFolders()); setLoading(false); }, []);

  useFocusEffect(useCallback(() => { load(); useNotifications.getState().refresh(); }, [load]));
  useEffect(() => {
    (async () => {
      if (useNetwork.getState().online) { try { await flushPendingReads(); await refreshNotifications(); await load(); } catch {} }
      useNotifications.getState().refresh();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // const doRefresh = useCallback(async () => {
  //   setRefreshing(true);
  //   if (useNetwork.getState().online) { try { await flushPendingReads(); await refreshNotifications(); } catch {} }
  //   await load(); useNotifications.getState().refresh();
  //   setRefreshing(false);
  // }, [load]);

  const doRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await syncAll(); } catch {}
    await load(); useNotifications.getState().refresh();
    setRefreshing(false);
  }, [load]);
  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.background }}
      data={folders}
      keyExtractor={(f) => f.key}
      contentContainerStyle={{ paddingVertical: 6 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={doRefresh} tintColor={colors.primary} />}
      // ListEmptyComponent={<Text style={styles.empty}>{t("notif.empty")}</Text>}
      ListEmptyComponent={<EmptyState icon="notifications-outline" title={t("notif.empty")} subtitle={t("notif.emptyHint")} />}
      renderItem={({ item }) => {
        const ic = familyIcon(item.key);
        const when = new Date(item.latestAt).toLocaleDateString([], { day: "numeric", month: "short" });
        const hasUnread = item.unread > 0;
        return (
          <TouchableOpacity style={styles.row} activeOpacity={0.7}
            onPress={() => nav.navigate("NotifGroup", { family: item.key, title: t(`notif.group_${item.key}`) })}>
            <View style={[styles.avatar, { backgroundColor: ic.bg }]}><Ionicons name={ic.name as any} size={22} color={ic.fg} /></View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.folder, hasUnread && styles.folderUnread]} numberOfLines={1}>{t(`notif.group_${item.key}`)}</Text>
              <Text style={[styles.preview, hasUnread && { color: colors.text }]} numberOfLines={1}>{item.latestBody || item.latestTitle}</Text>
            </View>
            <View style={styles.right}>
              <Text style={styles.when}>{when}</Text>
              {hasUnread ? <View style={styles.badge}><Text style={styles.badgeTxt}>{item.unread}</Text></View> : null}
            </View>
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 16, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  folder: { fontSize: 15, color: colors.text },
  folderUnread: { fontWeight: "700" },
  preview: { fontSize: 13, color: colors.textSecondary, marginTop: 3 },
  right: { alignItems: "flex-end", marginLeft: 10 },
  when: { fontSize: 12, color: colors.textSecondary },
  badge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", paddingHorizontal: 6, marginTop: 6 },
  badgeTxt: { color: "#fff", fontSize: 12, fontWeight: "700" },
  empty: { textAlign: "center", color: colors.textSecondary, marginTop: 40, fontSize: 14 },
});



// // Notifications: date-grouped list, All/Unread filter, optimistic mark-read, mark-all,
// // long-press delete (online-only), tap transaction → TxDetail. Reads from cache (offline-safe).
// import { useCallback, useEffect, useMemo, useState } from "react";
// import {
//   ActivityIndicator, Alert, RefreshControl, SectionList, StyleSheet, Text, TouchableOpacity, View,
// } from "react-native";
// import { useNavigation, useFocusEffect } from "@react-navigation/native";
// import { Ionicons } from "@expo/vector-icons";
// import { useTranslation } from "react-i18next";
// import { colors } from "../theme";
// import { useNetwork } from "../store/useNetwork";
// import { useNotifications } from "../store/useNotifications";
// import {
//   readNotifications, refreshNotifications, flushPendingReads, markRead, markAllRead, deleteNotification, type Notif,
// } from "../data/notifications";

// const dkey = (iso: string) => { const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };


// function iconFor(type: string) {
//   switch (type) {
//     case "transaction_received": return { name: "arrow-down", bg: "#DCFCE7", fg: "#16A34A" };
//     case "transaction_sent": return { name: "arrow-up", bg: "#FEE2E2", fg: "#DC2626" };
//     case "spending_alert": return { name: "alert-circle", bg: "#FEF3C7", fg: "#B45309" };
//     case "daily_summary":
//     case "weekly_summary":
//     case "monthly_summary": return { name: "stats-chart", bg: "#DBEAFE", fg: "#1D4ED8" };
//     case "report_ready": return { name: "document-text", bg: "#D1FAE5", fg: "#059669" };
//     case "trial_ending": return { name: "time", bg: "#FEF3C7", fg: "#B45309" };
//     default: return { name: "person-circle", bg: "#F1F5F9", fg: "#64748B" };
//   }
// }

// function familyOf(type: string): string {
//   if (type === "transaction_received" || type === "transaction_sent") return "transactions";
//   if (type === "spending_alert") return "alerts";
//   if (type.endsWith("_summary")) return "summaries";
//   if (type === "report_ready") return "reports";
//   return "account"; // account, trial_ending, anything else
// }

// export default function NotificationsScreen() {
//   const { t } = useTranslation();
//   const nav = useNavigation<any>();
//   const online = useNetwork((s) => s.online);

//   const [items, setItems] = useState<Notif[]>([]);
//   const [filter, setFilter] = useState<"all" | "unread">("all");
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);

//   const load = useCallback(async () => {
//     setItems(await readNotifications({ unreadOnly: filter === "unread" }));
//     setLoading(false);
//   }, [filter]);

//   useFocusEffect(useCallback(() => { load(); useNotifications.getState().refresh(); }, [load]));
//   useEffect(() => {
//     (async () => {
//       if (useNetwork.getState().online) { try { await flushPendingReads(); await refreshNotifications(); await load(); } catch {} }
//       useNotifications.getState().refresh();
//     })();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   const doRefresh = useCallback(async () => {
//     setRefreshing(true);
//     if (useNetwork.getState().online) { try { await flushPendingReads(); await refreshNotifications(); } catch {} }
//     await load(); useNotifications.getState().refresh();
//     setRefreshing(false);
//   }, [load]);

//   const onTap = async (n: Notif) => {
//     if (!n.is_read) {
//       await markRead(n.id, useNetwork.getState().online);
//       setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
//       useNotifications.getState().refresh();
//     }
//     if ((n.type === "transaction_received" || n.type === "transaction_sent") && n.data?.transactionId) {
//       nav.navigate("Transactions", { screen: "TxDetail", params: { id: String(n.data.transactionId) } });
//     }
//   };

//   const onLongPress = (n: Notif) => {
//     if (!useNetwork.getState().online) { Alert.alert(t("notif.offlineDelete")); return; }
//     Alert.alert(t("notif.deleteTitle"), t("notif.deleteBody"), [
//       { text: t("tx.cancel"), style: "cancel" },
//       { text: t("notif.delete"), style: "destructive", onPress: async () => {
//         try { await deleteNotification(n.id); setItems((prev) => prev.filter((x) => x.id !== n.id)); useNotifications.getState().refresh(); }
//         catch (e: any) { Alert.alert(t("auth.errorTitle"), e?.message ?? ""); }
//       } },
//     ]);
//   };

//   const onMarkAll = async () => {
//     await markAllRead(useNetwork.getState().online);
//     setItems((prev) => prev.map((x) => ({ ...x, is_read: true })));
//     useNotifications.getState().refresh();
//   };

//   // const sections = useMemo(() => {
//   //   const todayY = dkey(new Date().toISOString());
//   //   const yd = new Date(); yd.setDate(yd.getDate() - 1); const yestY = dkey(yd.toISOString());
//   //   const map = new Map<string, Notif[]>();
//   //   for (const n of items) { const k = dkey(n.sent_at); if (!map.has(k)) map.set(k, []); map.get(k)!.push(n); }
//   //   return Array.from(map.entries()).map(([k, data]) => ({
//   //     title: k === todayY ? t("tx.today") : k === yestY ? t("tx.yesterday") : new Date(k + "T00:00:00").toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" }),
//   //     data,
//   //   }));
//   // }, [items, t]);
//   const sections = useMemo(() => {
//     const map = new Map<string, Notif[]>();
//     for (const n of items) { const k = familyOf(n.type); if (!map.has(k)) map.set(k, []); map.get(k)!.push(n); }
//     const arr = Array.from(map.entries()).map(([key, data]) => ({
//       title: t(`notif.group_${key}`),
//       latest: data.reduce((m, n) => (n.sent_at > m ? n.sent_at : m), ""),
//       data, // already newest-first from the query
//     }));
//     arr.sort((a, b) => (a.latest < b.latest ? 1 : -1)); // the group with the most recent notification goes to the top
//     return arr;
//   }, [items, t]);

//   const anyUnread = items.some((n) => !n.is_read);

//   if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;

//   return (
//     <View style={{ flex: 1, backgroundColor: colors.background }}>
//       <View style={styles.toolbar}>
//         <View style={styles.segment}>
//           {(["all", "unread"] as const).map((f, i) => (
//             <TouchableOpacity key={f} onPress={() => setFilter(f)} style={[styles.segBtn, i > 0 && styles.segDivider, filter === f && styles.segActive]}>
//               <Text style={[styles.segTxt, filter === f && styles.segTxtActive]}>{t(`notif.${f}`)}</Text>
//             </TouchableOpacity>
//           ))}
//         </View>
//         <TouchableOpacity onPress={onMarkAll} disabled={!anyUnread} hitSlop={8}>
//           <Text style={[styles.markAll, !anyUnread && { color: colors.textSecondary }]}>{t("notif.markAll")}</Text>
//         </TouchableOpacity>
//       </View>

//       <SectionList
//         sections={sections}
//         keyExtractor={(n) => n.id}
//         stickySectionHeadersEnabled={false}
//         contentContainerStyle={{ paddingBottom: 24 }}
//         renderSectionHeader={({ section }) => <Text style={styles.secHead}>{section.title}</Text>}
//         renderItem={({ item }) => <NotifRow n={item} onPress={() => onTap(item)} onLongPress={() => onLongPress(item)} />}
//         refreshControl={<RefreshControl refreshing={refreshing} onRefresh={doRefresh} tintColor={colors.primary} />}
//         ListEmptyComponent={<Text style={styles.empty}>{filter === "unread" ? t("notif.emptyUnread") : t("notif.empty")}</Text>}
//       />
//     </View>
//   );
// }

// function NotifRow({ n, onPress, onLongPress }: { n: Notif; onPress: () => void; onLongPress: () => void }) {
//   const ic = iconFor(n.type);
//   const time = new Date(n.sent_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

//   const when = new Date(n.sent_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

//   return (
//     <TouchableOpacity style={[styles.row, !n.is_read && styles.rowUnread]} onPress={onPress} onLongPress={onLongPress} delayLongPress={350} activeOpacity={0.7}>
//       <View style={[styles.icon, { backgroundColor: ic.bg }]}><Ionicons name={ic.name as any} size={18} color={ic.fg} /></View>
//       <View style={{ flex: 1, marginLeft: 11 }}>
//         <Text style={[styles.title, !n.is_read && styles.titleUnread]} numberOfLines={1}>{n.title}</Text>
//         {/* <Text style={styles.body} numberOfLines={2}>{n.body}</Text> */}
//         <Text style={styles.body}>{n.body}</Text>
//         <Text style={styles.time}>{time}</Text>

//         <Text style={styles.time}>{when}</Text>

//       </View>
//       {!n.is_read ? <View style={styles.dot} /> : null}
//     </TouchableOpacity>
//   );
// }

// const styles = StyleSheet.create({
//   center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
//   toolbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
//   segment: { flexDirection: "row", height: 34, borderRadius: 999, borderWidth: 1, borderColor: colors.border, overflow: "hidden", backgroundColor: colors.surface },
//   segBtn: { paddingHorizontal: 16, justifyContent: "center" },
//   segDivider: { borderLeftWidth: 1, borderLeftColor: colors.border },
//   segActive: { backgroundColor: colors.primary },
//   segTxt: { fontSize: 13, color: colors.textSecondary },
//   segTxtActive: { color: "#fff", fontWeight: "600" },
//   markAll: { fontSize: 13, color: colors.primary, fontWeight: "600" },
//   secHead: { fontSize: 12, fontWeight: "600", color: colors.textSecondary, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 },
//   row: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 12, paddingHorizontal: 16, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
//   rowUnread: { backgroundColor: "#F0FDF4", borderLeftWidth: 3, borderLeftColor: colors.primary },
//   icon: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", marginTop: 2 },
//   title: { fontSize: 14, color: colors.text },
//   titleUnread: { fontWeight: "700" },
//   body: { fontSize: 13, color: colors.textSecondary, marginTop: 2, lineHeight: 18 },
//   time: { fontSize: 11, color: colors.textSecondary, marginTop: 4 },
//   dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primary, marginLeft: 8, marginTop: 6 },
//   empty: { textAlign: "center", color: colors.textSecondary, marginTop: 40, fontSize: 14 },
// });