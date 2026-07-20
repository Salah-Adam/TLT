// Recently deleted transactions — restore within 30 days. Online-only.
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { colors } from "../theme";
import { useNetwork } from "../store/useNetwork";
import { listDeleted, recoverDeleted, type DeletedTx } from "../data/deletedTransactions";
import { TxSentence } from "../components/TxSentence";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { syncAll } from "../data/sync";

const daysLeft = (iso: string) => Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000));

export default function DeletedTransactionsScreen() {
  const { t } = useTranslation();
  const online = useNetwork((s) => s.online);
  const [items, setItems] = useState<DeletedTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!online) { setLoading(false); return; }
    setError(false);
    try { setItems(await listDeleted()); }
    catch { setError(true); }
    setLoading(false);
  }, [online]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  const restore = async (tx: DeletedTx) => {
    if (restoring) return;
    setRestoring(tx.id);
    try {
      await recoverDeleted(tx.id);
      setItems((p) => p.filter((x) => x.id !== tx.id)); // optimistic remove
      syncAll().catch(() => {});                        // bring it back into the main list
    } catch (e: any) {
      Alert.alert(t("auth.errorTitle"), e?.message ?? "");
      await load(); // e.g. recovery window expired → refresh the list
    }
    setRestoring(null);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  if (!online) return <EmptyState icon="cloud-offline-outline" title={t("deleted.offlineTitle")} subtitle={t("deleted.offlineHint")} />;
  if (error) return <ErrorState onRetry={load} />;

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.background }}
      data={items}
      keyExtractor={(x) => x.id}
      contentContainerStyle={items.length === 0 ? { flexGrow: 1, justifyContent: "center" } : { paddingBottom: 24 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      ListEmptyComponent={<EmptyState icon="trash-outline" title={t("deleted.empty")} subtitle={t("deleted.emptyHint")} />}
      renderItem={({ item }) => {
        const isIn = item.direction === "in";
        const left = daysLeft(item.permanent_delete_at);
        const when = new Date(item.transacted_at).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
        return (
          <View style={styles.row}>
            <View style={[styles.arrow, { backgroundColor: isIn ? "#DCFCE7" : "#FEE2E2" }]}>
              <Ionicons name={isIn ? "arrow-down" : "arrow-up"} size={17} color={isIn ? "#16A34A" : "#DC2626"} />
            </View>
            <View style={{ flex: 1, marginLeft: 11 }}>
              <TxSentence tx={{ ...item, balance_after: null }} style={styles.sentence} />
              <View style={styles.meta}>
                <Text style={styles.time}>{when}</Text>
                <Text style={[styles.expiry, left <= 5 && { color: colors.error }]}>{t("deleted.autoDeletes", { days: left })}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.restoreBtn} onPress={() => restore(item)} disabled={restoring === item.id} activeOpacity={0.7}>
              {restoring === item.id
                ? <ActivityIndicator size="small" color={colors.primary} />
                : <><Ionicons name="arrow-undo-outline" size={15} color={colors.primary} /><Text style={styles.restoreTxt}>{t("deleted.restore")}</Text></>}
            </TouchableOpacity>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
  row: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 12, paddingHorizontal: 16, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  arrow: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", marginTop: 1 },
  sentence: { fontSize: 14, lineHeight: 20, color: colors.text },
  meta: { flexDirection: "row", alignItems: "center", marginTop: 5, gap: 10 },
  time: { fontSize: 11, color: colors.textSecondary },
  expiry: { fontSize: 11, color: colors.textSecondary },
  restoreBtn: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "center", marginLeft: 8, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  restoreTxt: { fontSize: 13, color: colors.primary, fontWeight: "600" },
});