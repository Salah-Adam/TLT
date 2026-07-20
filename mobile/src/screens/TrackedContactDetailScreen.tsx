// One person — totals, numbers (add/remove), edit, delete, and a filterable transaction timeline.
// Filters: a multi-select number dropdown (if >1) + a date chip. Title + timeline refresh on focus.
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { colors } from "../theme";
import { useNetwork } from "../store/useNetwork";
import { PhoneField } from "../components/PhoneField";
import { TxSentence } from "../components/TxSentence";
import { MiniCalendar } from "../components/MiniCalendar";
import { normalizePhone } from "../utils/phone";
// import {
//   readContact, deleteContact, addNumber, removeNumber, getContactTransactions,
//   type TrackedContact, type ContactTx,
// } from "../data/trackedContacts";

import {
  readContact, deleteContact, addNumber, removeNumber, getContactTransactions,
  type TrackedContact, type ContactTx, type ContactSummary,
} from "../data/trackedContacts";

import { readSims, simEyebrow, simColor, type Sim } from "../data/phoneNumbers";

const money = (n: number) => "$" + (n ?? 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
const localNum = (n?: string | null) => (n ?? "").replace(/^252/, "");
const isTrackable = (norm: string) => /^252\d{6,12}$/.test(norm);
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fmtShort = (s: string) => new Date(s + "T00:00:00").toLocaleDateString([], { day: "numeric", month: "short" });

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

export default function TrackedContactDetailScreen() {
  const { t } = useTranslation();
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const id: string = route.params?.id;
  const online = useNetwork((s) => s.online);

  const [contact, setContact] = useState<TrackedContact | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [summary, setSummary] = useState<ContactSummary | null>(null);

  const [items, setItems] = useState<ContactTx[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const cursorRef = useRef<string | null>(null);
  const hasMoreRef = useRef(false);
  const busyRef = useRef(false);

  const [selNumbers, setSelNumbers] = useState<string[]>([]);
  const [numModal, setNumModal] = useState(false);
  const [dateSel, setDateSel] = useState<DateSel>({ kind: "all" });
  const filtersRef = useRef<{ numberIds: string[]; dateSel: DateSel }>({ numberIds: [], dateSel: { kind: "all" } });

  const [dateModal, setDateModal] = useState(false);
  const [calFrom, setCalFrom] = useState<string | null>(null);
  const [calTo, setCalTo] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [numDraft, setNumDraft] = useState("");
  const [savingNum, setSavingNum] = useState(false);

  const [sims, setSims] = useState<Sim[]>([]);
  useEffect(() => { readSims().then(setSims); }, []);

  const requireOnline = () => { if (!useNetwork.getState().online) { Alert.alert(t("contacts.offlineAction")); return false; } return true; };

  const loadContact = useCallback(async () => { setContact(await readContact(id)); setLoading(false); }, [id]);

//   const loadTimeline = useCallback(async () => {
//     if (!useNetwork.getState().online) { setItems([]); cursorRef.current = null; hasMoreRef.current = false; return; }
//     const f = filtersRef.current;
//     const filters = { numberIds: f.numberIds, ...selRange(f.dateSel) };
//     try { const p = await getContactTransactions(id, null, filters); setItems(p.items); cursorRef.current = p.cursor; hasMoreRef.current = p.hasMore; }
//     catch { setItems([]); }
//   }, [id]);

  const loadTimeline = useCallback(async () => {
    if (!useNetwork.getState().online) { setItems([]); setSummary(null); cursorRef.current = null; hasMoreRef.current = false; return; }
    const f = filtersRef.current;
    const filters = { numberIds: f.numberIds, ...selRange(f.dateSel) };
    try { const p = await getContactTransactions(id, null, filters); setItems(p.items); setSummary(p.summary); cursorRef.current = p.cursor; hasMoreRef.current = p.hasMore; }
    catch { setItems([]); setSummary(null); }
  }, [id]);

  useEffect(() => { if (contact) nav.setOptions({ title: contact.label }); }, [nav, contact?.label]);

  useEffect(() => {
    nav.setOptions({
      headerRight: () => (
        <TouchableOpacity hitSlop={10} onPress={() => nav.navigate("ContactForm", { id })}>
          <Text style={{ color: colors.primary, fontSize: 15, fontWeight: "600" }}>{t("contacts.edit")}</Text>
        </TouchableOpacity>
      ),
    });
  }, [nav, id, t]);

  useFocusEffect(useCallback(() => { loadContact(); loadTimeline(); }, [loadContact, loadTimeline]));

  const loadMore = useCallback(async () => {
    if (!hasMoreRef.current || busyRef.current || !cursorRef.current) return;
    busyRef.current = true; setLoadingMore(true);
    const f = filtersRef.current;
    const filters = { numberIds: f.numberIds, ...selRange(f.dateSel) };
    try { const p = await getContactTransactions(id, cursorRef.current, filters); setItems((x) => [...x, ...p.items]); cursorRef.current = p.cursor; hasMoreRef.current = p.hasMore; }
    catch {}
    busyRef.current = false; setLoadingMore(false);
  }, [id]);

  const doRefresh = useCallback(async () => { setRefreshing(true); await loadContact(); await loadTimeline(); setRefreshing(false); }, [loadContact, loadTimeline]);

  const toggleNum = (nid: string) => setSelNumbers((p) => (p.includes(nid) ? p.filter((x) => x !== nid) : [...p, nid]));
  const applyNumbers = () => { filtersRef.current.numberIds = selNumbers; setNumModal(false); loadTimeline(); };
  const clearNumbers = () => { setSelNumbers([]); };

  const openDate = () => { const r = selRange(dateSel); setCalFrom(r.dateFrom ?? null); setCalTo(r.dateTo && r.dateTo !== r.dateFrom ? r.dateTo : null); setDateModal(true); };
  const pickPreset = (k: DateSel["kind"]) => { const ds = { kind: k } as DateSel; setDateSel(ds); filtersRef.current.dateSel = ds; setDateModal(false); loadTimeline(); };
  const applyDate = () => { const ds: DateSel = calFrom ? { kind: "custom", from: calFrom, to: calTo ?? calFrom } : { kind: "all" }; setDateSel(ds); filtersRef.current.dateSel = ds; setDateModal(false); loadTimeline(); };

  const onAddNumber = async () => {
    const norm = normalizePhone(numDraft);
    if (!isTrackable(norm)) { Alert.alert(t("contacts.invalidNumber")); return; }
    setSavingNum(true);
    try { const c = await addNumber(id, norm); setContact(c); setAddOpen(false); setNumDraft(""); await loadTimeline(); }
    catch (e: any) { Alert.alert(t("auth.errorTitle"), e?.message ?? ""); }
    setSavingNum(false);
  };

  const onRemoveNumber = (numberId: string) => {
    if (!requireOnline()) return;
    Alert.alert(t("contacts.removeNumberTitle"), "", [
      { text: t("contacts.cancel"), style: "cancel" },
      { text: t("contacts.removeNumber"), style: "destructive", onPress: async () => {
        try {
          await removeNumber(id, numberId);
          setSelNumbers((p) => p.filter((x) => x !== numberId));
          filtersRef.current.numberIds = filtersRef.current.numberIds.filter((x) => x !== numberId);
          await loadContact(); await loadTimeline();
        } catch (e: any) { Alert.alert(t("auth.errorTitle"), e?.message ?? ""); }
      } },
    ]);
  };

  const onDelete = () => {
    if (!requireOnline()) return;
    Alert.alert(t("contacts.deleteConfirmTitle"), t("contacts.deleteConfirmBody"), [
      { text: t("contacts.cancel"), style: "cancel" },
      { text: t("contacts.delete"), style: "destructive", onPress: async () => {
        try { await deleteContact(id); nav.goBack(); }
        catch (e: any) { Alert.alert(t("auth.errorTitle"), e?.message ?? ""); }
      } },
    ]);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  if (!contact) return <View style={styles.center}><Text style={styles.muted}>{t("contacts.detailTitle")}</Text></View>;

//   const isPos = contact.net >= 0;

  const totals = summary ?? { total_sent: contact.total_sent, total_received: contact.total_received, net: contact.net, transaction_count: contact.transaction_count };

  const showSim = sims.length >= 2;
  const simMap: Record<string, Sim> = {};
  sims.forEach((s) => (simMap[s.id] = s));

  const isPos = totals.net >= 0;

  const dateLabel = dateSel.kind === "all" ? t("tx.date")
    : dateSel.kind === "custom" ? (dateSel.to && dateSel.to !== dateSel.from ? `${fmtShort(dateSel.from!)} – ${fmtShort(dateSel.to)}` : fmtShort(dateSel.from!))
    : t(`tx.date_${dateSel.kind}` as any);
  const numLabel = filtersRef.current.numberIds.length === 0 ? t("contacts.allNumbers") : `${filtersRef.current.numberIds.length} ${t("contacts.numbersWord")}`;

  const header = (
    <View>
      <View style={styles.card}>
        {/* <Text style={[styles.netBig, { color: isPos ? colors.moneyIn : colors.moneyOut }]}>{isPos ? "+" : "−"}{money(Math.abs(contact.net))}</Text>
        <Text style={styles.netLabel}>{t("contacts.net")}</Text>
        <View style={styles.totRow}>
          <View style={styles.totCell}><Text style={[styles.totVal, { color: colors.moneyOut }]}>−{money(contact.total_sent)}</Text><Text style={styles.totCap}>{t("contacts.dir_sent")}</Text></View>
          <View style={styles.totCell}><Text style={[styles.totVal, { color: colors.moneyIn }]}>+{money(contact.total_received)}</Text><Text style={styles.totCap}>{t("contacts.dir_received")}</Text></View>
          <View style={styles.totCell}><Text style={styles.totVal}>{contact.transaction_count}</Text><Text style={styles.totCap}>{t("contacts.txnShort")}</Text></View>
        </View> */}

        <Text style={[styles.netBig, { color: isPos ? colors.moneyIn : colors.moneyOut }]}>{isPos ? "+" : "−"}{money(Math.abs(totals.net))}</Text>
        <Text style={styles.netLabel}>{t("contacts.net")}</Text>
        <View style={styles.totRow}>
          <View style={styles.totCell}><Text style={[styles.totVal, { color: colors.moneyOut }]}>−{money(totals.total_sent)}</Text><Text style={styles.totCap}>{t("contacts.dir_sent")}</Text></View>
          <View style={styles.totCell}><Text style={[styles.totVal, { color: colors.moneyIn }]}>+{money(totals.total_received)}</Text><Text style={styles.totCap}>{t("contacts.dir_received")}</Text></View>
          <View style={styles.totCell}><Text style={styles.totVal}>{totals.transaction_count}</Text><Text style={styles.totCap}>{t("contacts.txnShort")}</Text></View>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.secHead}>
          <Text style={styles.secTitle}>{t("contacts.numbers")}</Text>
          <TouchableOpacity onPress={() => { if (requireOnline()) setAddOpen(true); }} hitSlop={8}>
            <Text style={styles.addLink}>＋ {t("contacts.addNumber")}</Text>
          </TouchableOpacity>
        </View>
        {contact.numbers.map((n) => (
          <View key={n.id} style={styles.numRow}>
            <Ionicons name="call-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.numTxt}>{n.available ? localNum(n.number) : t("tx.notAvailable")}</Text>
            <TouchableOpacity onPress={() => onRemoveNumber(n.id)} hitSlop={8} style={{ marginLeft: "auto" }}>
              <Ionicons name="close" size={18} color={colors.error} />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
        <Ionicons name="trash-outline" size={18} color={colors.error} />
        <Text style={styles.deleteTxt}>{t("contacts.delete")}</Text>
      </TouchableOpacity>

      <Text style={styles.timelineTitle}>{t("contacts.timeline")}</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {contact.numbers.length > 1 ? (
          <Chip label={numLabel} active={selNumbers.length > 0} onPress={() => setNumModal(true)} icon="call-outline" chevron />
        ) : null}
        <Chip label={dateLabel} active={dateSel.kind !== "all"} onPress={openDate} icon="calendar-outline" />
      </ScrollView>

      {!online ? <Text style={styles.muted2}>{t("contacts.offlineAction")}</Text> : null}
    </View>
  );

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
        ListEmptyComponent={online ? <Text style={styles.muted2}>{t("contacts.noActivity")}</Text> : null}
        ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginVertical: 16 }} color={colors.primary} /> : null}
        // renderItem={({ item }) => (
        //   <View style={styles.txRow}>
        //     <View style={[styles.txIcon, { backgroundColor: item.direction === "in" ? "#DCFCE7" : "#FEE2E2" }]}>
        //       <Ionicons name={item.direction === "in" ? "arrow-down" : "arrow-up"} size={16} color={item.direction === "in" ? "#16A34A" : "#DC2626"} />
        //     </View>
        //     <View style={{ flex: 1, marginLeft: 11 }}>
        //       <TxSentence tx={{ ...item, balance_after: null }} style={styles.sentence} />
        //       <Text style={styles.txTime}>{new Date(item.transacted_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</Text>
        //     </View>
        //   </View>
        // )}
        renderItem={({ item }) => {
          const sim = showSim && item.phone_number_id ? simMap[item.phone_number_id] : undefined;
          const accent = sim ? simColor(sim.id) : undefined;
          return (
            <View style={styles.txRow}>
              <View style={[styles.txIcon, { backgroundColor: item.direction === "in" ? "#DCFCE7" : "#FEE2E2" }]}>
                <Ionicons name={item.direction === "in" ? "arrow-down" : "arrow-up"} size={16} color={item.direction === "in" ? "#16A34A" : "#DC2626"} />
              </View>
              <View style={{ flex: 1, marginLeft: 11 }}>
                <TxSentence tx={{ ...item, balance_after: null }} style={styles.sentence} />
                <View style={styles.metaRow}>
                  <Text style={styles.txTime}>{new Date(item.transacted_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</Text>
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

      {/* number multi-select */}
      <Modal transparent visible={numModal} animationType="slide" onRequestClose={applyNumbers}>
        <Pressable style={styles.backdropBottom} onPress={applyNumbers}>
          <Pressable style={styles.bottomSheet}>
            <Text style={styles.sheetTitle}>{t("contacts.filterNumber")}</Text>
            <TouchableOpacity style={styles.simRow} onPress={clearNumbers}>
              <Text style={styles.simTxt}>{t("contacts.allNumbers")}</Text>
              {selNumbers.length === 0 ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
            </TouchableOpacity>
            {contact.numbers.map((n) => (
              <TouchableOpacity key={n.id} style={styles.simRow} onPress={() => toggleNum(n.id)}>
                <Text style={styles.simTxt}>{n.available ? localNum(n.number) : t("tx.notAvailable")}</Text>
                {selNumbers.includes(n.id) ? <Ionicons name="checkmark-circle" size={20} color={colors.primary} /> : <Ionicons name="ellipse-outline" size={20} color={colors.border} />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.applyBtn} onPress={applyNumbers}><Text style={styles.applyTxt}>{t("tx.apply")}</Text></TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* add-number modal */}
      <Modal transparent visible={addOpen} animationType="fade" onRequestClose={() => setAddOpen(false)}>
        <Pressable style={styles.backdropCenter} onPress={() => setAddOpen(false)}>
          <Pressable style={styles.sheet}>
            <Text style={styles.sheetTitle}>{t("contacts.addNumber")}</Text>
            <PhoneField value={numDraft} onChangeText={setNumDraft} placeholder={t("contacts.numberPlaceholder")} />
            <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
              <TouchableOpacity onPress={() => setAddOpen(false)} style={{ padding: 12 }}><Text style={{ color: colors.textSecondary, fontWeight: "600" }}>{t("contacts.cancel")}</Text></TouchableOpacity>
              <TouchableOpacity onPress={onAddNumber} disabled={savingNum} style={{ padding: 12 }}>
                {savingNum ? <ActivityIndicator color={colors.primary} /> : <Text style={{ color: colors.primary, fontWeight: "700" }}>{t("contacts.save")}</Text>}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* date filter modal */}
      <Modal transparent visible={dateModal} animationType="slide" onRequestClose={() => setDateModal(false)}>
        <Pressable style={styles.backdropBottom} onPress={() => setDateModal(false)}>
          <Pressable style={styles.bottomSheet}>
            <View style={styles.presetRow}>
              {(["all", "today", "week", "month"] as DateSel["kind"][]).map((k) => (
                <TouchableOpacity key={k} style={[styles.preset, dateSel.kind === k && styles.presetActive]} onPress={() => pickPreset(k)}>
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
    </>
  );
}

function Chip({ label, active, onPress, icon, chevron }: { label: string; active: boolean; onPress: () => void; icon?: any; chevron?: boolean }) {
  return (
    <TouchableOpacity style={[styles.chip, active && styles.chipActive]} onPress={onPress} activeOpacity={0.8}>
      {icon ? <Ionicons name={icon} size={13} color={active ? "#fff" : colors.textSecondary} style={{ marginRight: 5 }} /> : null}
      <Text style={[styles.chipTxt, active && styles.chipTxtActive]}>{label}</Text>
      {chevron ? <Ionicons name="chevron-down" size={13} color={active ? "#fff" : colors.textSecondary} style={{ marginLeft: 4 }} /> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
  muted: { color: colors.textSecondary },
  muted2: { color: colors.textSecondary, fontSize: 13, textAlign: "center", marginTop: 14 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16, marginBottom: 12 },
  netBig: { fontSize: 30, fontWeight: "700", textAlign: "center" },
  netLabel: { fontSize: 13, color: colors.textSecondary, textAlign: "center", marginTop: 2 },
  totRow: { flexDirection: "row", marginTop: 16, borderTopWidth: 1, borderTopColor: "#F1F5F9", paddingTop: 14 },
  totCell: { flex: 1, alignItems: "center" },
  totVal: { fontSize: 15, fontWeight: "700", color: colors.text },
  totCap: { fontSize: 11, color: colors.textSecondary, marginTop: 3 },
  secHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  secTitle: { fontSize: 14, fontWeight: "600", color: colors.text },
  addLink: { fontSize: 13, color: colors.primary, fontWeight: "600" },
  numRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  numTxt: { fontSize: 15, color: colors.text, fontWeight: "600", marginLeft: 8 },
  deleteBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12 },
  deleteTxt: { color: colors.error, fontSize: 14, fontWeight: "600" },
  timelineTitle: { fontSize: 15, fontWeight: "600", color: colors.text, marginTop: 8, marginBottom: 4 },
  filterRow: { paddingVertical: 8, gap: 8, alignItems: "center" },
  chip: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 14, height: 34 },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipTxt: { fontSize: 13, color: colors.textSecondary },
  chipTxtActive: { color: "#fff", fontWeight: "600" },
  txRow: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  txIcon: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  sentence: { fontSize: 14, lineHeight: 20, color: colors.text },
  txTime: { fontSize: 12, color: colors.textSecondary, marginTop: 3 },
  backdropCenter: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "center", padding: 24 },
  backdropBottom: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.surface, borderRadius: 16, padding: 18 },
  bottomSheet: { backgroundColor: colors.surface, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 18, paddingBottom: 28 },
  sheetTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 12 },
  simRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  simTxt: { fontSize: 15, color: colors.text },
  presetRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  preset: { paddingHorizontal: 14, height: 34, borderRadius: 999, borderWidth: 1, borderColor: colors.border, justifyContent: "center" },
  presetActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  presetTxt: { fontSize: 13, color: colors.textSecondary },
  orPick: { fontSize: 12, color: colors.textSecondary, marginBottom: 10 },
  applyBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 13, alignItems: "center", marginTop: 16 },
  applyTxt: { color: "#fff", fontSize: 15, fontWeight: "600" },

  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 3, gap: 8 },
  simChip: { flexDirection: "row", alignItems: "center", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, flexShrink: 1 },
  simDot: { width: 4, height: 4, borderRadius: 3, marginRight: 4 },
  simChipTxt: { fontSize: 9, fontWeight: "600", flexShrink: 1 },

});




// // One person — totals, numbers (add/remove), edit, delete, and a filterable transaction timeline.
// // Filters: by a specific tracked number (if >1) and by date. Title + timeline refresh on focus,
// // so returning from an edit shows the new label/direction immediately.


// import { useCallback, useEffect, useRef, useState } from "react";
// import { ActivityIndicator, Alert, FlatList, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
// import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
// import { Ionicons } from "@expo/vector-icons";
// import { useTranslation } from "react-i18next";
// import { colors } from "../theme";
// import { useNetwork } from "../store/useNetwork";
// import { PhoneField } from "../components/PhoneField";
// import { TxSentence } from "../components/TxSentence";
// import { MiniCalendar } from "../components/MiniCalendar";
// import { normalizePhone } from "../utils/phone";
// import {
//   readContact, deleteContact, addNumber, removeNumber, getContactTransactions,
//   type TrackedContact, type ContactTx,
// } from "../data/trackedContacts";

// const money = (n: number) => "$" + (n ?? 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
// const localNum = (n?: string | null) => (n ?? "").replace(/^252/, "");
// const isTrackable = (norm: string) => /^252\d{6,12}$/.test(norm);
// const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
// const fmtShort = (s: string) => new Date(s + "T00:00:00").toLocaleDateString([], { day: "numeric", month: "short" });

// type DateSel = { kind: "all" | "today" | "week" | "month" | "custom"; from?: string; to?: string };
// function selRange(sel: DateSel): { dateFrom?: string; dateTo?: string } {
//   if (sel.kind === "all") return {};
//   if (sel.kind === "custom") return { dateFrom: sel.from, dateTo: sel.to ?? sel.from };
//   const now = new Date();
//   if (sel.kind === "today") return { dateFrom: ymd(now), dateTo: ymd(now) };
//   if (sel.kind === "week") { const s = new Date(now); s.setDate(now.getDate() - 6); return { dateFrom: ymd(s), dateTo: ymd(now) }; }
//   const s = new Date(now.getFullYear(), now.getMonth(), 1);
//   return { dateFrom: ymd(s), dateTo: ymd(now) };
// }

// export default function TrackedContactDetailScreen() {
//   const { t } = useTranslation();
//   const nav = useNavigation<any>();
//   const route = useRoute<any>();
//   const id: string = route.params?.id;
//   const online = useNetwork((s) => s.online);

//   const [contact, setContact] = useState<TrackedContact | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);

//   const [items, setItems] = useState<ContactTx[]>([]);
//   const [loadingMore, setLoadingMore] = useState(false);
//   const cursorRef = useRef<string | null>(null);
//   const hasMoreRef = useRef(false);
//   const busyRef = useRef(false);

//   // filters (state drives the chips; ref feeds the fetch so reloads always use the latest)
//   const [selNumber, setSelNumber] = useState<string | null>(null);
//   const [dateSel, setDateSel] = useState<DateSel>({ kind: "all" });
//   const filtersRef = useRef<{ numberId: string | null; dateSel: DateSel }>({ numberId: null, dateSel: { kind: "all" } });

//   const [dateModal, setDateModal] = useState(false);
//   const [calFrom, setCalFrom] = useState<string | null>(null);
//   const [calTo, setCalTo] = useState<string | null>(null);

//   const [addOpen, setAddOpen] = useState(false);
//   const [numDraft, setNumDraft] = useState("");
//   const [savingNum, setSavingNum] = useState(false);

//   const requireOnline = () => { if (!useNetwork.getState().online) { Alert.alert(t("contacts.offlineAction")); return false; } return true; };

//   const loadContact = useCallback(async () => { setContact(await readContact(id)); setLoading(false); }, [id]);

//   const loadTimeline = useCallback(async () => {
//     if (!useNetwork.getState().online) { setItems([]); cursorRef.current = null; hasMoreRef.current = false; return; }
//     const f = filtersRef.current;
//     const filters = { numberId: f.numberId, ...selRange(f.dateSel) };
//     try { const p = await getContactTransactions(id, null, filters); setItems(p.items); cursorRef.current = p.cursor; hasMoreRef.current = p.hasMore; }
//     catch { setItems([]); }
//   }, [id]);

//   // title from the loaded contact (fixes stale label after an edit)
//   useEffect(() => { if (contact) nav.setOptions({ title: contact.label }); }, [nav, contact?.label]);

//   useEffect(() => {
//     nav.setOptions({
//       headerRight: () => (
//         <TouchableOpacity hitSlop={10} onPress={() => nav.navigate("ContactForm", { id })}>
//           <Text style={{ color: colors.primary, fontSize: 15, fontWeight: "600" }}>{t("contacts.edit")}</Text>
//         </TouchableOpacity>
//       ),
//     });
//   }, [nav, id, t]);

//   // reload contact + timeline every time the screen focuses (mount and return-from-edit)
//   useFocusEffect(useCallback(() => { loadContact(); loadTimeline(); }, [loadContact, loadTimeline]));

//   const loadMore = useCallback(async () => {
//     if (!hasMoreRef.current || busyRef.current || !cursorRef.current) return;
//     busyRef.current = true; setLoadingMore(true);
//     const f = filtersRef.current;
//     const filters = { numberId: f.numberId, ...selRange(f.dateSel) };
//     try { const p = await getContactTransactions(id, cursorRef.current, filters); setItems((x) => [...x, ...p.items]); cursorRef.current = p.cursor; hasMoreRef.current = p.hasMore; }
//     catch {}
//     busyRef.current = false; setLoadingMore(false);
//   }, [id]);

//   const doRefresh = useCallback(async () => { setRefreshing(true); await loadContact(); await loadTimeline(); setRefreshing(false); }, [loadContact, loadTimeline]);

//   const pickNumber = (nid: string | null) => { setSelNumber(nid); filtersRef.current.numberId = nid; loadTimeline(); };
//   const openDate = () => { const r = selRange(dateSel); setCalFrom(r.dateFrom ?? null); setCalTo(r.dateTo && r.dateTo !== r.dateFrom ? r.dateTo : null); setDateModal(true); };
//   const pickPreset = (k: DateSel["kind"]) => { const ds = { kind: k } as DateSel; setDateSel(ds); filtersRef.current.dateSel = ds; setDateModal(false); loadTimeline(); };
//   const applyDate = () => { const ds: DateSel = calFrom ? { kind: "custom", from: calFrom, to: calTo ?? calFrom } : { kind: "all" }; setDateSel(ds); filtersRef.current.dateSel = ds; setDateModal(false); loadTimeline(); };

//   const onAddNumber = async () => {
//     const norm = normalizePhone(numDraft);
//     if (!isTrackable(norm)) { Alert.alert(t("contacts.invalidNumber")); return; }
//     setSavingNum(true);
//     try { const c = await addNumber(id, norm); setContact(c); setAddOpen(false); setNumDraft(""); await loadTimeline(); }
//     catch (e: any) { Alert.alert(t("auth.errorTitle"), e?.message ?? ""); }
//     setSavingNum(false);
//   };

//   const onRemoveNumber = (numberId: string) => {
//     if (!requireOnline()) return;
//     Alert.alert(t("contacts.removeNumberTitle"), "", [
//       { text: t("contacts.cancel"), style: "cancel" },
//       { text: t("contacts.removeNumber"), style: "destructive", onPress: async () => {
//         try {
//           await removeNumber(id, numberId);
//           if (selNumber === numberId) { setSelNumber(null); filtersRef.current.numberId = null; }
//           await loadContact(); await loadTimeline();
//         } catch (e: any) { Alert.alert(t("auth.errorTitle"), e?.message ?? ""); }
//       } },
//     ]);
//   };

//   const onDelete = () => {
//     if (!requireOnline()) return;
//     Alert.alert(t("contacts.deleteConfirmTitle"), t("contacts.deleteConfirmBody"), [
//       { text: t("contacts.cancel"), style: "cancel" },
//       { text: t("contacts.delete"), style: "destructive", onPress: async () => {
//         try { await deleteContact(id); nav.goBack(); }
//         catch (e: any) { Alert.alert(t("auth.errorTitle"), e?.message ?? ""); }
//       } },
//     ]);
//   };

//   if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
//   if (!contact) return <View style={styles.center}><Text style={styles.muted}>{t("contacts.detailTitle")}</Text></View>;

//   const isPos = contact.net >= 0;
//   const dateLabel = dateSel.kind === "all" ? t("tx.date")
//     : dateSel.kind === "custom" ? (dateSel.to && dateSel.to !== dateSel.from ? `${fmtShort(dateSel.from!)} – ${fmtShort(dateSel.to)}` : fmtShort(dateSel.from!))
//     : t(`tx.date_${dateSel.kind}` as any);

//   const header = (
//     <View>
//       <View style={styles.card}>
//         <Text style={[styles.netBig, { color: isPos ? colors.moneyIn : colors.moneyOut }]}>{isPos ? "+" : "−"}{money(Math.abs(contact.net))}</Text>
//         <Text style={styles.netLabel}>{t("contacts.net")}</Text>
//         <View style={styles.totRow}>
//           <View style={styles.totCell}><Text style={[styles.totVal, { color: colors.moneyOut }]}>−{money(contact.total_sent)}</Text><Text style={styles.totCap}>{t("contacts.dir_sent")}</Text></View>
//           <View style={styles.totCell}><Text style={[styles.totVal, { color: colors.moneyIn }]}>+{money(contact.total_received)}</Text><Text style={styles.totCap}>{t("contacts.dir_received")}</Text></View>
//           <View style={styles.totCell}><Text style={styles.totVal}>{contact.transaction_count}</Text><Text style={styles.totCap}>{t("contacts.txnShort")}</Text></View>
//         </View>
//       </View>

//       <View style={styles.card}>
//         <View style={styles.secHead}>
//           <Text style={styles.secTitle}>{t("contacts.numbers")}</Text>
//           <TouchableOpacity onPress={() => { if (requireOnline()) setAddOpen(true); }} hitSlop={8}>
//             <Text style={styles.addLink}>＋ {t("contacts.addNumber")}</Text>
//           </TouchableOpacity>
//         </View>
//         {contact.numbers.map((n) => (
//           <View key={n.id} style={styles.numRow}>
//             <Ionicons name="call-outline" size={16} color={colors.textSecondary} />
//             <Text style={styles.numTxt}>{n.available ? localNum(n.number) : t("tx.notAvailable")}</Text>
//             <TouchableOpacity onPress={() => onRemoveNumber(n.id)} hitSlop={8} style={{ marginLeft: "auto" }}>
//               <Ionicons name="close" size={18} color={colors.error} />
//             </TouchableOpacity>
//           </View>
//         ))}
//       </View>

//       <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
//         <Ionicons name="trash-outline" size={18} color={colors.error} />
//         <Text style={styles.deleteTxt}>{t("contacts.delete")}</Text>
//       </TouchableOpacity>

//       <Text style={styles.timelineTitle}>{t("contacts.timeline")}</Text>

//       {/* filter bar */}
//       <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
//         {contact.numbers.length > 1 ? (
//           <>
//             <Chip label={t("contacts.allNumbers")} active={selNumber === null} onPress={() => pickNumber(null)} icon="apps" />
//             {contact.numbers.map((n) => (
//               <Chip key={n.id} label={n.available ? localNum(n.number) : t("tx.notAvailable")} active={selNumber === n.id} onPress={() => pickNumber(n.id)} icon="call-outline" />
//             ))}
//           </>
//         ) : null}
//         <Chip label={dateLabel} active={dateSel.kind !== "all"} onPress={openDate} icon="calendar-outline" />
//       </ScrollView>

//       {!online ? <Text style={styles.muted2}>{t("contacts.offlineAction")}</Text> : null}
//     </View>
//   );

//   return (
//     <>
//       <FlatList
//         style={{ flex: 1, backgroundColor: colors.background }}
//         data={items}
//         keyExtractor={(tx) => tx.id}
//         contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
//         ListHeaderComponent={header}
//         refreshControl={<RefreshControl refreshing={refreshing} onRefresh={doRefresh} tintColor={colors.primary} />}
//         onEndReachedThreshold={0.4}
//         onEndReached={loadMore}
//         ListEmptyComponent={online ? <Text style={styles.muted2}>{t("contacts.noActivity")}</Text> : null}
//         ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginVertical: 16 }} color={colors.primary} /> : null}
//         renderItem={({ item }) => (
//           <View style={styles.txRow}>
//             <View style={[styles.txIcon, { backgroundColor: item.direction === "in" ? "#DCFCE7" : "#FEE2E2" }]}>
//               <Ionicons name={item.direction === "in" ? "arrow-down" : "arrow-up"} size={16} color={item.direction === "in" ? "#16A34A" : "#DC2626"} />
//             </View>
//             <View style={{ flex: 1, marginLeft: 11 }}>
//               <TxSentence tx={{ ...item, balance_after: null }} style={styles.sentence} />
//               <Text style={styles.txTime}>{new Date(item.transacted_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</Text>
//             </View>
//           </View>
//         )}
//       />

//       {/* add-number modal */}
//       <Modal transparent visible={addOpen} animationType="fade" onRequestClose={() => setAddOpen(false)}>
//         <Pressable style={styles.backdropCenter} onPress={() => setAddOpen(false)}>
//           <Pressable style={styles.sheet}>
//             <Text style={styles.sheetTitle}>{t("contacts.addNumber")}</Text>
//             <PhoneField value={numDraft} onChangeText={setNumDraft} placeholder={t("contacts.numberPlaceholder")} />
//             <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
//               <TouchableOpacity onPress={() => setAddOpen(false)} style={{ padding: 12 }}><Text style={{ color: colors.textSecondary, fontWeight: "600" }}>{t("contacts.cancel")}</Text></TouchableOpacity>
//               <TouchableOpacity onPress={onAddNumber} disabled={savingNum} style={{ padding: 12 }}>
//                 {savingNum ? <ActivityIndicator color={colors.primary} /> : <Text style={{ color: colors.primary, fontWeight: "700" }}>{t("contacts.save")}</Text>}
//               </TouchableOpacity>
//             </View>
//           </Pressable>
//         </Pressable>
//       </Modal>

//       {/* date filter modal (presets + calendar) */}
//       <Modal transparent visible={dateModal} animationType="slide" onRequestClose={() => setDateModal(false)}>
//         <Pressable style={styles.backdropBottom} onPress={() => setDateModal(false)}>
//           <Pressable style={styles.bottomSheet}>
//             <View style={styles.presetRow}>
//               {(["all", "today", "week", "month"] as DateSel["kind"][]).map((k) => (
//                 <TouchableOpacity key={k} style={[styles.preset, dateSel.kind === k && styles.presetActive]} onPress={() => pickPreset(k)}>
//                   <Text style={[styles.presetTxt, dateSel.kind === k && { color: "#fff" }]}>{t(`tx.date_${k}` as any)}</Text>
//                 </TouchableOpacity>
//               ))}
//             </View>
//             <Text style={styles.orPick}>{t("tx.pickDates")}</Text>
//             <MiniCalendar from={calFrom} to={calTo} onChange={(f, to) => { setCalFrom(f); setCalTo(to); }} />
//             <TouchableOpacity style={[styles.applyBtn, !calFrom && { opacity: 0.5 }]} disabled={!calFrom} onPress={applyDate}>
//               <Text style={styles.applyTxt}>{t("tx.apply")}</Text>
//             </TouchableOpacity>
//           </Pressable>
//         </Pressable>
//       </Modal>
//     </>
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

// const styles = StyleSheet.create({
//   center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
//   muted: { color: colors.textSecondary },
//   muted2: { color: colors.textSecondary, fontSize: 13, textAlign: "center", marginTop: 14 },
//   card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16, marginBottom: 12 },
//   netBig: { fontSize: 30, fontWeight: "700", textAlign: "center" },
//   netLabel: { fontSize: 13, color: colors.textSecondary, textAlign: "center", marginTop: 2 },
//   totRow: { flexDirection: "row", marginTop: 16, borderTopWidth: 1, borderTopColor: "#F1F5F9", paddingTop: 14 },
//   totCell: { flex: 1, alignItems: "center" },
//   totVal: { fontSize: 15, fontWeight: "700", color: colors.text },
//   totCap: { fontSize: 11, color: colors.textSecondary, marginTop: 3 },
//   secHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
//   secTitle: { fontSize: 14, fontWeight: "600", color: colors.text },
//   addLink: { fontSize: 13, color: colors.primary, fontWeight: "600" },
//   numRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
//   numTxt: { fontSize: 15, color: colors.text, fontWeight: "600", marginLeft: 8 },
//   deleteBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12 },
//   deleteTxt: { color: colors.error, fontSize: 14, fontWeight: "600" },
//   timelineTitle: { fontSize: 15, fontWeight: "600", color: colors.text, marginTop: 8, marginBottom: 4 },
//   filterRow: { paddingVertical: 8, gap: 8, alignItems: "center" },
//   chip: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 14, height: 34 },
//   chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
//   chipTxt: { fontSize: 13, color: colors.textSecondary },
//   chipTxtActive: { color: "#fff", fontWeight: "600" },
//   txRow: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
//   txIcon: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
//   sentence: { fontSize: 14, lineHeight: 20, color: colors.text },
//   txTime: { fontSize: 12, color: colors.textSecondary, marginTop: 3 },
//   backdropCenter: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "center", padding: 24 },
//   backdropBottom: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" },
//   sheet: { backgroundColor: colors.surface, borderRadius: 16, padding: 18 },
//   bottomSheet: { backgroundColor: colors.surface, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 18, paddingBottom: 28 },
//   sheetTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 12 },
//   presetRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
//   preset: { paddingHorizontal: 14, height: 34, borderRadius: 999, borderWidth: 1, borderColor: colors.border, justifyContent: "center" },
//   presetActive: { backgroundColor: colors.primary, borderColor: colors.primary },
//   presetTxt: { fontSize: 13, color: colors.textSecondary },
//   orPick: { fontSize: 12, color: colors.textSecondary, marginBottom: 10 },
//   applyBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 13, alignItems: "center", marginTop: 16 },
//   applyTxt: { color: "#fff", fontSize: 15, fontWeight: "600" },
// });
