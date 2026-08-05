// Report "See more" detail — full list for one block, with its own SIM filter and summary square(s).
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { colors } from "../theme";
import { readReport, readReportBudgets, readReportTracked, type ReportData, type ReportBudget, type ReportTracked } from "../data/reports";
//  import { readReportBudgets, readReportTracked, type ReportBudget, type ReportTracked } from "../data/reports";
import { readAnalytics } from "../data/analytics";
import { readSims, simLabel, type Sim } from "../data/phoneNumbers";

type Kind = "categories" | "recipients" | "senders" | "dailyInOut" | "budgets" | "tracked";

const barColor = (p: number, thr: number) => (p >= 100 ? colors.error : p >= thr ? colors.warning : colors.success);

const money = (n: number) => "$" + (n ?? 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
const localNum = (n?: string | null) => (n ?? "").replace(/^252/, "");
const fmtDate = (s: string) => new Date(s + "T00:00:00").toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
const pctW = (v: number, max: number): `${number}%` => `${max > 0 ? Math.round((v / max) * 100) : 0}%`;

const inStyle = { color: colors.moneyIn, fontWeight: "700" as const };
const outStyle = { color: colors.moneyOut, fontWeight: "700" as const };
function renderTemplate(template: string, parts: Record<string, { text: string; style?: any }>) {
  return template.split(/(\{\w+\})/g).map((seg, i) => {
    const m = seg.match(/^\{(\w+)\}$/);
    if (m && parts[m[1]]) return <Text key={i} style={parts[m[1]].style}>{parts[m[1]].text}</Text>;
    return <Text key={i}>{seg}</Text>;
  });
}


export default function ReportListScreen() {
  const { t } = useTranslation();
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const { kind, period, date, start, year, month } = (route.params ?? {}) as { kind: Kind; period: "daily" | "weekly" | "monthly"; date?: string; start?: string; year?: number; month?: number };

  // const hasCycle = kind === "categories" || kind === "dailyInOut";
  const [mode, setMode] = useState<"chart" | "plain">("chart");

  const hasCycle = kind === "categories" || kind === "dailyInOut" || kind === "budgets" || kind === "tracked";
  const hasSim = kind !== "budgets" && kind !== "tracked";



  const [sims, setSims] = useState<Sim[]>([]);
  const [selectedSims, setSelectedSims] = useState<string[]>([]);
  const [simModal, setSimModal] = useState(false);
  const [rep, setRep] = useState<ReportData | null>(null);
  const [perDay, setPerDay] = useState<{ date: string; total_in: number; total_out: number }[]>([]);
  const [totIn, setTotIn] = useState(0);
  const [totOut, setTotOut] = useState(0);
  const [loading, setLoading] = useState(true);

  // const [budgets, setBudgets] = useState<ReportBudget[]>([]); 
  // const [tracked, setTracked] = useState<ReportTracked[]>([]);
   


  useEffect(() => { readSims().then(setSims); }, []);
//   useEffect(() => {
//     nav.setOptions({ title: t(kind === "categories" ? "report.grpCategory" : kind === "recipients" ? "report.grpRecipients" : kind === "senders" ? "report.grpSenders" : "report.dailyInOutTitle") });
//   }, [nav, kind, t]);

  useEffect(() => {
    nav.setOptions({ title: t(kind === "categories" ? "report.grpCategory" : kind === "recipients" ? "report.grpRecipients" : kind === "senders" ? "report.grpSenders"  : kind === "budgets" ? "report.budgetsTitle" : kind === "tracked" ? "report.trackedTitle" : "report.dailyInOutTitle") });
  }, [nav, kind, t]);

//   useEffect(() => {
//     nav.setOptions({
//         title: t(kind === "categories" ? "report.grpCategory" : kind === "recipients" ? "report.grpRecipients" : kind === "senders" ? "report.grpSenders" : "report.dailyInOutTitle"),
//         headerRight: (kind === "categories" || kind === "dailyInOut")
//         ? () => <TouchableOpacity hitSlop={10} onPress={() => setMode((m) => (m === "chart" ? "plain" : "chart"))} style={{ paddingRight: 4 }}><Ionicons name="repeat" size={20} color={colors.primary} /></TouchableOpacity>
//         : undefined,
//     });
//   }, [nav, kind, t]);


  // const load = useCallback(async () => {
  //   setLoading(true);
  //   if (kind === "budgets") { const b = await readReportBudgets({ period, date, start, year, month }); setBudgets(b); }
  //   else if (kind === "tracked") { const c = await readReportTracked({ period, date, start, year, month }); setTracked(c); setTotIn(c.reduce((s, x) => s + x.total_received, 0)); setTotOut(c.reduce((s, x) => s + x.total_sent, 0)); }
  //   else if (kind === "dailyInOut") {
  //     const an: any = await readAnalytics(period === "weekly" ? { period: "weekly", start: start!, simIds: selectedSims } : { period: "monthly", year: year!, month: month!, simIds: selectedSims });
  //     const days = ((period === "weekly" ? an?.by_day : an?.daily_trend) ?? []).slice().sort((a: any, b: any) => (a.date < b.date ? 1 : -1));
  //     setPerDay(days); setTotIn(an?.total_in ?? 0); setTotOut(an?.total_out ?? 0);
  //   }
  //   else {
  //     const r = await readReport({ period, date, start, year, month, simIds: selectedSims });
  //     setRep(r); setTotIn(r?.total_in ?? 0); setTotOut(r?.total_out ?? 0);
  //   }
  //   setLoading(false);
  // }, [kind, period, date, start, year, month, selectedSims]);
  // useEffect(() => { load(); }, [load]);

  const [budgets, setBudgets] = useState<ReportBudget[]>([]);
  const [tracked, setTracked] = useState<ReportTracked[]>([]);
  const load = useCallback(async () => {
      setLoading(true);
      if (kind === "budgets") {
        setBudgets(await readReportBudgets({ period, date, start, year, month }));
      } else if (kind === "tracked") {
        const c = await readReportTracked({ period, date, start, year, month });
        setTracked(c);
        setTotIn(c.reduce((s, x) => s + x.total_received, 0));
        setTotOut(c.reduce((s, x) => s + x.total_sent, 0));
      } else if (kind === "dailyInOut") {
        const an: any = await readAnalytics(period === "weekly" ? { period: "weekly", start: start!, simIds: selectedSims } : { period: "monthly", year: year!, month: month!, simIds: selectedSims });
        const days = ((period === "weekly" ? an?.by_day : an?.daily_trend) ?? []).slice().sort((a: any, b: any) => (a.date < b.date ? 1 : -1));
        setPerDay(days); setTotIn(an?.total_in ?? 0); setTotOut(an?.total_out ?? 0);
      } else {
        const r = await readReport({ period, date, start, year, month, simIds: selectedSims });
        setRep(r); setTotIn(r?.total_in ?? 0); setTotOut(r?.total_out ?? 0);
      }
      setLoading(false);
  }, [kind, period, date, start, year, month, selectedSims]);
  useEffect(() => { load(); }, [load]);

  const toggleSim = (id: string) => setSelectedSims((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const simLabelTxt = selectedSims.length === 0 ? t("tx.allSims") : `${selectedSims.length} ${t("tx.sims")}`;
  const whoName = (name: string | null, number: string | null) => name ? (number ? `${name} (${localNum(number)})` : name) : (number ? localNum(number) : t("tx.unknownParty"));

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;

  const cats = rep?.by_category ?? [];
  const recips = rep?.top_recipients ?? [];
  const senders = rep?.top_senders ?? [];
  const truncated = kind === "recipients" ? rep?.recipients_truncated : kind === "senders" ? rep?.senders_truncated : false;
  const listData: any[] = kind === "categories" ? cats : kind === "recipients" ? recips : kind === "senders" ? senders : kind === "budgets" ? budgets : kind === "tracked" ? tracked : perDay;
  const maxCat = Math.max(cats[0]?.amount ?? 0, 1);
  const maxDay = Math.max(...perDay.flatMap((d) => [d.total_in, d.total_out]), 1);

  const header = (
    <View>
      {/* <View style={styles.controls}>
        <TouchableOpacity style={[styles.pill, selectedSims.length > 0 && styles.pillActive]} onPress={() => setSimModal(true)}>
            <Ionicons name="phone-portrait-outline" size={14} color={selectedSims.length > 0 ? "#fff" : colors.textSecondary} />
            <Text style={[styles.pillTxt, selectedSims.length > 0 && { color: "#fff" }]}>{simLabelTxt}</Text>
            <Ionicons name="chevron-down" size={13} color={selectedSims.length > 0 ? "#fff" : colors.textSecondary} />
        </TouchableOpacity>
        {hasCycle ? (
            <TouchableOpacity hitSlop={8} onPress={() => setMode((m) => (m === "chart" ? "plain" : "chart"))} style={styles.cycleBtn}>
            <Ionicons name="repeat" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
        ) : null}
      </View> */}

      <View style={styles.controls}>
        {hasSim ? (
          <TouchableOpacity style={[styles.pill, selectedSims.length > 0 && styles.pillActive]} onPress={() => setSimModal(true)}>
            <Ionicons name="phone-portrait-outline" size={14} color={selectedSims.length > 0 ? "#fff" : colors.textSecondary} />
            <Text style={[styles.pillTxt, selectedSims.length > 0 && { color: "#fff" }]}>{simLabelTxt}</Text>
            <Ionicons name="chevron-down" size={13} color={selectedSims.length > 0 ? "#fff" : colors.textSecondary} />
          </TouchableOpacity>
        ) : <View />}
        {hasCycle ? (
          <TouchableOpacity hitSlop={8} onPress={() => setMode((m) => (m === "chart" ? "plain" : "chart"))} style={styles.cycleBtn}>
            <Ionicons name="repeat" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </View>


      <View style={styles.squares}>
        {/* {kind === "senders" ? <Square label={t("report.totalReceived")} value={money(totIn)} color={colors.moneyIn} />
          : kind === "dailyInOut" ? <><Square label={t("report.totalReceived")} value={money(totIn)} color={colors.moneyIn} /><Square label={t("report.totalSpent")} value={money(totOut)} color={colors.moneyOut} /></>
          : <Square label={t("report.totalSpent")} value={money(totOut)} color={colors.moneyOut} />} */}     
        {kind === "senders" ? <Square label={t("report.totalReceived")} value={money(totIn)} color={colors.moneyIn} />
          : kind === "dailyInOut" || kind === "tracked" ? <><Square label={t("report.totalReceived")} value={money(totIn)} color={colors.moneyIn} /><Square label={t("report.totalSpent")} value={money(totOut)} color={colors.moneyOut} /></>
          : kind === "budgets" ? null
          : <Square label={t("report.totalSpent")} value={money(totOut)} color={colors.moneyOut} />}

      </View>
      {truncated ? <Text style={styles.note}>{t("report.cappedNote")}</Text> : null}
    </View>
  ); 

//   const renderItem = ({ item }: any) => {
//     if (kind === "categories") {
//       return (
//         <View style={styles.row}>
//           <View style={styles.rowTop}><Text style={styles.rowName}>{item.name}</Text><Text style={styles.rowAmt}>{money(item.amount)} · {item.percent_of_spending}%</Text></View>
//           <View style={styles.track}><View style={[styles.fill, { width: pctW(item.amount, maxCat), backgroundColor: colors.primary }]} /></View>
//         </View>
//       );
//     }
//     if (kind === "recipients" || kind === "senders") {
//       const isRecip = kind === "recipients";
//       return (
//         <View style={styles.cpRow}>
//           <Ionicons name={isRecip ? "arrow-up" : "arrow-down"} size={16} color={isRecip ? colors.moneyOut : colors.moneyIn} style={{ marginTop: 2 }} />
//           <View style={{ flex: 1, marginLeft: 8 }}>
//             <Text style={styles.cpName}>{whoName(item.counterparty_name, item.counterparty_number)}</Text>
//             <Text style={styles.cpMeta}>{item.count} {t("report.txns")}</Text>
//           </View>
//           <Text style={[styles.cpAmt, { color: isRecip ? colors.moneyOut : colors.moneyIn }]}>{money(item.total)}</Text>
//         </View>
//       );
//     }
//     return (
//       <View style={styles.row}>
//         <Text style={styles.dayLbl}>{fmtDate(item.date)}</Text>
//         <View style={styles.dayBarRow}><View style={[styles.track, { flex: 1 }]}><View style={[styles.fill, { width: pctW(item.total_in, maxDay), backgroundColor: colors.moneyIn }]} /></View><Text style={styles.dayVal}>{money(item.total_in)}</Text></View>
//         <View style={styles.dayBarRow}><View style={[styles.track, { flex: 1 }]}><View style={[styles.fill, { width: pctW(item.total_out, maxDay), backgroundColor: colors.moneyOut }]} /></View><Text style={styles.dayVal}>{money(item.total_out)}</Text></View>
//       </View>
//     );
//   };


  const renderItem = ({ item }: any) => {
    // categories
    if (kind === "categories") {
        if (mode === "plain") {
        return (
            <View style={styles.plainRow}>
            <Ionicons name="pricetag-outline" size={14} color={colors.textSecondary} style={{ marginTop: 3 }} />
            <Text style={styles.plainTxt}>
                {item.category_id == null
                ? renderTemplate(t("report.uncatLine"), { amount: { text: money(item.amount), style: outStyle }, pct: { text: String(item.percent_of_spending) } })
                : renderTemplate(t("report.catLine"), { amount: { text: money(item.amount), style: outStyle }, category: { text: item.name, style: { fontWeight: "700" } }, pct: { text: String(item.percent_of_spending) } })}
            </Text>
            </View>
        );
        }
        return (
        <View style={styles.row}>
            <View style={styles.rowTop}><Text style={styles.rowName}>{item.name}</Text><Text style={styles.rowAmt}>{money(item.amount)}</Text></View>
            <View style={styles.track}><View style={[styles.fill, { width: pctW(item.amount, maxCat), backgroundColor: colors.primary }]} /></View>
        </View>
        );
    }
    // who you sent / who sent you — identical to the report page sentence
    if (kind === "recipients" || kind === "senders") {
        const isRecip = kind === "recipients";
        return (
        <View style={styles.plainRow}>
            <Ionicons name={isRecip ? "arrow-up" : "arrow-down"} size={14} color={isRecip ? colors.moneyOut : colors.moneyIn} style={{ marginTop: 3 }} />
            <Text style={styles.plainTxt}>
            {renderTemplate(t(isRecip ? "report.recipientLine" : "report.senderLine"), {
                who: { text: whoName(item.counterparty_name, item.counterparty_number) },
                amount: { text: money(item.total), style: isRecip ? outStyle : inStyle },
                count: { text: String(item.count) },
            })}
            </Text>
        </View>
        );
    }

    if (kind === "budgets") {
      const pct = item.limit_amount > 0 ? Math.round((item.window_spent / item.limit_amount) * 100) : 0;
      const over = item.window_spent - item.limit_amount;
      if (mode === "plain") return (
        <TouchableOpacity activeOpacity={0.7} onPress={() => nav.navigate("SpendingAlertDetail", { alert: item })}>
          <View style={styles.plainRow}><Ionicons name="wallet-outline" size={14} color={over > 0 ? colors.error : colors.success} style={{ marginTop: 3 }} />
            <Text style={styles.plainTxt}>{renderTemplate(t(over > 0 ? "report.budgetPlainOver" : "report.budgetPlainOk"), { category: { text: item.category.name }, spent: { text: money(item.window_spent), style: outStyle }, limit: { text: money(item.limit_amount) }, over: { text: money(Math.abs(over)), style: outStyle } })}</Text>
          </View>
        </TouchableOpacity>
      );
      return (
        <TouchableOpacity style={styles.row} activeOpacity={0.7} onPress={() => nav.navigate("SpendingAlertDetail", { alert: item })}>
          <View style={styles.rowTop}><Text style={styles.rowName}>{item.category.name}</Text><Text style={styles.rowAmt}>{money(item.window_spent)} / {money(item.limit_amount)}</Text></View>
          <View style={styles.track}><View style={[styles.fill, { width: `${Math.min(pct, 100)}%` as `${number}%`, backgroundColor: barColor(pct, item.alert_threshold) }]} /></View>
          {over > 0 ? <Text style={styles.note}>{t("report.budgetOver", { amount: money(over) })}</Text> : null}
        </TouchableOpacity>
      );
    }
    if (kind === "tracked") {
      if (mode === "plain") return (
        <TouchableOpacity activeOpacity={0.7} onPress={() => nav.navigate("TrackedContactDetail", { id: item.id, label: item.label })}>
          <View style={styles.plainRow}><Ionicons name="person-outline" size={14} color={colors.textSecondary} style={{ marginTop: 3 }} />
            <Text style={styles.plainTxt}>{renderTemplate(t("report.trackedPlain"), { who: { text: item.label }, sent: { text: money(item.total_sent), style: outStyle }, received: { text: money(item.total_received), style: inStyle }, count: { text: String(item.count) } })}</Text>
          </View>
        </TouchableOpacity>
      );
      return (
        <TouchableOpacity style={styles.cpRow} activeOpacity={0.7} onPress={() => nav.navigate("TrackedContactDetail", { id: item.id, label: item.label })}>
          <View style={{ flex: 1 }}><Text style={styles.cpName}>{item.label}</Text><Text style={styles.cpMeta}>{item.count} {t("report.txns")}</Text></View>
          <View style={{ alignItems: "flex-end" }}><Text style={[styles.cpAmt, { color: colors.moneyOut }]}>− {money(item.total_sent)}</Text><Text style={[styles.cpMeta, { color: colors.moneyIn }]}>+ {money(item.total_received)}</Text></View>
        </TouchableOpacity>
      );
    }

    // daily in/out
    if (mode === "plain") {
        return (
        <View style={styles.plainRow}>
            <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} style={{ marginTop: 3 }} />
            <Text style={styles.plainTxt}>
            {renderTemplate(t("analytics.trendLine"), { label: { text: fmtDate(item.date) }, in: { text: money(item.total_in), style: inStyle }, out: { text: money(item.total_out), style: outStyle } })}
            </Text>
        </View>
        );
    }
    return (
        <View style={styles.row}>
        <Text style={styles.dayLbl}>{fmtDate(item.date)}</Text>
        <View style={styles.dayBarRow}><View style={[styles.track, { flex: 1 }]}><View style={[styles.fill, { width: pctW(item.total_in, maxDay), backgroundColor: colors.moneyIn }]} /></View><Text style={styles.dayVal}>{money(item.total_in)}</Text></View>
        <View style={styles.dayBarRow}><View style={[styles.track, { flex: 1 }]}><View style={[styles.fill, { width: pctW(item.total_out, maxDay), backgroundColor: colors.moneyOut }]} /></View><Text style={styles.dayVal}>{money(item.total_out)}</Text></View>
        </View>
    );
  };

  return (
    <>
      <FlatList
        style={{ flex: 1, backgroundColor: colors.background }}
        data={listData}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
        ListHeaderComponent={header}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={styles.empty}>{t("report.empty")}</Text>}
      />
      <Modal transparent visible={simModal} animationType="slide" onRequestClose={() => setSimModal(false)}>
        <Pressable style={styles.backdrop} onPress={() => setSimModal(false)}>
          <Pressable style={styles.sheet}>
            <Text style={styles.sheetTitle}>{t("tx.filterSim")}</Text>
            <TouchableOpacity style={styles.simRow} onPress={() => setSelectedSims([])}><Text style={styles.simTxt}>{t("tx.allSims")}</Text>{selectedSims.length === 0 ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}</TouchableOpacity>
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
    </>
  );
}

function Square({ label, value, color }: { label: string; value: string; color: string }) {
  return <View style={styles.square}><Text style={styles.squareLbl}>{label}</Text><Text style={[styles.squareVal, { color }]}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
//   controls: { flexDirection: "row", marginBottom: 12 },
  pill: { flexDirection: "row", alignItems: "center", gap: 5, height: 34, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  pillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillTxt: { fontSize: 13, color: colors.textSecondary },
  squares: { flexDirection: "row", gap: 10 },
  square: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 12 },
  squareLbl: { fontSize: 12, color: colors.textSecondary },
  squareVal: { fontSize: 20, fontWeight: "700", marginTop: 6 },
  note: { fontSize: 12, color: colors.textSecondary, fontStyle: "italic", marginTop: 12 },
  row: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, marginTop: 10 },
  rowTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  rowName: { fontSize: 14, color: colors.text, fontWeight: "500", flex: 1 },
  rowAmt: { fontSize: 13, fontWeight: "600", color: colors.text },
  track: { height: 9, backgroundColor: "#F1F5F9", borderRadius: 6, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 6 },
  cpRow: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, marginTop: 10 },
  cpName: { fontSize: 14, color: colors.text, fontWeight: "500" },
  cpMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  cpAmt: { fontSize: 14, fontWeight: "700" },
  dayLbl: { fontSize: 12, color: colors.textSecondary, marginBottom: 4 },
  dayBarRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  dayVal: { fontSize: 12, fontWeight: "600", color: colors.text, minWidth: 62, textAlign: "right" },
  empty: { fontSize: 14, color: colors.textSecondary, textAlign: "center", marginTop: 30 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 18, paddingBottom: 28 },
  sheetTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 6 },
  simRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  simTxt: { fontSize: 15, color: colors.text },
  applyBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 13, alignItems: "center", marginTop: 16 },
  applyTxt: { color: "#fff", fontSize: 15, fontWeight: "600" },

  plainRow: { flexDirection: "row", alignItems: "flex-start", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, marginTop: 10 },
  plainTxt: { flex: 1, fontSize: 14, lineHeight: 20, color: colors.text, marginLeft: 8 },

  controls: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  cycleBtn: { width: 36, height: 36, borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  
});