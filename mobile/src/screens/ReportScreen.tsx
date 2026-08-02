// The report: the month's story as titled, grouped cards built from the structured data
// (so we can group + add phone numbers). Summary + "what happened" groups + daily diary (monthly).
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { colors } from "../theme";
import { readReport, type ReportData, type ReportSel } from "../data/reports";
import { readAnalytics, type MonthlyAnalytics } from "../data/analytics";
import { readSims, simLabel, type Sim } from "../data/phoneNumbers";



const money = (n: number) => "$" + (n ?? 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
const trendLabel = (bucket: string, period: string) => {
  if (period === "monthly") return new Date(bucket + "-01T00:00:00").toLocaleDateString([], { month: "short", year: "2-digit" });
  if (period === "weekly") {
    const s = new Date(bucket + "T00:00:00"); const e = new Date(s); e.setDate(s.getDate() + 6);
    return `${s.toLocaleDateString([], { day: "numeric", month: "short" })} – ${e.toLocaleDateString([], { day: "numeric", month: "short" })}`;
  }
  return new Date(bucket + "T00:00:00").toLocaleDateString([], { day: "numeric", month: "short" });
};

const fmtDate = (s: string) => new Date(s + "T00:00:00").toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });

const pctW = (v: number, max: number): `${number}%` => `${max > 0 ? Math.round((v / max) * 100) : 0}%`;
const localNum = (n?: string | null) => (n ?? "").replace(/^252/, "");
const SO_MONTHS = ["Janaayo", "Febraayo", "Maarso", "Abriil", "Maajo", "Juun", "Luuliyo", "Ogosto", "Sebtembar", "Oktoobar", "Nofembar", "Diseembar"];

const inStyle = { color: colors.moneyIn, fontWeight: "700" as const };
const outStyle = { color: colors.moneyOut, fontWeight: "700" as const };

function renderTemplate(template: string, parts: Record<string, { text: string; style?: any }>) {
  return template.split(/(\{\w+\})/g).map((seg, i) => {
    const m = seg.match(/^\{(\w+)\}$/);
    if (m && parts[m[1]]) return <Text key={i} style={parts[m[1]].style}>{parts[m[1]].text}</Text>;
    return <Text key={i}>{seg}</Text>;
  });
}

