// Analytics: Daily/Monthly toggle + date/month picker + SIM filter. Meaning-first —
// summary sentence + in/out bars, category bars, monthly trend, and highlight sentences.
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { colors } from "../theme";
import { useSync } from "../store/useSync";
import { syncAll, getLastSynced } from "../data/sync";
import { readSims, simLabel, type Sim } from "../data/phoneNumbers";
import { MiniCalendar } from "../components/MiniCalendar";
import { useNavigation } from "@react-navigation/native";
import { readAnalytics, type DailyAnalytics, type WeeklyAnalytics, type MonthlyAnalytics, type AnalyticsSel } from "../data/analytics";
import { EmptyState } from "../components/EmptyState";
import { CoachTip } from "../components/CoachTip";
import { hasSeen, markSeen } from "../onboarding";
import { TrendChart, type TrendPoint } from "../components/TrendChart";

// import { type WeeklyAnalytics, type MonthlyAnalytics } from "../data/analytics"; // (extend the existing import)

const money = (n: number) => "$" + (n ?? 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
const pctW = (v: number, max: number): `${number}%` => `${max > 0 ? Math.round((v / max) * 100) : 0}%`;
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fmtDay = (s: string) => new Date(s + "T00:00:00").toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });

const fmtShort = (s: string) => new Date(s + "T00:00:00").toLocaleDateString([], { day: "numeric", month: "short" });
const weekRange = (ws: string) => {
  const s = new Date(ws + "T00:00:00"); const e = new Date(s); e.setDate(s.getDate() + 6);
  const day = (x: Date) => x.getDate();
  const mo = (x: Date) => x.toLocaleDateString([], { month: "short" });
  return mo(s) === mo(e) ? `${day(s)}–${day(e)} ${mo(e)}` : `${day(s)} ${mo(s)} – ${day(e)} ${mo(e)}`;
};
const inStyle = { color: colors.moneyIn, fontWeight: "700" as const };
const outStyle = { color: colors.moneyOut, fontWeight: "700" as const };
const keptStyle = { color: colors.primaryDark, fontWeight: "700" as const };
function renderTemplate(template: string, parts: Record<string, { text: string; style?: any }>) {
  return template.split(/(\{\w+\})/g).map((seg, i) => {
    const m = seg.match(/^\{(\w+)\}$/);
    if (m && parts[m[1]]) return <Text key={i} style={parts[m[1]].style}>{parts[m[1]].text}</Text>;
    return <Text key={i}>{seg}</Text>;
  });
}
function BlockHeader({ title, mode, onToggle }: { title: string; mode: "chart" | "plain"; onToggle: () => void }) {
  return (
    <View style={styles.blockHead}>
      <Text style={styles.cardTitle}>{title}</Text>
      <TouchableOpacity hitSlop={8} onPress={onToggle}><Ionicons name="repeat" size={18} color={colors.textSecondary} /></TouchableOpacity>
    </View>
  );
}

const SO_MONTHS = ["Janaayo", "Febraayo", "Maarso", "Abriil", "Maajo", "Juun", "Luuliyo", "Ogosto", "Sebtembar", "Oktoobar", "Nofembar", "Diseembar"];


// type Period = "daily" | "monthly";
type Period = "daily" | "weekly" | "monthly";

