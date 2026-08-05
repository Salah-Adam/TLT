// the full note-9 dashboard — custom header (greeting + ⋮ placeholder), emerald balance hero with last-synced, Maanta today cards, Bishaan kept-sentence + money-in/out bars, Su'aasha top-category bars, and a recent list. 
// It reads from cache instantly (offline-safe), refreshes when online, and supports pull-to-refresh. 
// The ⋮ and tx rows are display-only for now (Settings → Step 9, tx detail → Step 5); "Dhammaan" jumps to the Transactions tab.
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { colors } from "../theme";
import { useSession } from "../store/useSession";
import { useNetwork } from "../store/useNetwork";
import { readHome, refreshHome, type HomeData, type TxRow } from "../data/home";
import { useSync } from "../store/useSync";
import { getLastSynced, syncAll } from "../data/sync";
import { TxSentence } from "../components/TxSentence";
import { readSims, simColor, simEyebrow, type Sim } from "../data/phoneNumbers";
import { CoachTip } from "../components/CoachTip";
import { hasSeen, markSeen } from "../onboarding";
import { useNotifications } from "../store/useNotifications";

const money = (n: number) => "$" + (n ?? 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
const pctW = (v: number, max: number): `${number}%` => `${max > 0 ? Math.round((v / max) * 100) : 0}%`;

const localNum = (n?: string | null) => (n ?? "").replace(/^252/, "");

const inStyle = { color: colors.moneyIn, fontWeight: "700" as const };
const outStyle = { color: colors.moneyOut, fontWeight: "700" as const };
const keptStyle = { color: colors.primaryDark, fontWeight: "700" as const };
const provName = (p: string) => (p === "evcplus" ? "EVC Plus" : p === "edahab" ? "eDahab" : p);
function renderTemplate(template: string, parts: Record<string, { text: string; style?: any }>) {
  return template.split(/(\{\w+\})/g).map((seg, i) => {
    const m = seg.match(/^\{(\w+)\}$/);
    if (m && parts[m[1]]) return <Text key={i} style={parts[m[1]].style}>{parts[m[1]].text}</Text>;
    return <Text key={i}>{seg}</Text>;
  });
}

export default function HomeScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const nav = useNavigation<any>();
  const user = useSession((s) => s.user);
  const [data, setData] = useState<HomeData | null>(null);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [menu, setMenu] = useState(false);

  const [monthMode, setMonthMode] = useState<"chart" | "plain">("chart");
  const [balModal, setBalModal] = useState(false);

  const [sims, setSims] = useState<Sim[]>([]);

  const [tipHome, setTipHome] = useState(false);
  useEffect(() => { (async () => { if (await hasSeen("intro") && !(await hasSeen("tipHome"))) setTipHome(true); })(); }, []);
  const dismissTipHome = () => { markSeen("tipHome"); setTipHome(false); };

  const loadCache = useCallback(async () => {
    setData(await readHome());
    setLastSynced(await getLastSynced());
    setLoading(false);
  }, []);


  const doRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await syncAll(); } catch {}
    await loadCache();
    setRefreshing(false);
  }, [loadCache]);

  useEffect(() => { readSims().then(setSims); }, []);

  useEffect(() => {
    (async () => {
      await loadCache();
      if (useNetwork.getState().online) { try { await refreshHome(); await loadCache(); } catch {} }
    })();
  }, [loadCache]);

  const syncTick = useSync((s) => s.tick);
  useEffect(() => { if (syncTick > 0) loadCache(); }, [syncTick, loadCache]);

  const unread = useNotifications((s) => s.unread);
  useEffect(() => { useNotifications.getState().refresh(); }, []);

  const balances = data?.balances ?? [];
  const balance = data?.balance ?? 0;
  const today = data?.today ?? { in: 0, out: 0 };
  const week = data?.week ?? { out: 0, changePercent: null };
  const month = data?.month ?? { in: 0, out: 0, net: 0, count: 0 };
  // const month = data?.month ?? { in: 0, out: 0, net: 0 };
  const cats = data?.topCategories ?? [];
  const recent = data?.recent ?? [];

  const showSim = sims.length >= 2;

  const maxBar = Math.max(month.in, month.out, 1);
  const maxCat = Math.max(cats[0]?.amount ?? 0, 1);
  const syncedLabel = lastSynced ? new Date(lastSynced).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ paddingBottom: 28 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={doRefresh} tintColor={colors.primary} />}
      >
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <Text style={styles.hello} numberOfLines={1}>{`${t("home.greeting")}, ${user?.full_name ?? ""}`}</Text>

          {/* <TouchableOpacity hitSlop={10} onPress={() => setMenu(true)}>
            <Ionicons name="ellipsis-vertical" size={22} color={colors.text} />
          </TouchableOpacity> */}

          <View style={{ flexDirection: "row", alignItems: "center", gap: 18 }}>
            <TouchableOpacity hitSlop={10} onPress={() => nav.navigate("Notifications")}>
              <View>
                <Ionicons name="notifications-outline" size={22} color={colors.text} />
                {unread > 0 ? <View style={styles.badge}><Text style={styles.badgeTxt}>{unread > 9 ? "9+" : unread}</Text></View> : null}
              </View>
            </TouchableOpacity>
            <TouchableOpacity hitSlop={10} onPress={() => setMenu(true)}>
              <Ionicons name="ellipsis-vertical" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>


          <Modal transparent visible={menu} animationType="fade" onRequestClose={() => setMenu(false)}>
            <Pressable style={mstyles.overlay} onPress={() => setMenu(false)}>
              <View style={[mstyles.menu, { top: insets.top + 44, right: 12 }]}>

                <TouchableOpacity style={mstyles.item} onPress={() => { setMenu(false); nav.navigate("TrackedContacts"); }}>
                  <Ionicons name="people-outline" size={19} color={colors.text} />
                  <Text style={mstyles.itemTxt}>{t("contacts.title")}</Text>
                </TouchableOpacity>
                <View style={mstyles.divider} />

                <TouchableOpacity style={mstyles.item} onPress={() => { setMenu(false); nav.navigate("SpendingAlerts"); }}>
                  <Ionicons name="alert-circle-outline" size={19} color={colors.text} />
                  <Text style={mstyles.itemTxt}>{t("home.menuAlerts")}</Text>
                </TouchableOpacity>
                <View style={mstyles.divider} />

                {/* <TouchableOpacity style={mstyles.item} onPress={() => { setMenu(false); nav.navigate("Settings"); }}>
                  <Ionicons name="settings-outline" size={19} color={colors.text} />
                  <Text style={mstyles.itemTxt}>{t("settings.title")}</Text>
                </TouchableOpacity> */}

              </View>
            </Pressable>
          </Modal>

        </View> 
{/* 
        <View style={styles.hero}>
          <Text style={styles.heroLabel}>{t("home.balance")}</Text>
          <Text style={styles.heroAmount}>{money(balance)}</Text>
          <View style={styles.heroSync}>
            <Ionicons name="refresh" size={13} color="#A7F3D0" />
            <Text style={styles.heroSyncTxt}> {t("home.lastSynced")} {syncedLabel}</Text>
          </View>
        </View> */}

        <TouchableOpacity style={styles.hero} activeOpacity={0.85} onPress={() => setBalModal(true)}>
          <View style={styles.heroTop}>
            <Text style={styles.heroLabel}>{t("home.balance")}</Text>
            <Ionicons name="chevron-forward" size={16} color="#A7F3D0" />
          </View>
          <Text style={styles.heroAmount}>{money(balance)}</Text>
          <View style={styles.heroSync}>
            <Ionicons name="refresh" size={13} color="#A7F3D0" />
            <Text style={styles.heroSyncTxt}> {t("home.lastSynced")} {syncedLabel}</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.row}>
          <View style={[styles.miniCard, { marginRight: 6 }]}>
            <View style={styles.miniHead}>
              <View style={[styles.iconCircle, { backgroundColor: "#DCFCE7" }]}><Ionicons name="arrow-down" size={15} color="#16A34A" /></View>
              <Text style={styles.miniLabel}>{t("home.todayReceived")}</Text>
            </View>
            <Text style={[styles.miniAmount, { color: colors.moneyIn }]}>+{money(today.in)}</Text>
          </View>
          <View style={[styles.miniCard, { marginLeft: 6 }]}>
            <View style={styles.miniHead}>
              <View style={[styles.iconCircle, { backgroundColor: "#FEE2E2" }]}><Ionicons name="arrow-up" size={15} color="#DC2626" /></View>
              <Text style={styles.miniLabel}>{t("home.todaySpent")}</Text>
            </View>
            <Text style={[styles.miniAmount, { color: colors.moneyOut }]}>−{money(today.out)}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t("home.weekTitle")}</Text>
          <Text style={styles.keptTxt}>{t("home.weekSpent", { amount: money(week.out) })}</Text>
          {week.changePercent != null ? (
            <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>
              {week.changePercent > 0 ? t("home.weekUp", { pct: Math.abs(week.changePercent) })
                : week.changePercent < 0 ? t("home.weekDown", { pct: Math.abs(week.changePercent) })
                : t("home.weekSame")}
            </Text>
          ) : null}
        </View>


        {/* <View style={styles.card}>
          <Text style={styles.cardTitle}>{t("home.monthTitle")}</Text>
          <View style={styles.keptRow}>
            <Ionicons name="checkmark-circle" size={18} color={month.net >= 0 ? colors.success : colors.error} />
            <Text style={styles.keptTxt}> {t("home.kept")} <Text style={{ fontWeight: "700", color: colors.primaryDark }}>{money(month.net)}</Text></Text>
          </View>
          <BarLine label={t("home.moneyIn")} value={money(month.in)} width={pctW(month.in, maxBar)} color={colors.moneyIn} />
          <BarLine label={t("home.moneyOut")} value={money(month.out)} width={pctW(month.out, maxBar)} color={colors.moneyOut} />
        </View> */}

        <View style={styles.card}>
          <View style={styles.blockHead}>
            <Text style={styles.cardTitle}>{t("home.monthTitle")}</Text>
            <TouchableOpacity hitSlop={8} onPress={() => setMonthMode(monthMode === "chart" ? "plain" : "chart")}><Ionicons name="repeat" size={18} color={colors.textSecondary} /></TouchableOpacity>
          </View>
          {monthMode === "chart" ? (
            <>
              <View style={styles.keptRow}>
                <Ionicons name="checkmark-circle" size={18} color={month.net >= 0 ? colors.success : colors.error} />
                <Text style={styles.keptTxt}> {t("home.kept")} <Text style={{ fontWeight: "700", color: colors.primaryDark }}>{money(month.net)}</Text></Text>
              </View>
              <BarLine label={t("home.moneyIn")} value={money(month.in)} width={pctW(month.in, maxBar)} color={colors.moneyIn} />
              <BarLine label={t("home.moneyOut")} value={money(month.out)} width={pctW(month.out, maxBar)} color={colors.moneyOut} />
            </>
          ) : (
            <Text style={styles.plain}>
              {month.net >= 0
                ? renderTemplate(t("analytics.sumSentencePos"), { lead: { text: t("analytics.leadMonthly") }, in: { text: money(month.in), style: inStyle }, out: { text: money(month.out), style: outStyle }, net: { text: money(month.net), style: keptStyle }, count: { text: String(month.count), style: { fontWeight: "700" } } })
                : renderTemplate(t("analytics.sumSentenceNeg"), { lead: { text: t("analytics.leadMonthly") }, deficit: { text: money(Math.abs(month.net)), style: outStyle }, in: { text: money(month.in), style: inStyle }, out: { text: money(month.out), style: outStyle }, count: { text: String(month.count), style: { fontWeight: "700" } } })}
            </Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t("home.question")}</Text>
          {cats.length === 0
            ? <Text style={styles.empty}>{t("home.empty")}</Text>
            : cats.map((c, i) => (
              <View key={i} style={{ marginTop: 11 }}>
                <View style={styles.lineTop}>
                  <Text style={styles.catName}>{c.name}</Text>
                  <Text style={styles.catAmt}>{money(c.amount)}</Text>
                </View>
                <View style={styles.barTrack}><View style={[styles.barFill, { width: pctW(c.amount, maxCat), backgroundColor: colors.primary }]} /></View>
              </View>
            ))}
        </View>

        <View style={styles.card}>
          <View style={styles.recentHead}>
            <Text style={styles.cardTitle}>{t("home.recent")}</Text>
            <TouchableOpacity onPress={() => nav.navigate("Transactions")}>
              <Text style={styles.seeAll}>{t("home.seeAll")} ›</Text>
            </TouchableOpacity>
          </View>
          {recent.length === 0
            ? <Text style={styles.empty}>{t("home.empty")}</Text>
            : recent.map((tx, i) => (
                <TxItem
                  key={tx.id ?? String(i)}
                  tx={tx}
                  last={i === recent.length - 1}
                  sims={sims}
                  showSim={showSim}
                  onPress={() => nav.navigate("Transactions", { screen: "TxDetail", params: { id: tx.id } })}
                />
              ))}
        </View>
      </ScrollView>
      {tipHome ? <CoachTip text={t("onboarding.tipHome")} onDismiss={dismissTipHome} arrow="top-right" style={{ top: insets.top + 48, right: 12, maxWidth: 260 }} /> : null}

      <Modal transparent visible={balModal} animationType="fade" onRequestClose={() => setBalModal(false)}>
        <Pressable style={styles.balBackdrop} onPress={() => setBalModal(false)}>
          <Pressable style={styles.balCard}>
            <View style={styles.balHead}>
              <Text style={styles.balTitle}>{t("home.balanceBreakdown")}</Text>
              <TouchableOpacity hitSlop={8} onPress={() => setBalModal(false)}><Ionicons name="close" size={20} color={colors.textSecondary} /></TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 320 }}>
              {balances.length === 0 ? <Text style={styles.empty}>{t("home.empty")}</Text> : balances.map((b) => {
                const isActive = b.active !== false;
                return (
                  <View key={b.phone_number_id} style={styles.balRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.balNum, !isActive && { color: colors.textSecondary }]}>{provName(b.provider)} · {localNum(b.number)}</Text>
                      {!isActive ? <Text style={styles.balDeleted}>{t("home.numberRemoved")}</Text> : null}
                    </View>
                    <Text style={[styles.balAmt, !isActive && { color: colors.textSecondary }]}>{money(b.estimated_balance)}</Text>
                  </View>
                );
              })}
            </ScrollView>
            <View style={styles.balTotalRow}>
              <Text style={styles.balTotalLbl}>{t("home.total")}</Text>
              <Text style={styles.balTotalAmt}>{money(balance)}</Text>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function BarLine({ label, value, width, color }: { label: string; value: string; width: `${number}%`; color: string }) {
  return (
    <View style={{ marginTop: 10 }}>
      <View style={styles.lineTop}>
        <Text style={styles.barLabel}>{label}</Text>
        <Text style={styles.barValue}>{value}</Text>
      </View>
      <View style={styles.barTrack}><View style={[styles.barFill, { width, backgroundColor: color }]} /></View>
    </View>
  );
}

