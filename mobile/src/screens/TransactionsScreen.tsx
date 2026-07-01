// The Transactions list: SIM filter (multi-select) + direction + date presets + search.
// Online → server (paginated, full history, cache grows). Offline → local cache query.


// Transactions ledger: single filter bar (SIM dropdown · In/Out · Date), 4 aligned columns
// (Transaction · Category · Amount · Balance), date groups with daily net. Online → server; offline → cache.
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
import { readSims, simLabel, type Sim } from "../data/phoneNumbers";
import { readCategories } from "../data/categories";
import { MiniCalendar } from "../components/MiniCalendar";
import { syncAll } from "../data/sync";

import { useSync } from "../store/useSync";
import { TxSentence } from "../components/TxSentence";

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

  const firstLoad = useCallback(async () => {
    setLoading(true);
    try {
      if (online) {
        const page = await fetchTransactionsPage({ cursor: null, filters: buildFilters(), q: appliedQ });
        setItems(page.items); cursorRef.current = page.cursor; hasMoreRef.current = page.hasMore;
      } else {
        const rows = await queryCache({ filters: buildFilters(), q: appliedQ, limit: 500 });
        setItems(rows); cursorRef.current = null; hasMoreRef.current = false;
      }
    } catch {}
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

  // const sections = useMemo(() => {
  //   const todayY = ymd(new Date());
  //   const yd = new Date(); yd.setDate(yd.getDate() - 1); const yestY = ymd(yd);
  //   const map = new Map<string, Tx[]>();
  //   for (const tx of items) {
  //     const key = tx.transacted_date || tx.transacted_at.slice(0, 10);
  //     if (!map.has(key)) map.set(key, []);
  //     map.get(key)!.push(tx);
  //   }
  //   return Array.from(map.entries()).map(([key, data]) => {
  //     const net = data.reduce((s, tx) => s + (tx.direction === "in" ? tx.amount : -tx.amount), 0);
  //     const title = key === todayY ? t("tx.today") : key === yestY ? t("tx.yesterday")
  //       : new Date(key + "T00:00:00").toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
  //     return { title, net, data };
  //   });
  // }, [items, t]);

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

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
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

      {/* <View style={styles.colHead}>
        <Text style={[styles.colHeadTxt, { flex: 1 }]}>{t("tx.colTransaction")}</Text>
        <Text style={[styles.colHeadTxt, styles.cCat]}>{t("tx.colCategory")}</Text>
        <Text style={[styles.colHeadTxt, styles.cAmt, { textAlign: "right" }]}>{t("tx.colAmount")}</Text>
        <Text style={[styles.colHeadTxt, styles.cBal, { textAlign: "right" }]}>{t("tx.colBalance")}</Text>
      </View> */}

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(tx) => tx.id}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderSectionHeader={({ section }) => (
            <View style={styles.secHead}>
              <Text style={styles.secTitle}>{section.title}</Text>
            </View>
          )}
          // renderSectionHeader={({ section }) => (
          //   <View style={styles.secHead}>
          //     <Text style={styles.secTitle}>{section.title}</Text>
          //     <Text style={[styles.secNet, { color: (section as any).net >= 0 ? colors.moneyIn : colors.moneyOut }]}>
          //       {t("tx.net")} {(section as any).net >= 0 ? "+" : "−"}{money(Math.abs((section as any).net))}
          //     </Text>
          //   </View>
          // )}
          renderItem={({ item }) => <Row tx={item} colors2={catColors} onPress={() => nav.navigate("TxDetail", { id: item.id })} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={doRefresh} tintColor={colors.primary} />}
          onEndReachedThreshold={0.4}
          onEndReached={loadMore}
          ListEmptyComponent={<Text style={styles.empty}>{t("tx.empty")}</Text>}
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
    </View>
  );
}


