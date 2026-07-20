// Spending-alert detail: budget card (traffic-light bar + on/off) with an edit icon top-right, plus the
// alert's category transactions via the dedicated /spending-alerts/:id/transactions endpoint. The date
// filter is locked to the alert's period; spent/%/bar come from the endpoint summary (same definition as
// the alert bar), so they always reconcile — and the list pages through all matches.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert as RNAlert, FlatList, Modal, Pressable, RefreshControl, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { colors } from "../theme";
import { useNetwork } from "../store/useNetwork";
import { readAlerts, updateAlert, getAlertTransactions, type SpendingAlert, type AlertTxSummary } from "../data/spendingAlerts";
import { type Tx } from "../data/transactions";
import { readSims, simEyebrow, simColor, type Sim } from "../data/phoneNumbers";
import { TxSentence } from "../components/TxSentence";
import { MiniCalendar } from "../components/MiniCalendar";

const money = (n: number) => "$" + (n ?? 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
const barColor = (p: number, thr: number) => (p >= 100 ? colors.error : p >= thr ? colors.warning : colors.success);
const ymd = (s: string) => (s ?? "").slice(0, 10);
const fmtShort = (s: string) => new Date(s + "T00:00:00").toLocaleDateString([], { day: "numeric", month: "short" });

export default function SpendingAlertDetailScreen() {
  const { t } = useTranslation();
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const online = useNetwork((s) => s.online);

  const [alert, setAlert] = useState<SpendingAlert>(route.params?.alert);
  const periodStart = ymd(alert.progress.period_start);
  const periodEnd = ymd(alert.progress.period_end);

  const [from, setFrom] = useState(periodStart);
  const [to, setTo] = useState<string | null>(periodEnd);
  const fullPeriod = from === periodStart && to === periodEnd;

  const [dateModal, setDateModal] = useState(false);
  const [calFrom, setCalFrom] = useState<string | null>(periodStart);
  const [calTo, setCalTo] = useState<string | null>(periodEnd);

  const [sims, setSims] = useState<Sim[]>([]);
  const [items, setItems] = useState<Tx[]>([]);
  const [summary, setSummary] = useState<AlertTxSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const cursorRef = useRef<string | null>(null);
  const hasMoreRef = useRef(false);
  const busyRef = useRef(false);

  useEffect(() => { readSims().then(setSims); }, []);

  useEffect(() => {
    nav.setOptions({
      title: alert?.category?.name ?? t("alerts.title"),
      headerRight: () => (
        <TouchableOpacity hitSlop={10} onPress={() => nav.navigate("AlertForm", { alert })}>
          <Ionicons name="create-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      ),
    });
  }, [nav, alert, t]);

  const loadList = useCallback(async () => {
    if (!useNetwork.getState().online) { setItems([]); setSummary(null); cursorRef.current = null; hasMoreRef.current = false; setLoading(false); return; }
    try {
      const page = await getAlertTransactions(alert.id, { cursor: null, dateFrom: from, dateTo: to ?? from });
      setItems(page.items); setSummary(page.summary ?? null);
      cursorRef.current = page.cursor; hasMoreRef.current = page.hasMore;
    } catch { setItems([]); setSummary(null); }
    setLoading(false);
  }, [alert.id, from, to]);

  const loadMore = useCallback(async () => {
    if (!hasMoreRef.current || busyRef.current || !cursorRef.current) return;
    busyRef.current = true; setLoadingMore(true);
    try {
      const page = await getAlertTransactions(alert.id, { cursor: cursorRef.current, dateFrom: from, dateTo: to ?? from });
      setItems((x) => [...x, ...page.items]); cursorRef.current = page.cursor; hasMoreRef.current = page.hasMore;
    } catch {}
    busyRef.current = false; setLoadingMore(false);
  }, [alert.id, from, to]);

  const refreshCard = useCallback(async () => {
    try { const list = await readAlerts(); const fresh = list.find((a) => a.id === alert.id); if (fresh) setAlert(fresh); } catch {}
  }, [alert.id]);

  useFocusEffect(useCallback(() => { refreshCard(); loadList(); }, [refreshCard, loadList]));
  useEffect(() => { loadList(); }, [from, to]); // eslint-disable-line react-hooks/exhaustive-deps

  const doRefresh = useCallback(async () => { setRefreshing(true); await refreshCard(); await loadList(); setRefreshing(false); }, [refreshCard, loadList]);

  const onToggle = async (next: boolean) => {
    if (!useNetwork.getState().online) { RNAlert.alert(t("alerts.offlineAction")); return; }
    setAlert((a) => ({ ...a, is_active: next }));
    try { await updateAlert(alert.id, { isActive: next }); }
    catch (e: any) { setAlert((a) => ({ ...a, is_active: !next })); RNAlert.alert(t("auth.errorTitle"), e?.message ?? ""); }
  };

  const simMap = useMemo(() => { const m: Record<string, Sim> = {}; sims.forEach((s) => (m[s.id] = s)); return m; }, [sims]);
  const showSim = sims.length >= 2;

  const spent = summary ? summary.spent : (alert.progress?.spent ?? 0);
  const pct = alert.limit_amount > 0 ? Math.round((spent / alert.limit_amount) * 100) : 0;
  const over = spent > alert.limit_amount;
  const periodPhrase = alert.period === "weekly" ? t("alerts.periodWeek") : t("alerts.periodMonth");
  const fill = `${Math.min(pct, 100)}%` as `${number}%`;

  const dateLabel = fullPeriod ? t("alertDetail.fullPeriod")
    : (to && to !== from) ? `${fmtShort(from)} – ${fmtShort(to)}` : fmtShort(from);

  const openDate = () => { setCalFrom(from); setCalTo(to && to !== from ? to : null); setDateModal(true); };
  const applyDate = () => { if (calFrom) { setFrom(calFrom); setTo(calTo ?? calFrom); } setDateModal(false); };
  const resetPeriod = () => { setCalFrom(periodStart); setCalTo(periodEnd); };

  const header = (
    <View>
      <View style={[styles.card, !alert.is_active && { opacity: 0.6 }]}>
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cat} numberOfLines={1}>{alert.category.name}{alert.phone_number ? ` · ${alert.phone_number.replace(/^252/, "")}` : ""}</Text>
            <Text style={styles.cardSentence}>{t("alerts.progress", { spent: money(spent), limit: money(alert.limit_amount), period: fullPeriod ? periodPhrase : dateLabel })}</Text>
          </View>
          <Switch value={alert.is_active} onValueChange={onToggle} trackColor={{ true: colors.primary, false: "#CBD5E1" }} thumbColor="#fff" />
        </View>
        <View style={styles.track}><View style={[styles.fill, { width: fill, backgroundColor: barColor(pct, alert.alert_threshold) }]} /></View>
        <View style={styles.cardBottom}>
          <Text style={styles.pct}>{t("alerts.percentUsed", { percent: pct })}</Text>
          {over ? <Text style={styles.over}>{t("alerts.over", { amount: money(spent - alert.limit_amount) })}</Text> : null}
        </View>
      </View>

      <View style={styles.filterRow}>
        <TouchableOpacity style={[styles.chip, !fullPeriod && styles.chipActive]} onPress={openDate}>
          <Ionicons name="calendar-outline" size={14} color={!fullPeriod ? "#fff" : colors.textSecondary} />
          <Text style={[styles.chipTxt, !fullPeriod && { color: "#fff" }]}>{dateLabel}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.listTitle}>{t("alertDetail.transactions")}</Text>
      {!online ? <Text style={styles.muted}>{t("alerts.offlineAction")}</Text> : null}
    </View>
  );

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <>
      <FlatList
        style={{ flex: 1, backgroundColor: colors.background }}
        data={items}
        keyExtractor={(tx) => tx.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
        ListHeaderComponent={header}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={doRefresh} tintColor={colors.primary} />}
        onEndReachedThreshold={0.4}
        onEndReached={loadMore}
        ListEmptyComponent={online ? <Text style={styles.muted}>{t("alertDetail.empty")}</Text> : null}
        ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginVertical: 16 }} color={colors.primary} /> : null}
        renderItem={({ item }) => {
          const isIn = item.direction === "in";
          const sim = showSim && item.phone_number_id ? simMap[item.phone_number_id] : undefined;
          const accent = sim ? simColor(sim.id) : undefined;
          const time = new Date(item.transacted_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
          return (
            <View style={styles.txRow}>
              <View style={[styles.txIcon, { backgroundColor: isIn ? "#DCFCE7" : "#FEE2E2" }]}>
                <Ionicons name={isIn ? "arrow-down" : "arrow-up"} size={16} color={isIn ? "#16A34A" : "#DC2626"} />
              </View>
              <View style={{ flex: 1, marginLeft: 11 }}>
                <TxSentence tx={item} style={styles.sentence} />
                <View style={styles.meta}>
                  <Text style={styles.time}>{time}</Text>
                  {sim ? (
                    <View style={[styles.simChip, { backgroundColor: accent! + "22" }]}>
                      <View style={[styles.simDot, { backgroundColor: accent }]} />
                      <Text style={[styles.simChipTxt, { color: accent }]} numberOfLines={1}>{simEyebrow(sim)}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>
          );
        }}
      />

      <Modal transparent visible={dateModal} animationType="slide" onRequestClose={() => setDateModal(false)}>
        <Pressable style={styles.backdrop} onPress={() => setDateModal(false)}>
          <Pressable style={styles.sheet}>
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>{t("tx.pickDates")}</Text>
              <TouchableOpacity onPress={resetPeriod}><Text style={styles.reset}>{t("alertDetail.fullPeriod")}</Text></TouchableOpacity>
            </View>
            <MiniCalendar from={calFrom} to={calTo} min={periodStart} max={periodEnd} onChange={(f, tt) => { setCalFrom(f); setCalTo(tt); }} />
            <TouchableOpacity style={[styles.applyBtn, !calFrom && { opacity: 0.5 }]} disabled={!calFrom} onPress={applyDate}>
              <Text style={styles.applyTxt}>{t("tx.apply")}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
  muted: { color: colors.textSecondary, fontSize: 13, textAlign: "center", marginTop: 14 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16 },
  cardTop: { flexDirection: "row", alignItems: "center" },
  cat: { fontSize: 16, fontWeight: "600", color: colors.text },
  cardSentence: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  track: { height: 10, backgroundColor: "#F1F5F9", borderRadius: 6, overflow: "hidden", marginTop: 12 },
  fill: { height: "100%", borderRadius: 6 },
  cardBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  pct: { fontSize: 12, color: colors.textSecondary },
  over: { fontSize: 12, color: colors.error, fontWeight: "600" },
  filterRow: { flexDirection: "row", marginTop: 16 },
  chip: { flexDirection: "row", alignItems: "center", gap: 5, height: 34, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipTxt: { fontSize: 13, color: colors.textSecondary },
  listTitle: { fontSize: 15, fontWeight: "600", color: colors.text, marginTop: 18, marginBottom: 4 },
  txRow: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  txIcon: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  sentence: { fontSize: 14, lineHeight: 20, color: colors.text },
  meta: { flexDirection: "row", alignItems: "center", marginTop: 5, gap: 8 },
  time: { fontSize: 11, color: colors.textSecondary },
  simChip: { flexDirection: "row", alignItems: "center", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, flexShrink: 1 },
  simDot: { width: 4, height: 4, borderRadius: 3, marginRight: 4 },
  simChipTxt: { fontSize: 9, fontWeight: "600", flexShrink: 1 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 18, paddingBottom: 28 },
  sheetHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sheetTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  reset: { fontSize: 13, color: colors.primary, fontWeight: "600" },
  applyBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 13, alignItems: "center", marginTop: 16 },
  applyTxt: { color: "#fff", fontSize: 15, fontWeight: "600" },
});


// // Spending-alert detail: budget card (traffic-light bar + on/off) with an edit icon top-right, plus
// // the category's transactions. The date filter is constrained to the alert's period; the card's
// // spent/%/bar recompute for the filtered slice (full period uses the backend's accurate figure).
// import { useCallback, useEffect, useMemo, useState } from "react";
// import { ActivityIndicator, Alert as RNAlert, FlatList, Modal, Pressable, RefreshControl, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
// import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
// import { Ionicons } from "@expo/vector-icons";
// import { useTranslation } from "react-i18next";
// import { colors } from "../theme";
// import { useNetwork } from "../store/useNetwork";
// import { readAlerts, updateAlert, type SpendingAlert } from "../data/spendingAlerts";
// import { fetchTransactions, type Tx } from "../data/transactions";
// import { readSims, simEyebrow, simColor, type Sim } from "../data/phoneNumbers";
// import { TxSentence } from "../components/TxSentence";
// import { MiniCalendar } from "../components/MiniCalendar";

// const money = (n: number) => "$" + (n ?? 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
// const barColor = (p: number, thr: number) => (p >= 100 ? colors.error : p >= thr ? colors.warning : colors.success);
// const ymd = (s: string) => (s ?? "").slice(0, 10);
// const fmtShort = (s: string) => new Date(s + "T00:00:00").toLocaleDateString([], { day: "numeric", month: "short" });

// export default function SpendingAlertDetailScreen() {
//   const { t } = useTranslation();
//   const nav = useNavigation<any>();
//   const route = useRoute<any>();
//   const online = useNetwork((s) => s.online);

//   const [alert, setAlert] = useState<SpendingAlert>(route.params?.alert);
//   const periodStart = ymd(alert.progress.period_start);
//   const periodEnd = ymd(alert.progress.period_end);

//   const [from, setFrom] = useState(periodStart);
//   const [to, setTo] = useState<string | null>(periodEnd);
//   const fullPeriod = from === periodStart && to === periodEnd;

//   const [dateModal, setDateModal] = useState(false);
//   const [calFrom, setCalFrom] = useState<string | null>(periodStart);
//   const [calTo, setCalTo] = useState<string | null>(periodEnd);

//   const [sims, setSims] = useState<Sim[]>([]);
//   const [items, setItems] = useState<Tx[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);

//   useEffect(() => { readSims().then(setSims); }, []);

//   useEffect(() => {
//     nav.setOptions({
//       title: alert?.category?.name ?? t("alerts.title"),
//       headerRight: () => (
//         <TouchableOpacity hitSlop={10} onPress={() => nav.navigate("AlertForm", { alert })}>
//           <Ionicons name="create-outline" size={22} color={colors.primary} />
//         </TouchableOpacity>
//       ),
//     });
//   }, [nav, alert, t]);

//   const loadList = useCallback(async () => {
//     if (!useNetwork.getState().online) { setItems([]); setLoading(false); return; }
//     try {
//       const rows = await fetchTransactions({
//         categoryId: alert.category.id,
//         phoneNumberIds: alert.phone_number_id ? [alert.phone_number_id] : undefined,
//         dateFrom: from, dateTo: to ?? from,
//       }, 100);
//       setItems(rows);
//     } catch { setItems([]); }
//     setLoading(false);
//   }, [alert, from, to]);

//   const refreshCard = useCallback(async () => {
//     try { const list = await readAlerts(); const fresh = list.find((a) => a.id === alert.id); if (fresh) setAlert(fresh); } catch {}
//   }, [alert.id]);

//   useFocusEffect(useCallback(() => { refreshCard(); loadList(); }, [refreshCard, loadList]));
//   useEffect(() => { loadList(); }, [from, to]); // eslint-disable-line react-hooks/exhaustive-deps

//   const doRefresh = useCallback(async () => { setRefreshing(true); await refreshCard(); await loadList(); setRefreshing(false); }, [refreshCard, loadList]);

//   const onToggle = async (next: boolean) => {
//     if (!useNetwork.getState().online) { RNAlert.alert(t("alerts.offlineAction")); return; }
//     setAlert((a) => ({ ...a, is_active: next }));
//     try { await updateAlert(alert.id, { isActive: next }); }
//     catch (e: any) { setAlert((a) => ({ ...a, is_active: !next })); RNAlert.alert(t("auth.errorTitle"), e?.message ?? ""); }
//   };

//   const simMap = useMemo(() => { const m: Record<string, Sim> = {}; sims.forEach((s) => (m[s.id] = s)); return m; }, [sims]);
//   const showSim = sims.length >= 2;

//   const filteredSpent = items.filter((x) => x.direction === "out").reduce((s, x) => s + (x.amount ?? 0), 0);
//   const spent = fullPeriod ? (alert.progress?.spent ?? 0) : filteredSpent;
//   const pct = fullPeriod ? (alert.progress?.percent ?? 0) : (alert.limit_amount > 0 ? Math.round((spent / alert.limit_amount) * 100) : 0);
//   const over = spent > alert.limit_amount;
//   const periodPhrase = alert.period === "weekly" ? t("alerts.periodWeek") : t("alerts.periodMonth");
//   const fill = `${Math.min(pct, 100)}%` as `${number}%`;

//   const dateLabel = fullPeriod ? t("alertDetail.fullPeriod")
//     : (to && to !== from) ? `${fmtShort(from)} – ${fmtShort(to)}` : fmtShort(from);

//   const openDate = () => { setCalFrom(from); setCalTo(to && to !== from ? to : null); setDateModal(true); };
//   const applyDate = () => { if (calFrom) { setFrom(calFrom); setTo(calTo ?? calFrom); } setDateModal(false); };
//   const resetPeriod = () => { setCalFrom(periodStart); setCalTo(periodEnd); };

//   const header = (
//     <View>
//       <View style={[styles.card, !alert.is_active && { opacity: 0.6 }]}>
//         <View style={styles.cardTop}>
//           <View style={{ flex: 1 }}>
//             <Text style={styles.cat} numberOfLines={1}>{alert.category.name}{alert.phone_number ? ` · ${alert.phone_number.replace(/^252/, "")}` : ""}</Text>
//             <Text style={styles.cardSentence}>{t("alerts.progress", { spent: money(spent), limit: money(alert.limit_amount), period: fullPeriod ? periodPhrase : dateLabel })}</Text>
//           </View>
//           <Switch value={alert.is_active} onValueChange={onToggle} trackColor={{ true: colors.primary, false: "#CBD5E1" }} thumbColor="#fff" />
//         </View>
//         <View style={styles.track}><View style={[styles.fill, { width: fill, backgroundColor: barColor(pct, alert.alert_threshold) }]} /></View>
//         <View style={styles.cardBottom}>
//           <Text style={styles.pct}>{t("alerts.percentUsed", { percent: pct })}</Text>
//           {over ? <Text style={styles.over}>{t("alerts.over", { amount: money(spent - alert.limit_amount) })}</Text> : null}
//         </View>
//       </View>

//       <View style={styles.filterRow}>
//         <TouchableOpacity style={[styles.chip, !fullPeriod && styles.chipActive]} onPress={openDate}>
//           <Ionicons name="calendar-outline" size={14} color={!fullPeriod ? "#fff" : colors.textSecondary} />
//           <Text style={[styles.chipTxt, !fullPeriod && { color: "#fff" }]}>{dateLabel}</Text>
//         </TouchableOpacity>
//       </View>

//       <Text style={styles.listTitle}>{t("alertDetail.transactions")}</Text>
//       {!online ? <Text style={styles.muted}>{t("alerts.offlineAction")}</Text> : null}
//     </View>
//   );

//   if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;

//   return (
//     <>
//       <FlatList
//         style={{ flex: 1, backgroundColor: colors.background }}
//         data={items}
//         keyExtractor={(tx) => tx.id}
//         contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
//         ListHeaderComponent={header}
//         refreshControl={<RefreshControl refreshing={refreshing} onRefresh={doRefresh} tintColor={colors.primary} />}
//         ListEmptyComponent={online ? <Text style={styles.muted}>{t("alertDetail.empty")}</Text> : null}
//         renderItem={({ item }) => {
//           const isIn = item.direction === "in";
//           const sim = showSim && item.phone_number_id ? simMap[item.phone_number_id] : undefined;
//           const accent = sim ? simColor(sim.id) : undefined;
//           const time = new Date(item.transacted_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
//           return (
//             <View style={styles.txRow}>
//               <View style={[styles.txIcon, { backgroundColor: isIn ? "#DCFCE7" : "#FEE2E2" }]}>
//                 <Ionicons name={isIn ? "arrow-down" : "arrow-up"} size={16} color={isIn ? "#16A34A" : "#DC2626"} />
//               </View>
//               <View style={{ flex: 1, marginLeft: 11 }}>
//                 <TxSentence tx={item} style={styles.sentence} />
//                 <View style={styles.meta}>
//                   <Text style={styles.time}>{time}</Text>
//                   {sim ? (
//                     <View style={[styles.simChip, { backgroundColor: accent! + "22" }]}>
//                       <View style={[styles.simDot, { backgroundColor: accent }]} />
//                       <Text style={[styles.simChipTxt, { color: accent }]} numberOfLines={1}>{simEyebrow(sim)}</Text>
//                     </View>
//                   ) : null}
//                 </View>
//               </View>
//             </View>
//           );
//         }}
//       />

//       <Modal transparent visible={dateModal} animationType="slide" onRequestClose={() => setDateModal(false)}>
//         <Pressable style={styles.backdrop} onPress={() => setDateModal(false)}>
//           <Pressable style={styles.sheet}>
//             <View style={styles.sheetHead}>
//               <Text style={styles.sheetTitle}>{t("tx.pickDates")}</Text>
//               <TouchableOpacity onPress={resetPeriod}><Text style={styles.reset}>{t("alertDetail.fullPeriod")}</Text></TouchableOpacity>
//             </View>
//             <MiniCalendar from={calFrom} to={calTo} min={periodStart} max={periodEnd} onChange={(f, tt) => { setCalFrom(f); setCalTo(tt); }} />
//             <TouchableOpacity style={[styles.applyBtn, !calFrom && { opacity: 0.5 }]} disabled={!calFrom} onPress={applyDate}>
//               <Text style={styles.applyTxt}>{t("tx.apply")}</Text>
//             </TouchableOpacity>
//           </Pressable>
//         </Pressable>
//       </Modal>
//     </>
//   );
// }

// const styles = StyleSheet.create({
//   center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
//   muted: { color: colors.textSecondary, fontSize: 13, textAlign: "center", marginTop: 14 },
//   card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16 },
//   cardTop: { flexDirection: "row", alignItems: "center" },
//   cat: { fontSize: 16, fontWeight: "600", color: colors.text },
//   cardSentence: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
//   track: { height: 10, backgroundColor: "#F1F5F9", borderRadius: 6, overflow: "hidden", marginTop: 12 },
//   fill: { height: "100%", borderRadius: 6 },
//   cardBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
//   pct: { fontSize: 12, color: colors.textSecondary },
//   over: { fontSize: 12, color: colors.error, fontWeight: "600" },
//   filterRow: { flexDirection: "row", marginTop: 16 },
//   chip: { flexDirection: "row", alignItems: "center", gap: 5, height: 34, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
//   chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
//   chipTxt: { fontSize: 13, color: colors.textSecondary },
//   listTitle: { fontSize: 15, fontWeight: "600", color: colors.text, marginTop: 18, marginBottom: 4 },
//   txRow: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
//   txIcon: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
//   sentence: { fontSize: 14, lineHeight: 20, color: colors.text },
//   meta: { flexDirection: "row", alignItems: "center", marginTop: 5, gap: 8 },
//   time: { fontSize: 11, color: colors.textSecondary },
//   simChip: { flexDirection: "row", alignItems: "center", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, flexShrink: 1 },
//   simDot: { width: 4, height: 4, borderRadius: 3, marginRight: 4 },
//   simChipTxt: { fontSize: 9, fontWeight: "600", flexShrink: 1 },
//   backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" },
//   sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 18, paddingBottom: 28 },
//   sheetHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
//   sheetTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
//   reset: { fontSize: 13, color: colors.primary, fontWeight: "600" },
//   applyBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 13, alignItems: "center", marginTop: 16 },
//   applyTxt: { color: "#fff", fontSize: 15, fontWeight: "600" },
// });