function TxItem({ tx, last, sims, showSim, onPress }: { tx: TxRow; last: boolean; sims: Sim[]; showSim: boolean; onPress: () => void }) {
  const isIn = tx.direction === "in";
  const cat = tx.category?.name ?? null;
  const time = new Date(tx.transacted_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  const sim = showSim && tx.phone_number_id ? sims.find((s) => s.id === tx.phone_number_id) : undefined;

  const accent = sim ? simColor(sim.id) : undefined;
  return (
    <View>
      <TouchableOpacity style={styles.txRow} onPress={onPress} activeOpacity={0.7}>
        <View style={[styles.iconCircle, { width: 34, height: 34, borderRadius: 17, backgroundColor: isIn ? "#DCFCE7" : "#FEE2E2" }]}>
          <Ionicons name={isIn ? "arrow-down" : "arrow-up"} size={17} color={isIn ? "#16A34A" : "#DC2626"} />
        </View>
        <View style={{ flex: 1, marginLeft: 11 }}>
          {/* {sim ? <Text style={[styles.simEyebrow, { color: simColor(sim.id) }]} numberOfLines={1}>{simEyebrow(sim)}</Text> : null} */}
          <TxSentence tx={tx} style={styles.sentence} />
          <View style={styles.metaRow}>
            <Text style={styles.txSub}>{time}</Text>

            <View style={styles.provNum}>
              {sim ? (
                <View style={[styles.simEyebrow, { backgroundColor: "#2563EB"! + "22" }]}>
                  <View style={[styles.simDot, { backgroundColor: "#2563EB" }]} />
                  <Text style={[styles.simChipTxt, { color: "#2563EB" }]} numberOfLines={1}>{simEyebrow(sim)}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.categ}>{cat ? <Text style={styles.homeTag}>{cat}</Text> : null}</View>
          </View>
        </View>
      </TouchableOpacity>
      {!last ? <View style={styles.sep} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingBottom: 12, backgroundColor: colors.surface },
  hello: { fontSize: 18, fontWeight: "600", color: colors.text, flex: 1 },
  hero: { margin: 16, marginBottom: 4, backgroundColor: colors.primaryDark, borderRadius: 18, padding: 18 },
  heroLabel: { fontSize: 13, color: "#A7F3D0" },
  heroAmount: { fontSize: 32, fontWeight: "700", color: "#fff", marginTop: 2 },
  heroSync: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  heroSyncTxt: { fontSize: 12, color: "#D1FAE5" },
  row: { flexDirection: "row", paddingHorizontal: 16, marginTop: 10 },
  miniCard: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 12 },
  miniHead: { flexDirection: "row", alignItems: "center" },
  iconCircle: { width: 22, height: 22, borderRadius: 7, alignItems: "center", justifyContent: "center" },
  miniLabel: { fontSize: 12, color: colors.textSecondary, marginLeft: 6, flex: 1 },
  miniAmount: { fontSize: 20, fontWeight: "600", marginTop: 8 },

  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  metaNum: { fontSize: 12, color: colors.text, fontWeight: "600", flexShrink: 1 },



  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16, marginHorizontal: 16, marginTop: 14 },
  cardTitle: { fontSize: 15, fontWeight: "600", color: colors.text },
  cardSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  keptRow: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  keptTxt: { fontSize: 15, color: colors.text },
  lineTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  barLabel: { fontSize: 12, color: colors.textSecondary },
  barValue: { fontSize: 13, fontWeight: "600", color: colors.text },
  barTrack: { height: 9, backgroundColor: "#F1F5F9", borderRadius: 6, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 6 },
  catName: { fontSize: 13, color: colors.text },
  catAmt: { fontSize: 13, fontWeight: "600", color: colors.text },
  recentHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  seeAll: { fontSize: 13, color: colors.primary },
  txRow: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 10 },
  sentence: { fontSize: 14, lineHeight: 20, color: colors.text },
  provNum: {marginTop: 4, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999},
  simEyebrow: {fontSize: 9 , flexDirection: "row", alignItems: "center", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999,  flexShrink: 1 },
  simDot: { width: 4, height: 4, borderRadius: 3, marginRight: 4 },
  simChipTxt: { fontSize: 9, fontWeight: "600", flexShrink: 1 },
  categ:{marginTop: 4},
  homeTag: { fontSize: 10, color: colors.textSecondary, paddingHorizontal: 7, backgroundColor: "#EEF2F6", paddingVertical: 2, borderRadius: 999, overflow: "hidden"},

  txTitle: { fontSize: 14, fontWeight: "500", color: colors.text },
  txSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  txAmt: { fontSize: 14, fontWeight: "600" },
  sep: { height: 1, backgroundColor: "#F1F5F9" },
  empty: { fontSize: 13, color: colors.textSecondary, marginTop: 10, textAlign: "center" },

  badge: { position: "absolute", top: -5, right: -6, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: colors.error, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 },
  badgeTxt: { color: "#fff", fontSize: 10, fontWeight: "700" },

  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  blockHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  plain: { fontSize: 15, lineHeight: 24, color: colors.text, marginTop: 10 },
  balBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", alignItems: "center", justifyContent: "center", padding: 28 },
  balCard: { width: "100%", backgroundColor: colors.surface, borderRadius: 16, padding: 16 },
  balHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  balTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  balRow: { flexDirection: "row", alignItems: "center", paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  balNum: { fontSize: 14, color: colors.text, fontWeight: "500" },
  balDeleted: { fontSize: 11, color: colors.error, marginTop: 2 },
  balAmt: { fontSize: 14, fontWeight: "600", color: colors.text },
  balTotalRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  balTotalLbl: { fontSize: 15, fontWeight: "700", color: colors.text },
  balTotalAmt: { fontSize: 18, fontWeight: "700", color: colors.primaryDark },

});

const mstyles = StyleSheet.create({
  overlay: { flex: 1 },
  menu: { position: "absolute", minWidth: 210, backgroundColor: colors.surface, borderRadius: 12, paddingVertical: 6, borderWidth: 1, borderColor: colors.border, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  item: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 16 },
  itemTxt: { fontSize: 15, color: colors.text },
  divider: { height: 1, backgroundColor: "#F1F5F9", marginHorizontal: 8 },
});