function Row({ tx, colors2, onPress }: { tx: Tx; colors2: Record<string, string | null>; onPress: () => void }) {
  const isIn = tx.direction === "in";
  const time = new Date(tx.transacted_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  const hex = tx.category ? colors2[tx.category.id] ?? null : null;
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.arrow, { backgroundColor: isIn ? "#DCFCE7" : "#FEE2E2" }]}>
        <Ionicons name={isIn ? "arrow-down" : "arrow-up"} size={17} color={isIn ? "#16A34A" : "#DC2626"} />
      </View>
      <View style={{ flex: 1, marginLeft: 11 }}>
        <TxSentence tx={tx} style={styles.sentence} />
        <View style={styles.meta}>
          <Text style={styles.time}>{time}</Text>
          {tx.category
            ? <Text style={[styles.tag, { backgroundColor: hex ? hex + "22" : "#EEF2F6", color: hex ?? colors.textSecondary }]}>{tx.category.name}</Text>
            : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// function Row({ tx, colors2, onPress }: { tx: Tx; colors2: Record<string, string | null>; onPress: () => void }) {
//   const isIn = tx.direction === "in";

//   // const title = tx.counterparty_name || tx.counterparty_number || "—";
//   const title = tx.counterparty_name || localNum(tx.counterparty_number) || "—";

//   const time = new Date(tx.transacted_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
//   const showNumber = !!(tx.counterparty_name && tx.counterparty_number);
//   const hex = tx.category ? colors2[tx.category.id] ?? null : null;
//   return (
//     <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
//       <View style={styles.cTxn}>
//         <Ionicons name={isIn ? "arrow-down" : "arrow-up"} size={16} color={isIn ? colors.moneyIn : colors.moneyOut} />
//         <View style={{ flex: 1, minWidth: 0, marginLeft: 7 }}>
//           <Text style={styles.name} numberOfLines={1}>{title}</Text>
//           <View style={styles.metaRow}>
//             {showNumber ? (
//               <>
//                 <Ionicons name="call-outline" size={11} color={colors.textSecondary} />
//                 {/* <Text style={styles.metaNum} numberOfLines={1}> {tx.counterparty_number}</Text> */}
//                 <Text style={styles.metaNum} numberOfLines={1}> {localNum(tx.counterparty_number)}</Text>
//               </>
//             ) : null}
//             <Ionicons name="time-outline" size={11} color={colors.textSecondary} style={{ marginLeft: showNumber ? 8 : 0 }} />
//             <Text style={styles.sub}> {time}</Text>
//           </View>
//         </View>
//       </View>
//       <View style={styles.cCat}>
//         {tx.category
//           ? <Text style={[styles.pill, { backgroundColor: hex ? hex + "22" : "#EEF2F6", color: hex ?? colors.textSecondary }]} numberOfLines={1}>{tx.category.name}</Text>
//           : <Text style={styles.dash}>—</Text>}
//       </View>
//       <Text style={[styles.amt, styles.cAmt, { color: isIn ? colors.moneyIn : colors.moneyOut }]}>{isIn ? "+" : "−"}{money(tx.amount)}</Text>
//       <Text style={[styles.bal, styles.cBal]}>{tx.balance_after != null ? money(tx.balance_after) : "—"}</Text>
//     </TouchableOpacity>
//   );
// }


const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  searchWrap: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, marginHorizontal: 16, marginTop: 12, paddingHorizontal: 12, height: 44 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 15, color: colors.text },
  filterRow: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4, gap: 8, alignItems: "center" },
  pillBtn: { flexDirection: "row", alignItems: "center", gap: 5, height: 34, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  pillBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillBtnTxt: { fontSize: 13, color: colors.textSecondary },
  segment: { flexDirection: "row", height: 34, borderRadius: 999, borderWidth: 1, borderColor: colors.border, overflow: "hidden", backgroundColor: colors.surface },
  segBtn: { paddingHorizontal: 14, justifyContent: "center" },
  segDivider: { borderLeftWidth: 1, borderLeftColor: colors.border },
  segActive: { backgroundColor: colors.primary },
  segTxt: { fontSize: 13, color: colors.textSecondary },
  segTxtActive: { color: "#fff", fontWeight: "600" },
  // colHead: { flexDirection: "row", alignItems: "center" , paddingHorizontal: 16, paddingVertical: 7, marginTop: 6, backgroundColor: "#F1F5F9", borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border },
  colHeadTxt: { fontSize: 11, color: colors.text, fontWeight: "600" },
  // cCat: { width: 64, paddingHorizontal: 4 },
  // cAmt: { width: 60 },
  // cBal: { width: 62 },
  secHead: { paddingHorizontal: 16, paddingVertical: 7, backgroundColor: colors.background },
  secTitle: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },

  // secHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 7, backgroundColor: colors.background },
  // secTitle: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },
  // secNet: { fontSize: 12, fontWeight: "600" },


  row: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 12, paddingHorizontal: 16, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  arrow: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", marginTop: 1 },
  sentence: { fontSize: 14, lineHeight: 20, color: colors.text },
  meta: { flexDirection: "row", alignItems: "center", marginTop: 5 },
  time: { fontSize: 11, color: colors.textSecondary },
  tag: { fontSize: 10, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, overflow: "hidden", marginLeft: 8 },
  // row: { flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 16, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  cTxn: { flex: 1, flexDirection: "row", alignItems: "center", minWidth: 0 },
  // name: { fontSize: 14, fontWeight: "500", color: colors.text },
  // sub: { fontSize: 11, color: colors.textSecondary, marginTop: 1 },

  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  metaNum: { fontSize: 11, color: colors.text, fontWeight: "600", flexShrink: 1 },




  // pill: { fontSize: 10, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, overflow: "hidden", alignSelf: "flex-start" },
  // dash: { fontSize: 12, color: colors.textSecondary },
  // amt: { fontSize: 13, fontWeight: "600", textAlign: "right" },
  // bal: { fontSize: 12, color: colors.textSecondary, textAlign: "right" },
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