export default function ReportScreen() {
  const { t, i18n } = useTranslation();
  const route = useRoute<any>();
  const params = route.params ?? {};
  const period: "daily" | "weekly" | "monthly" = params.period ?? "monthly";

  const [sims, setSims] = useState<Sim[]>([]);
  const [selectedSims, setSelectedSims] = useState<string[]>([]);
  const [simModal, setSimModal] = useState(false);
  const [data, setData] = useState<ReportData | null>(null);
  const [dailyTrend, setDailyTrend] = useState<MonthlyAnalytics["daily_trend"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { readSims().then(setSims); }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const sel: ReportSel = { period, date: params.date, start: params.start, year: params.year, month: params.month, simIds: selectedSims };
    const rep = await readReport(sel);
    setData(rep);
    if (period === "monthly" && rep) {
      const d0 = new Date(rep.start + "T00:00:00");
      const an = await readAnalytics({ period: "monthly", year: params.year ?? d0.getFullYear(), month: params.month ?? d0.getMonth() + 1, simIds: selectedSims });
      setDailyTrend((an as MonthlyAnalytics | null)?.daily_trend ?? null);
    } else setDailyTrend(null);
    setLoading(false);
  }, [period, params.date, params.start, params.year, params.month, selectedSims]);

  useEffect(() => { load(); }, [load]);
  const doRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  const toggleSim = (id: string) => setSelectedSims((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const simLabelTxt = selectedSims.length === 0 ? t("tx.allSims") : `${selectedSims.length} ${t("tx.sims")}`;
  const whoName = (name: string | null, number: string | null) =>
    name ? (number ? `${name} (${localNum(number)})` : name) : (number ? localNum(number) : t("tx.unknownParty"));

  const rangeLabel = (r: ReportData) => {
    const s = new Date(r.start + "T00:00:00"), e = new Date(r.end + "T00:00:00");
    if (r.period === "daily") return s.toLocaleDateString([], { day: "numeric", month: "long", year: "numeric" });
    if (r.period === "monthly") return s.toLocaleDateString([], { month: "long", year: "numeric" });
    return `${s.toLocaleDateString([], { day: "numeric", month: "short" })} – ${e.toLocaleDateString([], { day: "numeric", month: "short" })}`;
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  if (!data) return <View style={styles.center}><Text style={styles.empty}>{t("report.empty")}</Text></View>;

  // const prevOut = data.vs_last_period?.prev_out ?? 0;
  // const delta = data.total_out - prevOut;
  // render: delta > 0 → hlSpendMore, < 0 → hlSpendLess, 0 → hlSpendSame

  const net = data.net, maxBar = Math.max(data.total_in, data.total_out, 1);
  const cats = data.by_category ?? [];
  const bigIn = (data.largest_transactions ?? []).filter((l) => l.direction === "in");
  const bigOut = (data.largest_transactions ?? []).filter((l) => l.direction === "out");

  const busiestCount = data.busiest_day && dailyTrend ? (dailyTrend.find((d) => d.date === data.busiest_day)?.count ?? null) : null;


  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ paddingBottom: 28 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={doRefresh} tintColor={colors.primary} />}>

      <View style={styles.controls}>
        <Text style={styles.periodType}>{t(`report.${period}`)}</Text>
        <TouchableOpacity style={[styles.pill, selectedSims.length > 0 && styles.pillActive]} onPress={() => setSimModal(true)}>
          <Ionicons name="phone-portrait-outline" size={14} color={selectedSims.length > 0 ? "#fff" : colors.textSecondary} />
          <Text style={[styles.pillTxt, selectedSims.length > 0 && { color: "#fff" }]}>{simLabelTxt}</Text>
          <Ionicons name="chevron-down" size={13} color={selectedSims.length > 0 ? "#fff" : colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{rangeLabel(data)}</Text>
        <View style={styles.keptRow}>
          <Ionicons name={net >= 0 ? "checkmark-circle" : "alert-circle"} size={20} color={net >= 0 ? colors.success : colors.error} />
          <Text style={styles.keptTxt}> {net >= 0 ? t("report.kept") : t("report.overspent")} <Text style={{ fontWeight: "700", color: net >= 0 ? colors.primaryDark : colors.error }}>{money(Math.abs(net))}</Text></Text>
        </View>
        <Bar label={t("report.received")} value={money(data.total_in)} width={pctW(data.total_in, maxBar)} color={colors.moneyIn} />
        <Bar label={t("report.spent")} value={money(data.total_out)} width={pctW(data.total_out, maxBar)} color={colors.moneyOut} />
        <Text style={styles.count}>{data.transaction_count} {t("report.txns")}</Text>
      </View>


      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t("report.highlights")}</Text>
        
        {/* <Line icon="trophy-outline" color={net >= 0 ? colors.moneyIn : colors.moneyOut}>
          {net >= 0 ? t("report.hlAhead", { amount: money(Math.abs(net)) }) : t("report.hlBehind", { amount: money(Math.abs(net)) })}
        </Line> */}

        {data.vs_last_period?.prev_out != null && data.vs_last_period.prev_out > 0 ? (() => {
        const prevOut = data.vs_last_period.prev_out;
        const delta = data.total_out - prevOut;
        const key = delta > 0 ? "report.hlSpendMore" : delta < 0 ? "report.hlSpendLess" : "report.hlSpendSame";
        return (
          <Line icon="trending-up-outline" color={colors.info}>
            {renderTemplate(t(key), {
              delta: { text: money(Math.abs(delta)), style: outStyle },
              when:  { text: t(`report.prev_${period}`) },
              prev:  { text: money(prevOut) },
            })}
          </Line>
        );
        })() : null}

        {/* {data.vs_last_period?.out_change_percent != null ? (
          <Line icon="trending-up-outline" color={colors.info}>
            {data.vs_last_period.out_change_percent >= 0
              ? t("report.hlSpendMore", { pct: Math.abs(data.vs_last_period.out_change_percent), prev: t(`report.prev_${period}`) })
              : t("report.hlSpendLess", { pct: Math.abs(data.vs_last_period.out_change_percent), prev: t(`report.prev_${period}`) })}
          </Line>
        ) : null} */}
        {period !== "daily" && data.busiest_day ? (
          <Line icon="calendar-outline" color={colors.info}>
            {busiestCount != null
              ? t("report.hlBusiest", { date: fmtDate(data.busiest_day), count: busiestCount })
              : t("report.hlBusiestNoCount", { date: fmtDate(data.busiest_day) })}
          </Line>
        ) : null}
        {data.busiest_hour != null ? (
          <Line icon="time-outline" color={colors.info}>{t("report.hlBusiestHour", { hour: data.busiest_hour })}</Line>
        ) : null}
      </View>

      {data.trend?.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t(`report.trend_${period}`)}</Text>
          {(() => {
            const series = period === "weekly" ? data.trend.slice(-4) : data.trend;
            const max = Math.max(...series.map((b) => b.spent), 1);
            return series.map((b, i) => (
              <View key={i} style={{ marginTop: 11 }}>
                <View style={styles.lineTop}>
                  <Text style={styles.barLabel}>{trendLabel(b.bucket, period)}</Text>
                  <Text style={styles.barValue}>{money(b.spent)}</Text>
                </View>
                <View style={styles.track}><View style={[styles.fill, { width: pctW(b.spent, max), backgroundColor: colors.primary }]} /></View>
              </View>
            ));
          })()}
        </View>
      )}

      <Text style={styles.sectionHead}>{t("report.whatHappened")} · <Text style={styles.sectionMonth}>{rangeLabel(data)}</Text></Text>

      {cats.length > 0 && (
        <Group title={t("report.grpCategory")}>

          {/* {cats.map((c, i) => (
            <Line key={i} icon="pricetag-outline" color={colors.textSecondary}>
              {renderTemplate(t("report.catLine"), { amount: { text: money(c.amount), style: outStyle }, category: { text: c.name }, pct: { text: String(c.percent_of_spending) } })}
            </Line>
          ))} */}

          {cats.map((c, i) => (
            <Line key={i} icon="pricetag-outline" color={colors.textSecondary}>
              {c.category_id == null
                ? renderTemplate(t("report.uncatLine"), { amount: { text: money(c.amount), style: outStyle }, pct: { text: String(c.percent_of_spending) } })
                : renderTemplate(t("report.catLine"), { amount: { text: money(c.amount), style: outStyle }, category: { text: c.name }, pct: { text: String(c.percent_of_spending) } })}
            </Line>
          ))}
        </Group>
      )}

      {data.top_senders?.length > 0 && (
        <Group title={t("report.grpSenders")}>
          {data.top_senders.map((s, i) => (
            <Line key={i} icon="arrow-down" color={colors.moneyIn}>
              {renderTemplate(t("report.senderLine"), { who: { text: whoName(s.counterparty_name, s.counterparty_number) }, amount: { text: money(s.total), style: inStyle }, count: { text: String(s.count) } })}
            </Line>
          ))}
        </Group>
      )}

      {data.top_recipients?.length > 0 && (
        <Group title={t("report.grpRecipients")}>
          {data.top_recipients.map((r, i) => (
            <Line key={i} icon="arrow-up" color={colors.moneyOut}>
              {renderTemplate(t("report.recipientLine"), { who: { text: whoName(r.counterparty_name, r.counterparty_number) }, amount: { text: money(r.total), style: outStyle }, count: { text: String(r.count) } })}
            </Line>
          ))}
        </Group>
      )}

      {bigIn.length > 0 && (
        <Group title={t("report.grpBiggestIn")}>
          {bigIn.map((l, i) => (
            <Line key={i} icon="arrow-down" color={colors.moneyIn}>
              {renderTemplate(t("report.biggestIn"), { amount: { text: money(l.amount), style: inStyle }, who: { text: whoName(l.counterparty_name, l.counterparty_number) } })}
            </Line>
          ))}
        </Group>
      )}

      {bigOut.length > 0 && (
        <Group title={t("report.grpBiggestOut")}>
          {bigOut.map((l, i) => (
            <Line key={i} icon="arrow-up" color={colors.moneyOut}>
              {renderTemplate(t("report.biggestOut"), { amount: { text: money(l.amount), style: outStyle }, who: { text: whoName(l.counterparty_name, l.counterparty_number) } })}
            </Line>
          ))}
        </Group>
      )}

      {period === "monthly" && dailyTrend && dailyTrend.some((d) => d.total_out > 0) && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t("report.grpDaily")}</Text>
          <ScrollView style={{ maxHeight: 300 }} nestedScrollEnabled>
            <SpendDiary series={dailyTrend} so={i18n.language === "so"} t={t} />
          </ScrollView>
        </View>
      )}

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
    </ScrollView>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return <View style={styles.card}><Text style={styles.cardTitle}>{title}</Text><View style={{ marginTop: 2 }}>{children}</View></View>;
}
function Line({ icon, color, children }: { icon: any; color: string; children: React.ReactNode }) {
  return <View style={styles.line}><Ionicons name={icon} size={14} color={color} style={{ marginTop: 3 }} /><Text style={styles.lineTxt}>{children}</Text></View>;
}
function Bar({ label, value, width, color }: { label: string; value: string; width: `${number}%`; color: string }) {
  return (
    <View style={{ marginTop: 10 }}>
      <View style={styles.lineTop}><Text style={styles.barLabel}>{label}</Text><Text style={styles.barValue}>{value}</Text></View>
      <View style={styles.track}><View style={[styles.fill, { width, backgroundColor: color }]} /></View>
    </View>
  );
}
function SpendDiary({ series, so, t }: { series: { date: string; total_out: number }[]; so: boolean; t: any }) {
  const days = series.filter((d) => d.total_out > 0).sort((a, b) => (a.date < b.date ? 1 : -1));
  if (days.length === 0) return <Text style={styles.empty}>{t("analytics.noSpending")}</Text>;
  const template = t("analytics.spendDiary");
  return (
    <>
      {days.map((d, i) => {
        const dt = new Date(d.date + "T00:00:00");
        const month = so ? SO_MONTHS[dt.getMonth()] : dt.toLocaleDateString("en-US", { month: "long" });
        return (
          <View key={i} style={styles.diaryRow}>
            <View style={styles.diaryDot}><Ionicons name="calendar-outline" size={15} color={colors.moneyOut} /></View>
            <Text style={styles.diaryTxt}>
              {renderTemplate(template, { month: { text: month }, day: { text: String(dt.getDate()) }, amount: { text: money(d.total_out), style: outStyle } })}
            </Text>
          </View>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
  controls: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 14 },
  periodType: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
  pill: { flexDirection: "row", alignItems: "center", gap: 5, height: 34, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  pillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillTxt: { fontSize: 13, color: colors.textSecondary },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16, marginHorizontal: 16, marginTop: 14 },
  cardTitle: { fontSize: 15, fontWeight: "600", color: colors.text },
  keptRow: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  keptTxt: { fontSize: 16, color: colors.text },
  count: { fontSize: 12, color: colors.textSecondary, marginTop: 12 },
  sectionHead: { fontSize: 16, fontWeight: "600", color: colors.text, marginHorizontal: 16, marginTop: 20 },
  sectionMonth: { fontWeight: "700", color: colors.primaryDark },
  line: { flexDirection: "row", alignItems: "flex-start", marginTop: 10 },
  lineTxt: { flex: 1, fontSize: 14, lineHeight: 20, color: colors.text, marginLeft: 8 },
  lineTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  barLabel: { fontSize: 12, color: colors.textSecondary },
  barValue: { fontSize: 13, fontWeight: "600", color: colors.text },
  track: { height: 9, backgroundColor: "#F1F5F9", borderRadius: 6, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 6 },
  empty: { fontSize: 14, color: colors.textSecondary, textAlign: "center", marginTop: 10 },
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
});

