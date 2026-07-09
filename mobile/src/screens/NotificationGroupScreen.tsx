// Level 2: one folder's thread — full messages, newest-first. Opening marks the folder read.
// Transaction messages open TxDetail; others just show full text. Long-press = delete (online-only).
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { colors } from "../theme";
import { useNetwork } from "../store/useNetwork";
import { useNotifications } from "../store/useNotifications";
import { readByFamily, markFamilyRead, refreshNotifications, flushPendingReads, deleteNotification, type Notif, type Family } from "../data/notifications";
import { syncAll } from "../data/sync";

import { reportParamsFromData } from "../navigation/navRef";

function iconFor(type: string) {
  switch (type) {
    case "transaction_received": return { name: "arrow-down", bg: "#DCFCE7", fg: "#16A34A" };
    case "transaction_sent": return { name: "arrow-up", bg: "#FEE2E2", fg: "#DC2626" };
    case "spending_alert": return { name: "alert-circle", bg: "#FEF3C7", fg: "#B45309" };
    case "daily_summary":
    case "weekly_summary":
    case "monthly_summary": return { name: "stats-chart", bg: "#DBEAFE", fg: "#1D4ED8" };
    case "report_ready": return { name: "document-text", bg: "#D1FAE5", fg: "#059669" };
    case "trial_ending": return { name: "time", bg: "#FEF3C7", fg: "#B45309" };
    default: return { name: "person-circle", bg: "#F1F5F9", fg: "#64748B" };
  }
}

export default function NotificationGroupScreen() {
  const { t } = useTranslation();
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const family: Family = route.params?.family;

  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => { setItems(await readByFamily(family)); setLoading(false); }, [family]);

  useEffect(() => {
    (async () => {
      try { await markFamilyRead(family, useNetwork.getState().online); } catch {}
      await load();
      useNotifications.getState().refresh();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [family]);

//   const doRefresh = useCallback(async () => {
//     setRefreshing(true);
//     if (useNetwork.getState().online) { try { await flushPendingReads(); await refreshNotifications(); } catch {} }
//     await load(); useNotifications.getState().refresh();
//     setRefreshing(false);
//   }, [load]);

  const doRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await syncAll(); } catch {}
    await load(); useNotifications.getState().refresh();
    setRefreshing(false);
  }, [load]);

  // const onTap = (n: Notif) => {
  //   if ((n.type === "transaction_received" || n.type === "transaction_sent") && n.data?.transactionId) {
  //     nav.navigate("Transactions", { screen: "TxDetail", params: { id: String(n.data.transactionId) } });
  //   }
  // };

  const onTap = (n: Notif) => {
    const d = (n.data ?? {}) as Record<string, any>;
    if ((n.type === "transaction_received" || n.type === "transaction_sent") && d.transactionId) {
      nav.navigate("Transactions", { screen: "TxDetail", params: { id: String(d.transactionId) } });
      return;
    }
    if (d.screen === "report" && d.period) {
      nav.navigate("Analytics", { screen: "Report", params: reportParamsFromData(d) });
    }
  };

  const onLongPress = (n: Notif) => {
    if (!useNetwork.getState().online) { Alert.alert(t("notif.offlineDelete")); return; }
    Alert.alert(t("notif.deleteTitle"), t("notif.deleteBody"), [
      { text: t("tx.cancel"), style: "cancel" },
      { text: t("notif.delete"), style: "destructive", onPress: async () => {
        try { await deleteNotification(n.id); setItems((p) => p.filter((x) => x.id !== n.id)); useNotifications.getState().refresh(); }
        catch (e: any) { Alert.alert(t("auth.errorTitle"), e?.message ?? ""); }
      } },
    ]);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.background }}
      data={items}
      keyExtractor={(n) => n.id}
      contentContainerStyle={{ paddingVertical: 6 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={doRefresh} tintColor={colors.primary} />}
      ListEmptyComponent={<Text style={styles.empty}>{t("notif.empty")}</Text>}
      renderItem={({ item }) => {
        const ic = iconFor(item.type);
        const when = new Date(item.sent_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
        const canOpen = (item.type === "transaction_received" || item.type === "transaction_sent") && !!item.data?.transactionId;
        return (
          <TouchableOpacity style={styles.card} activeOpacity={canOpen ? 0.7 : 1} onPress={() => onTap(item)} onLongPress={() => onLongPress(item)} delayLongPress={350}>
            <View style={styles.head}>
              <View style={[styles.icon, { backgroundColor: ic.bg }]}><Ionicons name={ic.name as any} size={16} color={ic.fg} /></View>
              <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
              {canOpen ? <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} /> : null}
            </View>
            <Text style={styles.body}>{item.body}</Text>
            <Text style={styles.time}>{when}</Text>
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
  card: { backgroundColor: colors.surface, marginHorizontal: 12, marginVertical: 5, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 14 },
  head: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  icon: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", marginRight: 9 },
  title: { flex: 1, fontSize: 14, fontWeight: "600", color: colors.text },
  body: { fontSize: 14, color: colors.text, lineHeight: 20 },
  time: { fontSize: 12, color: colors.textSecondary, marginTop: 8 },
  empty: { textAlign: "center", color: colors.textSecondary, marginTop: 40, fontSize: 14 },
});