// ----------------------

// import { useCallback, useEffect, useMemo, useRef, useState } from "react";
// import {
//   ActivityIndicator, Modal, Pressable, RefreshControl, ScrollView, SectionList,
//   StyleSheet, Text, TextInput, TouchableOpacity, View,
// } from "react-native";
// import { useNavigation, useFocusEffect } from "@react-navigation/native";
// import { Ionicons } from "@expo/vector-icons";
// import { useTranslation } from "react-i18next";
// import { colors } from "../theme";
// import { useNetwork } from "../store/useNetwork";
// import { fetchTransactionsPage, queryCache, type Tx, type TxFilters } from "../data/transactions";
// import { readSims, simLabel, type Sim } from "../data/phoneNumbers";

// const money = (n: number) => "$" + (n ?? 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
// const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// type Dir = "all" | "in" | "out";
// type DatePreset = "all" | "today" | "week" | "month";

// function dateRange(p: DatePreset): { dateFrom?: string; dateTo?: string } {
//   if (p === "all") return {};
//   const now = new Date();
//   if (p === "today") return { dateFrom: ymd(now), dateTo: ymd(now) };
//   if (p === "week") { const s = new Date(now); s.setDate(now.getDate() - 6); return { dateFrom: ymd(s), dateTo: ymd(now) }; }
//   const s = new Date(now.getFullYear(), now.getMonth(), 1);
//   return { dateFrom: ymd(s), dateTo: ymd(now) };
// }

// export default function TransactionsScreen() {
//   const { t } = useTranslation();
//   const nav = useNavigation<any>();
//   const online = useNetwork((s) => s.online);

//   const [sims, setSims] = useState<Sim[]>([]);
//   const [selectedSims, setSelectedSims] = useState<string[]>([]);
//   const [direction, setDirection] = useState<Dir>("all");
//   const [datePreset, setDatePreset] = useState<DatePreset>("all");
//   const [dateModal, setDateModal] = useState(false);

//   const [q, setQ] = useState("");
//   const [appliedQ, setAppliedQ] = useState("");

//   const [items, setItems] = useState<Tx[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const [loadingMore, setLoadingMore] = useState(false);

//   const cursorRef = useRef<string | null>(null);
//   const hasMoreRef = useRef(false);
//   const busyRef = useRef(false);

//   useEffect(() => { readSims().then(setSims); }, []);

//   // debounce the search box
//   useEffect(() => { const id = setTimeout(() => setAppliedQ(q.trim()), 350); return () => clearTimeout(id); }, [q]);

//   const buildFilters = useCallback((): TxFilters => ({
//     phoneNumberIds: selectedSims.length ? selectedSims : undefined,
//     direction: direction === "all" ? undefined : direction,
//     ...dateRange(datePreset),
//   }), [selectedSims, direction, datePreset]);

//   const firstLoad = useCallback(async () => {
//     setLoading(true);
//     try {
//       if (online) {
//         const page = await fetchTransactionsPage({ cursor: null, filters: buildFilters(), q: appliedQ });
//         setItems(page.items); cursorRef.current = page.cursor; hasMoreRef.current = page.hasMore;
//       } else {
//         const rows = await queryCache({ filters: buildFilters(), q: appliedQ, limit: 500 });
//         setItems(rows); cursorRef.current = null; hasMoreRef.current = false;
//       }
//     } catch { /* keep what we have */ }
//     setLoading(false);
//   }, [online, appliedQ, buildFilters]);

