// Transactions ledger: single filter bar (SIM dropdown · In/Out · Date), 4 aligned columns
// (Transaction · Category · Amount · Balance), date groups with daily net. Online → server; offline → cache.

import React from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator, Modal, Pressable, RefreshControl, ScrollView, SectionList,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { colors } from "../theme";
import { useNetwork } from "../store/useNetwork";
import { fetchTransactionsPage, queryCache, type Tx, type TxFilters } from "../data/transactions";
import { readSims, simLabel, simColor, simEyebrow, type Sim } from "../data/phoneNumbers";
import { readCategories } from "../data/categories";
import { MiniCalendar } from "../components/MiniCalendar";
import { syncAll } from "../data/sync";
import { useSync } from "../store/useSync";
import { TxSentence } from "../components/TxSentence";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { CoachTip } from "../components/CoachTip";
import { hasSeen, markSeen } from "../onboarding";

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const money = (n: number) => "$" + (n ?? 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
const fmtShort = (s: string) => new Date(s + "T00:00:00").toLocaleDateString([], { day: "numeric", month: "short" });

const localNum = (n?: string | null) => (n ?? "").replace(/^252/, "");

type Dir = "all" | "in" | "out";
type DateSel = { kind: "all" | "today" | "week" | "month" | "custom"; from?: string; to?: string };

function selRange(sel: DateSel): { dateFrom?: string; dateTo?: string } {
  if (sel.kind === "all") return {};
  if (sel.kind === "custom") return { dateFrom: sel.from, dateTo: sel.to ?? sel.from };
  const now = new Date();
  if (sel.kind === "today") return { dateFrom: ymd(now), dateTo: ymd(now) };
  if (sel.kind === "week") { const s = new Date(now); s.setDate(now.getDate() - 6); return { dateFrom: ymd(s), dateTo: ymd(now) }; }
  const s = new Date(now.getFullYear(), now.getMonth(), 1);
  return { dateFrom: ymd(s), dateTo: ymd(now) };
}

export default function TransactionsScreen() {
  const { t } = useTranslation();
  const nav = useNavigation<any>();
  const online = useNetwork((s) => s.online);

  const [sims, setSims] = useState<Sim[]>([]);
  const [selectedSims, setSelectedSims] = useState<string[]>([]);
  const [simModal, setSimModal] = useState(false);

  const [direction, setDirection] = useState<Dir>("all");

  const [dateSel, setDateSel] = useState<DateSel>({ kind: "all" });
  const [dateModal, setDateModal] = useState(false);
  const [calFrom, setCalFrom] = useState<string | null>(null);
  const [calTo, setCalTo] = useState<string | null>(null);

  const [catColors, setCatColors] = useState<Record<string, string | null>>({});
  const [q, setQ] = useState("");
  const [appliedQ, setAppliedQ] = useState("");

  const [items, setItems] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [loadError, setLoadError] = useState(false);

  const [tipTx, setTipTx] = useState(false);
  const tipChecked = useRef(false);
  useEffect(() => {
    if (tipChecked.current || loading || items.length === 0) return;
    tipChecked.current = true;
    (async () => { if (await hasSeen("intro") && !(await hasSeen("tipTx"))) setTipTx(true); })();
  }, [loading, items.length]);
  const dismissTipTx = () => { markSeen("tipTx"); setTipTx(false); };


  const cursorRef = useRef<string | null>(null);
  const hasMoreRef = useRef(false);
  const busyRef = useRef(false);

  useEffect(() => { readSims().then(setSims); }, []);
  useEffect(() => { readCategories().then((cs) => { const m: Record<string, string | null> = {}; cs.forEach((c) => (m[c.id] = c.color)); setCatColors(m); }); }, []);
  useEffect(() => { const id = setTimeout(() => setAppliedQ(q.trim()), 350); return () => clearTimeout(id); }, [q]);

  const buildFilters = useCallback((): TxFilters => ({
    phoneNumberIds: selectedSims.length ? selectedSims : undefined,
    direction: direction === "all" ? undefined : direction,
    ...selRange(dateSel),
  }), [selectedSims, direction, dateSel]);

  const openTx = useCallback((id: string) => nav.navigate("TxDetail", { id }), [nav]);

  const simMap = useMemo(() => { const m: Record<string, Sim> = {}; sims.forEach((s) => (m[s.id] = s)); return m; }, [sims]);
  const showSim = sims.length >= 2;

  const firstLoad = useCallback(async () => {
    setLoading(true);
    try {
      if (online) {
        try {
          const page = await fetchTransactionsPage({ cursor: null, filters: buildFilters(), q: appliedQ });
          setItems(page.items); cursorRef.current = page.cursor; hasMoreRef.current = page.hasMore;
          setLoadError(false);
        } catch (e) {
          const rows = await queryCache({ filters: buildFilters(), q: appliedQ, limit: 200 });
          setItems(rows); cursorRef.current = null; hasMoreRef.current = false;
          setLoadError(rows.length === 0); // only an error if there's nothing cached to show
        }
      } else {
        const rows = await queryCache({ filters: buildFilters(), q: appliedQ, limit: 200 });
        setItems(rows); cursorRef.current = null; hasMoreRef.current = false;
        setLoadError(false);
      }
    } catch { setLoadError(true); }
    setLoading(false);
  }, [online, appliedQ, buildFilters]);

  const loadMore = useCallback(async () => {
    if (!online || !hasMoreRef.current || busyRef.current || !cursorRef.current) return;
    busyRef.current = true; setLoadingMore(true);
    try {
      const page = await fetchTransactionsPage({ cursor: cursorRef.current, filters: buildFilters(), q: appliedQ });
      setItems((prev) => [...prev, ...page.items]); cursorRef.current = page.cursor; hasMoreRef.current = page.hasMore;
    } catch {}
    busyRef.current = false; setLoadingMore(false);
  }, [online, appliedQ, buildFilters]);

  // const doRefresh = useCallback(async () => { setRefreshing(true); await firstLoad(); setRefreshing(false); }, [firstLoad]);
  const doRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await syncAll(); } catch {}
    await firstLoad();
    setRefreshing(false);
  }, [firstLoad]);

  const didMount = useRef(false);
  useEffect(() => {
    if (!didMount.current) { didMount.current = true; return; }
    firstLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedQ, selectedSims, direction, dateSel, online]);

  const firstLoadRef = useRef(firstLoad); firstLoadRef.current = firstLoad;
  useFocusEffect(useCallback(() => { firstLoadRef.current(); }, []));

  const syncTick = useSync((s) => s.tick);
  useEffect(() => { if (syncTick > 0) firstLoad(); }, [syncTick]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleSim = (id: string) => setSelectedSims((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));


  const sections = useMemo(() => {
    const todayY = ymd(new Date());
    const yd = new Date(); yd.setDate(yd.getDate() - 1); const yestY = ymd(yd);
    const map = new Map<string, Tx[]>();
    for (const tx of items) {
      const key = tx.transacted_date || tx.transacted_at.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(tx);
    }
    return Array.from(map.entries()).map(([key, data]) => {
      const title = key === todayY ? t("tx.today") : key === yestY ? t("tx.yesterday")
        : new Date(key + "T00:00:00").toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
      return { title, data };
    });
  }, [items, t]);

  const renderRow = useCallback(
    ({ item }: { item: Tx }) => <Row tx={item} colors2={catColors} simMap={simMap} showSim={showSim} onPress={openTx} />,
    [catColors, simMap, showSim, openTx]
  );

  const simLabelTxt = selectedSims.length === 0 ? t("tx.allSims") : `${selectedSims.length} ${t("tx.sims")}`;
  const dateLabelTxt = dateSel.kind === "all" ? t("tx.date")
    : dateSel.kind === "custom" ? (dateSel.to && dateSel.to !== dateSel.from ? `${fmtShort(dateSel.from!)} – ${fmtShort(dateSel.to)}` : fmtShort(dateSel.from!))
    : t(`tx.date_${dateSel.kind}` as any);

  const openDate = () => { const r = selRange(dateSel); setCalFrom(r.dateFrom ?? null); setCalTo(r.dateTo && r.dateTo !== r.dateFrom ? r.dateTo : null); setDateModal(true); };
  const applyDate = () => { if (calFrom) setDateSel({ kind: "custom", from: calFrom, to: calTo ?? calFrom }); setDateModal(false); };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={colors.textSecondary} />
        <TextInput style={styles.searchInput} placeholder={t("tx.searchPlaceholder")} placeholderTextColor={colors.textSecondary} value={q} onChangeText={setQ} returnKeyType="search" />
        {q ? <TouchableOpacity onPress={() => setQ("")}><Ionicons name="close-circle" size={18} color={colors.textSecondary} /></TouchableOpacity> : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
        <TouchableOpacity style={[styles.pillBtn, selectedSims.length > 0 && styles.pillBtnActive]} onPress={() => setSimModal(true)}>
          <Ionicons name="phone-portrait-outline" size={14} color={selectedSims.length > 0 ? "#fff" : colors.textSecondary} />
          <Text style={[styles.pillBtnTxt, selectedSims.length > 0 && { color: "#fff" }]}>{simLabelTxt}</Text>
          <Ionicons name="chevron-down" size={13} color={selectedSims.length > 0 ? "#fff" : colors.textSecondary} />
        </TouchableOpacity>

        <View style={styles.segment}>
          {(["all", "in", "out"] as Dir[]).map((d, i) => (
            <TouchableOpacity key={d} onPress={() => setDirection(d)} style={[styles.segBtn, i > 0 && styles.segDivider, direction === d && styles.segActive]}>
              <Text style={[styles.segTxt, direction === d && styles.segTxtActive]}>{t(`tx.${d}`)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={[styles.pillBtn, dateSel.kind !== "all" && styles.pillBtnActive]} onPress={openDate}>
          <Ionicons name="calendar-outline" size={14} color={dateSel.kind !== "all" ? "#fff" : colors.textSecondary} />
          <Text style={[styles.pillBtnTxt, dateSel.kind !== "all" && { color: "#fff" }]}>{dateLabelTxt}</Text>
        </TouchableOpacity>
      </ScrollView>
      
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : loadError && items.length === 0 ? (
        <ErrorState onRetry={firstLoad} />
      ) : (
        <SectionList
          style={{ flex: 1 }}
          sections={sections}
          keyExtractor={(tx) => tx.id}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderSectionHeader={({ section }) => (
            <View style={styles.secHead}>
              <Text style={styles.secTitle}>{section.title}</Text>
            </View>
          )}
          
          renderItem={renderRow}

          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={doRefresh} tintColor={colors.primary} />}
          onEndReachedThreshold={0.4}
          onEndReached={loadMore}
          ListEmptyComponent={<EmptyState icon="swap-horizontal-outline" title={t("tx.empty")} subtitle={t("tx.emptyHint")} />}
          ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginVertical: 16 }} color={colors.primary} /> : null}
        />
      )}

      {/* SIM multi-select */}
      <Modal transparent visible={simModal} animationType="slide" onRequestClose={() => setSimModal(false)}>
        <Pressable style={styles.backdrop} onPress={() => setSimModal(false)}>
          <Pressable style={styles.sheet}>
            <Text style={styles.sheetTitle}>{t("tx.filterSim")}</Text>
            <TouchableOpacity style={styles.simRow} onPress={() => setSelectedSims([])}>
              <Text style={styles.simTxt}>{t("tx.allSims")}</Text>
              {selectedSims.length === 0 ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
            </TouchableOpacity>
            {sims.map((s) => (
              <TouchableOpacity key={s.id} style={styles.simRow} onPress={() => toggleSim(s.id)}>
                <Text style={styles.simTxt}>{simLabel(s)}</Text>
                {selectedSims.includes(s.id) ? <Ionicons name="checkmark-circle" size={20} color={colors.primary} /> : <Ionicons name="ellipse-outline" size={20} color={colors.border} />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.applyBtn} onPress={() => setSimModal(false)}><Text style={styles.applyTxt}>{t("tx.apply")}</Text></TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Date: presets + calendar */}
      <Modal transparent visible={dateModal} animationType="slide" onRequestClose={() => setDateModal(false)}>
        <Pressable style={styles.backdrop} onPress={() => setDateModal(false)}>
          <Pressable style={styles.sheet}>
            <View style={styles.presetRow}>
              {(["all", "today", "week", "month"] as DateSel["kind"][]).map((k) => (
                <TouchableOpacity key={k} style={[styles.preset, dateSel.kind === k && styles.presetActive]} onPress={() => { setDateSel({ kind: k as any }); setDateModal(false); }}>
                  <Text style={[styles.presetTxt, dateSel.kind === k && { color: "#fff" }]}>{t(`tx.date_${k}` as any)}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.orPick}>{t("tx.pickDates")}</Text>
            <MiniCalendar from={calFrom} to={calTo} onChange={(f, to) => { setCalFrom(f); setCalTo(to); }} />
            <TouchableOpacity style={[styles.applyBtn, !calFrom && { opacity: 0.5 }]} disabled={!calFrom} onPress={applyDate}>
              <Text style={styles.applyTxt}>{t("tx.apply")}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
      {tipTx ? <CoachTip text={t("onboarding.tipTx")} onDismiss={dismissTipTx} arrow="bottom-left" style={{ top: 118, left: 16, right: 16 }} /> : null}
    </View>
  );
}

const Row = React.memo(function Row({ tx, colors2, simMap, showSim, onPress }: { tx: Tx; colors2: Record<string, string | null>; simMap: Record<string, Sim>; showSim: boolean; onPress: (id: string) => void }) {
  const isIn = tx.direction === "in";
  const time = new Date(tx.transacted_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  const hex = tx.category ? colors2[tx.category.id] ?? null : null;
  const sim = showSim && tx.phone_number_id ? simMap[tx.phone_number_id] : undefined;
  const accent = sim ? simColor(sim.id) : undefined;
  return (
    <TouchableOpacity style={styles.row} onPress={() => onPress(tx.id)} activeOpacity={0.7}>
      <View style={[styles.arrow, { backgroundColor: isIn ? "#DCFCE7" : "#FEE2E2" }]}>
        <Ionicons name={isIn ? "arrow-down" : "arrow-up"} size={17} color={isIn ? "#16A34A" : "#DC2626"} />
      </View>
      <View style={{ flex: 1, marginLeft: 11 }}>
        <TxSentence tx={tx} style={styles.sentence} />
        <View style={styles.meta}>
          <Text style={styles.time}>{time}</Text>
          <View style={styles.provNum}>
            {sim ? (
              <View style={[styles.simChip, { backgroundColor: "#2563EB" + "22" }]}>
                <View style={[styles.simDot, { backgroundColor: "#2563EB" }]} />
                <Text style={[styles.simChipTxt, { color: "#2563EB" }]} numberOfLines={1}>{simEyebrow(sim)}</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.categ}>
            {tx.category
              ? <Text style={[styles.tag, { backgroundColor: hex ? hex + "22" : "#EEF2F6", color: hex ?? colors.textSecondary }]}>{tx.category.name}</Text>
              : null}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  searchWrap: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, marginHorizontal: 16, marginTop: 12, paddingHorizontal: 12, height: 44 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 15, color: colors.text },
  filterRow: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4, gap: 8, alignItems: "center" },
  filterScroll: { flexGrow: 0} ,
  pillBtn: { flexDirection: "row", alignItems: "center", gap: 5, height: 34, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  pillBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillBtnTxt: { fontSize: 13, color: colors.textSecondary },
  segment: { flexDirection: "row", height: 34, borderRadius: 999, borderWidth: 1, borderColor: colors.border, overflow: "hidden", backgroundColor: colors.surface },
  segBtn: { paddingHorizontal: 14, justifyContent: "center" },
  segDivider: { borderLeftWidth: 1, borderLeftColor: colors.border },
  segActive: { backgroundColor: colors.primary },
  segTxt: { fontSize: 13, color: colors.textSecondary },
  segTxtActive: { color: "#fff", fontWeight: "600" },
  colHeadTxt: { fontSize: 11, color: colors.text, fontWeight: "600" },
  secHead: { paddingHorizontal: 16, paddingVertical: 7, backgroundColor: colors.background },
  secTitle: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },
  row: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 12, paddingHorizontal: 16, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  arrow: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", marginTop: 1 },
  sentence: { fontSize: 14, lineHeight: 20, color: colors.text },
  provNum: { marginTop: 4, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 },
  simChip: { flexDirection: "row", alignItems: "center", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, flexShrink: 1 },
  simDot: { width: 4, height: 4, borderRadius: 3, marginRight: 4 },
  simChipTxt: { fontSize: 9, fontWeight: "600", flexShrink: 1 },
  categ: { marginTop: 4 },
  meta: { flexDirection: "row", alignItems: "center", marginTop: 5 },
  time: { fontSize: 11, color: colors.textSecondary },
  tag: { fontSize: 10, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, overflow: "hidden", marginLeft: 8 },
  cTxn: { flex: 1, flexDirection: "row", alignItems: "center", minWidth: 0 },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  metaNum: { fontSize: 11, color: colors.text, fontWeight: "600", flexShrink: 1 },
  empty: { textAlign: "center", color: colors.textSecondary, marginTop: 40, fontSize: 14 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 18, paddingBottom: 28 },
  sheetTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 6 },
  simRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  simTxt: { fontSize: 15, color: colors.text },
  presetRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  preset: { paddingHorizontal: 14, height: 34, borderRadius: 999, borderWidth: 1, borderColor: colors.border, justifyContent: "center" },
  presetActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  presetTxt: { fontSize: 13, color: colors.textSecondary },
  orPick: { fontSize: 12, color: colors.textSecondary, marginBottom: 10 },
  applyBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 13, alignItems: "center", marginTop: 16 },
  applyTxt: { color: "#fff", fontSize: 15, fontWeight: "600" },
});



