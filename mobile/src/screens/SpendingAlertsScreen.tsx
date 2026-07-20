// The spending-alerts list: a card per budget with a sentence, a traffic-light progress bar,
// and an on/off switch. Tap a card to edit; ＋ to create. Network-first (offline read-only).
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { colors } from "../theme";
import { useNetwork } from "../store/useNetwork";
import { readAlerts, updateAlert, type SpendingAlert } from "../data/spendingAlerts";

const money = (n: number) => "$" + (n ?? 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
function barColor(percent: number, threshold: number) {
  if (percent >= 100) return colors.error;
  if (percent >= threshold) return colors.warning;
  return colors.success;
}

export default function SpendingAlertsScreen() {
  const { t } = useTranslation();
  const nav = useNavigation<any>();
  const [items, setItems] = useState<SpendingAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => { setItems(await readAlerts()); setLoading(false); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const doRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  useEffect(() => {
    nav.setOptions({
      headerRight: () => (
        <TouchableOpacity hitSlop={10} onPress={() => nav.navigate("AlertForm")}>
          <Ionicons name="add" size={26} color={colors.primary} />
        </TouchableOpacity>
      ),
    });
  }, [nav]);

  const onToggle = async (a: SpendingAlert, next: boolean) => {
    if (!useNetwork.getState().online) { Alert.alert(t("alerts.offlineAction")); return; }
    setItems((p) => p.map((x) => (x.id === a.id ? { ...x, is_active: next } : x))); // optimistic
    try { await updateAlert(a.id, { isActive: next }); }
    catch (e: any) { setItems((p) => p.map((x) => (x.id === a.id ? { ...x, is_active: !next } : x))); Alert.alert(t("auth.errorTitle"), e?.message ?? ""); }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.background }}
      data={items}
      keyExtractor={(a) => a.id}
      contentContainerStyle={{ padding: 16, paddingBottom: 28, flexGrow: 1 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={doRefresh} tintColor={colors.primary} />}
      ListEmptyComponent={
        <View style={styles.emptyWrap}>
          <Ionicons name="alert-circle-outline" size={40} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>{t("alerts.empty")}</Text>
          <Text style={styles.emptyHint}>{t("alerts.emptyHint")}</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => nav.navigate("AlertForm")}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.addTxt}>{t("alerts.addAlert")}</Text>
          </TouchableOpacity>
        </View>
      }
      renderItem={({ item }) => {
        const pct = item.progress?.percent ?? 0;
        const spent = item.progress?.spent ?? 0;
        const over = spent > item.limit_amount;
        const periodPhrase = item.period === "weekly" ? t("alerts.periodWeek") : t("alerts.periodMonth");
        const fill = `${Math.min(pct, 100)}%` as `${number}%`;
        return (
          <TouchableOpacity style={[styles.card, !item.is_active && { opacity: 0.55 }]} activeOpacity={0.7}
            // onPress={() => nav.navigate("AlertForm", { alert: item })}>
            onPress={() => nav.navigate("SpendingAlertDetail", { alert: item })}>
            <View style={styles.top}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cat} numberOfLines={1}>{item.category.name}{item.phone_number ? ` · ${item.phone_number.replace(/^252/, "")}` : ""}</Text>
                <Text style={styles.sentence}>{t("alerts.progress", { spent: money(spent), limit: money(item.limit_amount), period: periodPhrase })}</Text>
              </View>
              <Switch value={item.is_active} onValueChange={(v) => onToggle(item, v)} trackColor={{ true: colors.primary, false: "#CBD5E1" }} thumbColor="#fff" />
            </View>
            <View style={styles.track}><View style={[styles.fill, { width: fill, backgroundColor: barColor(pct, item.alert_threshold) }]} /></View>
            <View style={styles.bottom}>
              <Text style={styles.pct}>{t("alerts.percentUsed", { percent: pct })}</Text>
              {over ? <Text style={styles.over}>{t("alerts.over", { amount: money(spent - item.limit_amount) })}</Text> : null}
            </View>
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16, marginBottom: 12 },
  top: { flexDirection: "row", alignItems: "center" },
  cat: { fontSize: 15, fontWeight: "600", color: colors.text },
  sentence: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  track: { height: 10, backgroundColor: "#F1F5F9", borderRadius: 6, overflow: "hidden", marginTop: 12 },
  fill: { height: "100%", borderRadius: 6 },
  bottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  pct: { fontSize: 12, color: colors.textSecondary },
  over: { fontSize: 12, color: colors.error, fontWeight: "600" },
  emptyWrap: { alignItems: "center", justifyContent: "center", flex: 1, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: colors.text, marginTop: 14, textAlign: "center" },
  emptyHint: { fontSize: 13, color: colors.textSecondary, marginTop: 6, textAlign: "center" },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 18, marginTop: 20 },
  addTxt: { color: "#fff", fontSize: 15, fontWeight: "600" },
});