//   const loadMore = useCallback(async () => {
//     if (!online || !hasMoreRef.current || busyRef.current || !cursorRef.current) return;
//     busyRef.current = true; setLoadingMore(true);
//     try {
//       const page = await fetchTransactionsPage({ cursor: cursorRef.current, filters: buildFilters(), q: appliedQ });
//       setItems((prev) => [...prev, ...page.items]); cursorRef.current = page.cursor; hasMoreRef.current = page.hasMore;
//     } catch {}
//     busyRef.current = false; setLoadingMore(false);
//   }, [online, appliedQ, buildFilters]);

//   const doRefresh = useCallback(async () => { setRefreshing(true); await firstLoad(); setRefreshing(false); }, [firstLoad]);

//   // run on filter/search change (skip the very first render — focus handles mount)
//   const didMount = useRef(false);
//   useEffect(() => {
//     if (!didMount.current) { didMount.current = true; return; }
//     firstLoad();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [appliedQ, selectedSims, direction, datePreset, online]);

//   // refresh on mount + when returning from detail (category/note/delete reflect)
//   const firstLoadRef = useRef(firstLoad); firstLoadRef.current = firstLoad;
//   useFocusEffect(useCallback(() => { firstLoadRef.current(); }, []));

//   const toggleSim = (id: string) =>
//     setSelectedSims((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

//   // group into date sections (items already sorted newest-first)
//   const sections = useMemo(() => {
//     const todayY = ymd(new Date());
//     const yest = new Date(); yest.setDate(yest.getDate() - 1);
//     const yestY = ymd(yest);
//     const map = new Map<string, Tx[]>();
//     for (const tx of items) {
//       const key = tx.transacted_date || tx.transacted_at.slice(0, 10);
//       if (!map.has(key)) map.set(key, []);
//       map.get(key)!.push(tx);
//     }
//     return Array.from(map.entries()).map(([key, data]) => {
//       const title = key === todayY ? t("tx.today") : key === yestY ? t("tx.yesterday")
//         : new Date(key + "T00:00:00").toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
//       return { title, data };
//     });
//   }, [items, t]);

//   const dateLabel = datePreset === "all" ? t("tx.date") : t(`tx.date_${datePreset}` as any);

//   return (
//     <View style={{ flex: 1, backgroundColor: colors.background }}>
//       {/* search */}
//       <View style={styles.searchWrap}>
//         <Ionicons name="search" size={18} color={colors.textSecondary} />
//         <TextInput
//           style={styles.searchInput}
//           placeholder={t("tx.searchPlaceholder")}
//           placeholderTextColor={colors.textSecondary}
//           value={q}
//           onChangeText={setQ}
//           returnKeyType="search"
//         />
//         {q ? <TouchableOpacity onPress={() => setQ("")}><Ionicons name="close-circle" size={18} color={colors.textSecondary} /></TouchableOpacity> : null}
//       </View>

//       {/* SIM chips (multi-select) */}
//       {sims.length > 0 && (
//         <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
//           <Chip label={t("tx.all")} active={selectedSims.length === 0} onPress={() => setSelectedSims([])} icon="apps" />
//           {sims.map((s) => (
//             <Chip key={s.id} label={simLabel(s)} active={selectedSims.includes(s.id)} onPress={() => toggleSim(s.id)} icon="phone-portrait-outline" />
//           ))}
//         </ScrollView>
//       )}

//       {/* direction + date */}
//       <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
//         <Chip label={t("tx.all")} active={direction === "all"} onPress={() => setDirection("all")} />
//         <Chip label={t("tx.in")} active={direction === "in"} onPress={() => setDirection("in")} />
//         <Chip label={t("tx.out")} active={direction === "out"} onPress={() => setDirection("out")} />
//         <Chip label={dateLabel} active={datePreset !== "all"} onPress={() => setDateModal(true)} icon="calendar-outline" />
//       </ScrollView>

//       {loading ? (
//         <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
//       ) : (
//         <SectionList
//           sections={sections}
//           keyExtractor={(tx) => tx.id}
//           stickySectionHeadersEnabled={false}
//           contentContainerStyle={{ paddingBottom: 24 }}
//           renderSectionHeader={({ section }) => <Text style={styles.sectionHead}>{section.title}</Text>}
//           renderItem={({ item }) => <TxRow tx={item} onPress={() => nav.navigate("TxDetail", { id: item.id })} />}
//           refreshControl={<RefreshControl refreshing={refreshing} onRefresh={doRefresh} tintColor={colors.primary} />}
//           onEndReachedThreshold={0.4}
//           onEndReached={loadMore}
//           ListEmptyComponent={<Text style={styles.empty}>{t("tx.empty")}</Text>}
//           ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginVertical: 16 }} color={colors.primary} /> : null}
//         />
//       )}