export default function AnalyticsScreen() {
  const { t } = useTranslation();
  const now = new Date();

  const weekStartOf = (d: Date) => { const x = new Date(d); x.setDate(x.getDate() - ((x.getDay() + 1) % 7)); return ymd(x); };
  const [weekStart, setWeekStart] = useState(weekStartOf(now));

  const nav = useNavigation<any>();
  
  const [period, setPeriod] = useState<Period>("monthly");
  const [date, setDate] = useState(ymd(now));
  const [ym, setYm] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });
  const [sims, setSims] = useState<Sim[]>([]);
  const [selectedSims, setSelectedSims] = useState<string[]>([]);
  const [simModal, setSimModal] = useState(false);
  const [dateModal, setDateModal] = useState(false);

  // const [data, setData] = useState<DailyAnalytics | MonthlyAnalytics | null>(null);
  const [data, setData] = useState<DailyAnalytics | WeeklyAnalytics | MonthlyAnalytics | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);

  const [mode1, setMode1] = useState<"chart" | "plain">("chart");
  const [mode2, setMode2] = useState<"chart" | "plain">("chart");
  const [mode3, setMode3] = useState<"chart" | "plain">("chart");

  useEffect(() => { readSims().then(setSims); }, []);

  const [tipAnalytics, setTipAnalytics] = useState(false);
  useEffect(() => { (async () => { if (await hasSeen("intro") && !(await hasSeen("tipAnalytics"))) setTipAnalytics(true); })(); }, []);

  const dismissTipAnalytics = async () => {
    markSeen("tipAnalytics"); setTipAnalytics(false);
    if (!(await hasSeen("tipAnalyticsCycle"))) setTipCycle(true);   // show the cycle tip next
  };

  const [tipCycle, setTipCycle] = useState(false);
  useEffect(() => { (async () => {
    if (await hasSeen("intro") && await hasSeen("tipAnalytics") && !(await hasSeen("tipAnalyticsCycle"))) setTipCycle(true);
  })(); }, []);
  const dismissTipCycle = () => { markSeen("tipAnalyticsCycle"); setTipCycle(false); };

  // const dismissTipAnalytics = () => { markSeen("tipAnalytics"); setTipAnalytics(false); };

  // const [tipCycle, setTipCycle] = useState(false);
  // useEffect(() => { (async () => {
  //   if (await hasSeen("intro") && await hasSeen("tipAnalytics") && !(await hasSeen("tipAnalyticsCycle"))) setTipCycle(true);
  // })(); }, []);
  // const dismissTipCycle = () => { markSeen("tipAnalyticsCycle"); setTipCycle(false); };


  const load = useCallback(async () => {
    setLoading(true);
    const sel: AnalyticsSel =
      period === "daily" ? { period: "daily", date, simIds: selectedSims }
      : period === "weekly" ? { period: "weekly", start: weekStart, simIds: selectedSims }
      : { period: "monthly", year: ym.year, month: ym.month, simIds: selectedSims };
    setData(await readAnalytics(sel));
    setLoading(false);
    getLastSynced().then(setLastSynced).catch(() => {});
  }, [period, date, ym.year, ym.month, weekStart, selectedSims]);

  useEffect(() => { load(); }, [load]);
  const syncTick = useSync((s) => s.tick);
  useEffect(() => { if (syncTick > 0) load(); }, [syncTick, load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const doRefresh = useCallback(async () => { setRefreshing(true); try { await syncAll(); } catch {} await load(); setRefreshing(false); }, [load]);

  const toggleSim = (id: string) => setSelectedSims((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const stepMonth = (delta: number) => {
    let y = ym.year, m = ym.month + delta;
    if (m < 1) { m = 12; y -= 1; } if (m > 12) { m = 1; y += 1; }
    const cy = now.getFullYear(), cm = now.getMonth() + 1;
    if (y < 2026 || y > cy || (y === cy && m > cm)) return;
    setYm({ year: y, month: m });
  };

  const stepDay = (delta: number) => { const d = new Date(date + "T00:00:00"); d.setDate(d.getDate() + delta); const s = ymd(d); if (s > ymd(now)) return; setDate(s); };
  const atToday = date >= ymd(now);
  // const atCurrentWeek = weekStart >= weekStartOf(now);
  // const atCurrentMonth = ym.year === now.getFullYear() && ym.month === now.getMonth() + 1;

  const atCurrentWeek = weekStart >= weekStartOf(now);
  const atCurrentMonth = ym.year === now.getFullYear() && ym.month === now.getMonth() + 1;
  const goBack = () => (period === "weekly" ? stepWeek(-1) : stepMonth(-1));
  const goFwd  = () => (period === "weekly" ? stepWeek(1) : stepMonth(1));
  const atPresent = period === "weekly" ? atCurrentWeek : atCurrentMonth;
  const onPickDate = (f: string) => {
    const d = new Date(f + "T00:00:00");
    if (period === "daily") setDate(f);
    else if (period === "weekly") setWeekStart(weekStartOf(d));
    else setYm({ year: d.getFullYear(), month: d.getMonth() + 1 });
  };
  const pickerAnchor = period === "daily" ? date : period === "weekly" ? weekStart : ymd(new Date(ym.year, ym.month - 1, 1));

  

  const stepWeek = (delta: number) => {
    const d = new Date(weekStart + "T00:00:00"); d.setDate(d.getDate() + delta * 7);
    const s = ymd(d); if (s > weekStartOf(new Date())) return; setWeekStart(s);
  };
  const weekLabel = (() => { const s = new Date(weekStart + "T00:00:00"); const e = new Date(s); e.setDate(s.getDate() + 6);
    return `${s.toLocaleDateString([], { day: "numeric", month: "short" })} – ${e.toLocaleDateString([], { day: "numeric", month: "short" })}`; })();


  const simLabelTxt = selectedSims.length === 0 ? t("tx.allSims") : `${selectedSims.length} ${t("tx.sims")}`;
  const monthLabel = new Date(ym.year, ym.month - 1, 1).toLocaleDateString([], { month: "long", year: "numeric" });
  const dateLabel = date === ymd(now) ? t("tx.today") : fmtDay(date);

  const totalIn = data?.total_in ?? 0, totalOut = data?.total_out ?? 0, net = data?.net ?? 0;
  const maxBar = Math.max(totalIn, totalOut, 1);
  const cats = data?.by_category ?? [];
  const maxCat = Math.max(cats[0]?.amount ?? 0, 1);

  const lead = period === "daily" ? t("analytics.leadDaily") : period === "weekly" ? t("analytics.leadWeekly") : t("analytics.leadMonthly");
  const trendPoints: TrendPoint[] = (() => {
    if (!data) return [];
    if (period === "weekly") {
      const byDay = new Map(((data as WeeklyAnalytics).by_day ?? []).map((d) => [d.date, d]));
      return Array.from({ length: 7 }, (_, i) => {
        const dt = new Date(weekStart + "T00:00:00"); dt.setDate(dt.getDate() + i); const ds = ymd(dt);
        const d = byDay.get(ds);
        return { label: fmtShort(ds), in: d?.total_in ?? 0, out: d?.total_out ?? 0 };
      });
    }
    if (period === "monthly") {
      const map = new Map<string, { in: number; out: number }>();
      for (const d of ((data as MonthlyAnalytics).daily_trend ?? [])) {
        const ws = weekStartOf(new Date(d.date + "T00:00:00"));
        const b = map.get(ws) ?? { in: 0, out: 0 }; b.in += d.total_in; b.out += d.total_out; map.set(ws, b);
      }
      return [...map.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([ws, b]) => {
        const e = new Date(ws + "T00:00:00"); e.setDate(e.getDate() + 6);
        // return { label: fmtShort(ws), popupTitle: `${fmtShort(ws)} – ${fmtShort(ymd(e))}`, in: b.in, out: b.out };
        return { label: weekRange(ws), popupTitle: weekRange(ws), in: b.in, out: b.out };
      });
    }
    return [];
  })();


  const isEmpty = !data || data.transaction_count === 0;
  const syncedLabel = lastSynced ? new Date(lastSynced).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ paddingBottom: 28 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={doRefresh} tintColor={colors.primary} />}>

        <View style={styles.controls}>
          <View style={styles.segment}>
            {(["daily", "weekly", "monthly"] as Period[]).map((pd, i) => (
              <TouchableOpacity key={pd} onPress={() => setPeriod(pd)} style={[styles.segBtn, i > 0 && styles.segDiv, period === pd && styles.segActive]}>
                <Text style={[styles.segTxt, period === pd && styles.segTxtActive]}>{t(`analytics.${pd}`)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.dateNav}>
          {period === "daily" ? (
            <TouchableOpacity style={styles.pill} onPress={() => setDateModal(true)}>
              <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} /><Text style={styles.pillTxt}>{dateLabel}</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.stepper}>
              <TouchableOpacity onPress={goBack} hitSlop={8}><Ionicons name="chevron-back" size={20} color={colors.text} /></TouchableOpacity>
              <TouchableOpacity onPress={() => setDateModal(true)}><Text style={styles.stepTxt}>{period === "weekly" ? weekLabel : monthLabel}</Text></TouchableOpacity>
              <TouchableOpacity onPress={goFwd} hitSlop={8} disabled={atPresent}><Ionicons name="chevron-forward" size={20} color={atPresent ? colors.border : colors.text} /></TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.controls2}>
          <TouchableOpacity style={[styles.pill, selectedSims.length > 0 && styles.pillActive]} onPress={() => setSimModal(true)}>
            <Ionicons name="phone-portrait-outline" size={14} color={selectedSims.length > 0 ? "#fff" : colors.textSecondary} />
            <Text style={[styles.pillTxt, selectedSims.length > 0 && { color: "#fff" }]}>{simLabelTxt}</Text>
            <Ionicons name="chevron-down" size={13} color={selectedSims.length > 0 ? "#fff" : colors.textSecondary} />
          </TouchableOpacity>
          <View style={styles.syncRow}><Ionicons name="refresh" size={12} color={colors.textSecondary} /><Text style={styles.syncTxt}> {t("home.lastSynced")} {syncedLabel}</Text></View>
        </View>

        {loading ? <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
          // : isEmpty ? <View style={styles.card}><Text style={styles.empty}>{t("analytics.empty")}</Text></View>
          : isEmpty ? <EmptyState icon="bar-chart-outline" title={t("analytics.empty")} />
          : <>
            {/* <View style={styles.card}>
              <Text style={styles.cardTitle}>{period === "daily" ? dateLabel : period === "weekly" ? weekLabel : monthLabel}</Text>
              <View style={styles.keptRow}>
                <Ionicons name={net >= 0 ? "checkmark-circle" : "alert-circle"} size={18} color={net >= 0 ? colors.success : colors.error} />
                <Text style={styles.keptTxt}> {net >= 0 ? t("analytics.kept") : t("analytics.overspent")} <Text style={{ fontWeight: "700", color: net >= 0 ? colors.primaryDark : colors.error }}>{money(Math.abs(net))}</Text></Text>
              </View>
              <Bar label={t("analytics.received")} value={money(totalIn)} width={pctW(totalIn, maxBar)} color={colors.moneyIn} />
              <Bar label={t("analytics.spent")} value={money(totalOut)} width={pctW(totalOut, maxBar)} color={colors.moneyOut} />
              <Text style={styles.count}>{data!.transaction_count} {t("analytics.txns")}</Text>
            </View> */}

            {/* <View style={styles.card}>
              <Text style={styles.cardTitle}>{t("analytics.whereTitle")}</Text>
              {cats.length === 0 ? <Text style={styles.empty}>{t("analytics.noSpending")}</Text>
                : cats.map((c, i) => (
                  <View key={i} style={{ marginTop: 11 }}>
                    <View style={styles.lineTop}><Text style={styles.catName}>{c.name}</Text><Text style={styles.catAmt}>{money(c.amount)}</Text></View>
                    <View style={styles.track}><View style={[styles.fill, { width: pctW(c.amount, maxCat), backgroundColor: colors.primary }]} /></View>
                  </View>
                ))}
            </View> */}
            {/* <View style={styles.card}>
              <Text style={styles.cardTitle}>{t("analytics.highlights")}</Text>
              {period === "daily" ? <>
                {(data as DailyAnalytics).largest_in ? <Hl icon="arrow-down" color={colors.moneyIn} text={t("analytics.largestIn", { amount: money((data as DailyAnalytics).largest_in!) })} /> : null}
                {(data as DailyAnalytics).largest_out ? <Hl icon="arrow-up" color={colors.moneyOut} text={t("analytics.largestOut", { amount: money((data as DailyAnalytics).largest_out!) })} /> : null}
              </> : <>
                {(data as any).busiest_day ? <Hl icon="calendar" color={colors.info} text={t("analytics.busiestDay", { date: fmtDay((data as any).busiest_day) })} /> : null}
                {(data as any).busiest_hour != null ? <Hl icon="time" color={colors.info} text={t("analytics.busiestHour", { hour: String((data as any).busiest_hour) })} /> : null}
                </>
              }
            </View> */}


            {/* Block 1 — summary */}
            <View style={styles.card}>
              <BlockHeader title={period === "daily" ? dateLabel : period === "weekly" ? weekLabel : monthLabel} mode={mode1} onToggle={() => setMode1(mode1 === "chart" ? "plain" : "chart")} />
              {mode1 === "chart" ? (
                <>
                  <View style={styles.keptRow}>
                    <Ionicons name={net >= 0 ? "checkmark-circle" : "alert-circle"} size={18} color={net >= 0 ? colors.success : colors.error} />
                    <Text style={styles.keptTxt}> {net >= 0 ? t("analytics.kept") : t("analytics.overspent")} <Text style={{ fontWeight: "700", color: net >= 0 ? colors.primaryDark : colors.error }}>{money(Math.abs(net))}</Text></Text>
                  </View>
                  <Bar label={t("analytics.received")} value={money(totalIn)} width={pctW(totalIn, maxBar)} color={colors.moneyIn} />
                  <Bar label={t("analytics.spent")} value={money(totalOut)} width={pctW(totalOut, maxBar)} color={colors.moneyOut} />
                  <Text style={styles.count}>{data!.transaction_count} {t("analytics.txns")}</Text>
                </>
              ) : (
                <Text style={styles.plain}>
                  {net >= 0
                    ? renderTemplate(t("analytics.sumSentencePos"), { lead: { text: lead }, in: { text: money(totalIn), style: inStyle }, out: { text: money(totalOut), style: outStyle }, net: { text: money(net), style: keptStyle }, count: { text: String(data!.transaction_count), style: { fontWeight: "700" } } })
                    : renderTemplate(t("analytics.sumSentenceNeg"), { lead: { text: lead }, deficit: { text: money(Math.abs(net)), style: outStyle }, in: { text: money(totalIn), style: inStyle }, out: { text: money(totalOut), style: outStyle }, count: { text: String(data!.transaction_count), style: { fontWeight: "700" } } })}
                </Text>
              )}
              {tipCycle ? (
                <CoachTip
                  text={t("onboarding.tipAnalyticsCycle")}
                  onDismiss={dismissTipCycle}
                  arrow="top-right"
                  style={{ top: 38, left: 12, right: 12 }}   // relative to THIS card, under the cycle icon
                />
              ) : null}
            </View>

            {/* Block 2 — where money went */}
            <View style={styles.card}>
              <BlockHeader title={t("analytics.whereTitle")} mode={mode2} onToggle={() => setMode2(mode2 === "chart" ? "plain" : "chart")} />
              {cats.length === 0 ? <Text style={styles.empty}>{t("analytics.noSpending")}</Text>
                : mode2 === "chart" ? cats.slice(0, 7).map((c, i) => (
                    <View key={i} style={{ marginTop: 11 }}>
                      <View style={styles.lineTop}><Text style={styles.catName}>{c.name}</Text><Text style={styles.catAmt}>{money(c.amount)}</Text></View>
                      <View style={styles.track}><View style={[styles.fill, { width: pctW(c.amount, maxCat), backgroundColor: colors.primary }]} /></View>
                    </View>
                  ))
                // : cats.map((c, i) => {
                : cats.slice(0, 7).map((c, i) => {
                    const p = totalOut > 0 ? Math.round((c.amount / totalOut) * 1000) / 10 : 0;
                    return (
                      <View key={i} style={styles.plainLine}>
                        <Ionicons name="pricetag-outline" size={14} color={colors.textSecondary} style={{ marginTop: 3 }} />
                        <Text style={styles.plainLineTxt}>
                          {c.category_id == null
                            ? renderTemplate(t("report.uncatLine"), { amount: { text: money(c.amount), style: outStyle }, pct: { text: String(p) } })
                            : renderTemplate(t("report.catLine"), { amount: { text: money(c.amount), style: outStyle }, category: { text: c.name }, pct: { text: String(p) } })}
                        </Text>
                      </View>
                    );
                  })}
            </View>

            {/* Block 3 — Trend (weekly + monthly only) */}
            {period !== "daily" && (
              <View style={styles.card}>
                <BlockHeader title={period === "weekly" ? t("analytics.trendTitleWeek") : t("analytics.trendTitleMonth")} mode={mode3} onToggle={() => setMode3(mode3 === "chart" ? "plain" : "chart")} />
                {trendPoints.length === 0 ? <Text style={styles.empty}>{t("analytics.noSpending")}</Text>
                  : mode3 === "chart" ? <TrendChart points={trendPoints} />
                  : trendPoints.map((p, i) => (
                      <View key={i} style={styles.plainLine}>
                        <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} style={{ marginTop: 3 }} />
                        <Text style={styles.plainLineTxt}>
                          {renderTemplate(t("analytics.trendLine"), { label: { text: p.popupTitle ?? p.label }, in: { text: money(p.in), style: inStyle }, out: { text: money(p.out), style: outStyle } })}
                        </Text>
                      </View>
                    ))}
              </View>
            )}


            <TouchableOpacity style={styles.reportBtn}
              onPress={() => nav.navigate("Report", 
                period === "daily" ? { period: "daily", date } 
                : period === "weekly" ? { period: "weekly", start: weekStart } 
                : { period: "monthly", year: ym.year, month: ym.month })}>
              <Ionicons name="document-text-outline" size={16} color="#fff" />
              <Text style={styles.reportBtnTxt}>{t("analytics.viewReport")}</Text>
            </TouchableOpacity>
          </>}

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

        <Modal transparent visible={dateModal} animationType="slide" onRequestClose={() => setDateModal(false)}>
          <Pressable style={styles.backdrop} onPress={() => setDateModal(false)}>
            <Pressable style={styles.sheet}>
              {/* <MiniCalendar from={pickerAnchor} to={null} onChange={(f) => { if (f) { onPickDate(f); setDateModal(false); } }} /> */}
              <MiniCalendar from={pickerAnchor} to={null} 
                onChange={(f, tt) => { const picked = tt ?? f; if (picked) { onPickDate(picked); setDateModal(false); } }} />
            </Pressable>
          </Pressable>
        </Modal>
      </ScrollView>
      {tipAnalytics ? <CoachTip text={t("onboarding.tipAnalytics")} onDismiss={dismissTipAnalytics} arrow="top-left" style={{ top: 58, left: 16, maxWidth: 280 }} /> : null}
      {/* {tipCycle ? <CoachTip text={t("onboarding.tipAnalyticsCycle")} onDismiss={dismissTipCycle} arrow="top-right" style={{ top: 150, right: 16, maxWidth: 260 }} /> : null} */}
    </View>
  );
}

function Bar({ label, value, width, color }: { label: string; value: string; width: `${number}%`; color: string }) {
  return (
    <View style={{ marginTop: 10 }}>
      <View style={styles.lineTop}><Text style={styles.barLabel}>{label}</Text><Text style={styles.barValue}>{value}</Text></View>
      <View style={styles.track}><View style={[styles.fill, { width, backgroundColor: color }]} /></View>
    </View>
  );
}

// function Hl({ icon, color, text }: { icon: any; color: string; text: string }) {
//   return <View style={styles.hl}><Ionicons name={icon} size={15} color={color} /><Text style={styles.hlTxt}> {text}</Text></View>;
// }


const styles = StyleSheet.create({
  center: { paddingVertical: 60, alignItems: "center" },
  controls: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 14, gap: 8 },
  controls2: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 10 },
  segment: { flexDirection: "row", height: 34, borderRadius: 999, borderWidth: 1, borderColor: colors.border, overflow: "hidden", backgroundColor: colors.surface },
  segBtn: { paddingHorizontal: 16, justifyContent: "center" },
  segDiv: { borderLeftWidth: 1, borderLeftColor: colors.border },
  segActive: { backgroundColor: colors.primary },
  segTxt: { fontSize: 13, color: colors.textSecondary },
  segTxtActive: { color: "#fff", fontWeight: "600" },
  pill: { flexDirection: "row", alignItems: "center", gap: 5, height: 34, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  pillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillTxt: { fontSize: 13, color: colors.textSecondary },
  stepper: { flexDirection: "row", alignItems: "center", gap: 10 },
  stepTxt: { fontSize: 14, fontWeight: "600", color: colors.text, minWidth: 120, textAlign: "center" },
  syncRow: { flexDirection: "row", alignItems: "center" },
  syncTxt: { fontSize: 11, color: colors.textSecondary },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16, marginHorizontal: 16, marginTop: 14 },
  cardTitle: { fontSize: 15, fontWeight: "600", color: colors.text },
  keptRow: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  keptTxt: { fontSize: 15, color: colors.text },
  count: { fontSize: 12, color: colors.textSecondary, marginTop: 12 },
  lineTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  barLabel: { fontSize: 12, color: colors.textSecondary },
  barValue: { fontSize: 13, fontWeight: "600", color: colors.text },
  track: { height: 9, backgroundColor: "#F1F5F9", borderRadius: 6, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 6 },
  catName: { fontSize: 13, color: colors.text },
  catAmt: { fontSize: 13, fontWeight: "600", color: colors.text },
  empty: { fontSize: 13, color: colors.textSecondary, marginTop: 10, textAlign: "center" },
  hl: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  hlTxt: { fontSize: 14, color: colors.text, flex: 1 },
  
  // unused
  trend: { alignItems: "flex-end", marginTop: 12, gap: 8, flexGrow: 1, justifyContent: "center", paddingHorizontal: 4 },
  trendCol: { alignItems: "center", width: 26 },
  trendBarWrap: { height: 56, justifyContent: "flex-end" },
  trendBar: { width: 18, borderRadius: 3, backgroundColor: colors.primary },
  trendLbl: { fontSize: 10, color: colors.textSecondary, marginTop: 4 },
  // up to here - can be deleted the 5 above lines
  diaryRow: { flexDirection: "row", alignItems: "center", paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  diaryDot: { width: 30, height: 30, borderRadius: 15, backgroundColor: "#FEE2E2", alignItems: "center", justifyContent: "center", marginRight: 10 },
  diaryTxt: { flex: 1, fontSize: 14, lineHeight: 20, color: colors.text },

  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 18, paddingBottom: 28 },
  sheetTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 6 },
  simRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  simTxt: { fontSize: 15, color: colors.text },
  applyBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 13, alignItems: "center", marginTop: 16 },
  applyTxt: { color: "#fff", fontSize: 15, fontWeight: "600" },

  reportBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.primary, marginHorizontal: 16, marginTop: 16, borderRadius: 12, paddingVertical: 14 },
  reportBtnTxt: { color: "#fff", fontSize: 15, fontWeight: "600" },

  dateNav: { flexDirection: "row", justifyContent: "center", alignItems: "center", paddingHorizontal: 16, paddingTop: 12 },

  blockHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  plain: { fontSize: 15, lineHeight: 24, color: colors.text, marginTop: 10 },
  plainLine: { flexDirection: "row", alignItems: "flex-start", marginTop: 10 },
  plainLineTxt: { flex: 1, fontSize: 14, lineHeight: 20, color: colors.text, marginLeft: 8 },

});