//       {/* date preset modal */}
//       <Modal transparent visible={dateModal} animationType="fade" onRequestClose={() => setDateModal(false)}>
//         <Pressable style={styles.backdrop} onPress={() => setDateModal(false)}>
//           <View style={styles.sheet}>
//             {(["all", "today", "week", "month"] as DatePreset[]).map((p) => (
//               <TouchableOpacity key={p} style={styles.sheetRow} onPress={() => { setDatePreset(p); setDateModal(false); }}>
//                 <Text style={[styles.sheetTxt, datePreset === p && { color: colors.primary, fontWeight: "700" }]}>
//                   {p === "all" ? t("tx.date_all") : t(`tx.date_${p}` as any)}
//                 </Text>
//                 {datePreset === p ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
//               </TouchableOpacity>
//             ))}
//           </View>
//         </Pressable>
//       </Modal>
//     </View>
//   );
// }

// function Chip({ label, active, onPress, icon }: { label: string; active: boolean; onPress: () => void; icon?: any }) {
//   return (
//     <TouchableOpacity style={[styles.chip, active && styles.chipActive]} onPress={onPress} activeOpacity={0.8}>
//       {icon ? <Ionicons name={icon} size={13} color={active ? "#fff" : colors.textSecondary} style={{ marginRight: 5 }} /> : null}
//       <Text style={[styles.chipTxt, active && styles.chipTxtActive]}>{label}</Text>
//     </TouchableOpacity>
//   );
// }

// function TxRow({ tx, onPress }: { tx: Tx; onPress: () => void }) {
//   const isIn = tx.direction === "in";
//   const title = tx.counterparty_name || tx.counterparty_number || "—";
//   const time = new Date(tx.transacted_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
//   const subParts: string[] = [];
//   if (tx.counterparty_name && tx.counterparty_number) subParts.push(tx.counterparty_number);
//   if (tx.category?.name) subParts.push(tx.category.name);
//   subParts.push(time);
//   return (
//     <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
//       <View style={[styles.iconCircle, { backgroundColor: isIn ? "#DCFCE7" : "#FEE2E2" }]}>
//         <Ionicons name={isIn ? "arrow-down" : "arrow-up"} size={18} color={isIn ? "#16A34A" : "#DC2626"} />
//       </View>
//       <View style={{ flex: 1, marginLeft: 11 }}>
//         <Text style={styles.title} numberOfLines={1}>{title}</Text>
//         <Text style={styles.sub} numberOfLines={1}>{subParts.join(" · ")}</Text>
//       </View>
//       <Text style={[styles.amt, { color: isIn ? colors.moneyIn : colors.moneyOut }]}>{isIn ? "+" : "−"}{money(tx.amount)}</Text>
//     </TouchableOpacity>
//   );
// }

// const styles = StyleSheet.create({
//   center: { flex: 1, alignItems: "center", justifyContent: "center" },
//   searchWrap: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, marginHorizontal: 16, marginTop: 12, paddingHorizontal: 12, height: 44 },
//   searchInput: { flex: 1, marginLeft: 8, fontSize: 15, color: colors.text },
//   chipRow: { paddingHorizontal: 16, paddingTop: 10, gap: 8 },
//   chip: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 14, height: 34 },
//   chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
//   chipTxt: { fontSize: 13, color: colors.textSecondary },
//   chipTxtActive: { color: "#fff", fontWeight: "600" },
//   sectionHead: { fontSize: 13, fontWeight: "600", color: colors.textSecondary, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 6 },
//   row: { flexDirection: "row", alignItems: "center", paddingVertical: 11, paddingHorizontal: 16, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
//   iconCircle: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
//   title: { fontSize: 14, fontWeight: "500", color: colors.text },
//   sub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
//   amt: { fontSize: 14, fontWeight: "600" },
//   empty: { textAlign: "center", color: colors.textSecondary, marginTop: 40, fontSize: 14 },
//   backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" },
//   sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingVertical: 8 },
//   sheetRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 15, paddingHorizontal: 22 },
//   sheetTxt: { fontSize: 16, color: colors.text },
// });