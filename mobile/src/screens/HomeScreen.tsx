// the full note-9 dashboard — custom header (greeting + ⋮ placeholder), emerald balance hero with last-synced, Maanta today cards, Bishaan kept-sentence + money-in/out bars, Su'aasha top-category bars, and a recent list. 
// It reads from cache instantly (offline-safe), refreshes when online, and supports pull-to-refresh. 
// The ⋮ and tx rows are display-only for now (Settings → Step 9, tx detail → Step 5); "Dhammaan" jumps to the Transactions tab.
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { colors } from "../theme";
import { useSession } from "../store/useSession";
import { useNetwork } from "../store/useNetwork";
import { readHome, refreshHome, type HomeData, type TxRow } from "../data/home";
import { getLastSynced } from "../data/sync";

const money = (n: number) => "$" + (n ?? 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
const pctW = (v: number, max: number): `${number}%` => `${max > 0 ? Math.round((v / max) * 100) : 0}%`;

const localNum = (n?: string | null) => (n ?? "").replace(/^252/, "");

export default function HomeScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const nav = useNavigation<any>();
  const user = useSession((s) => s.user);
  const [data, setData] = useState<HomeData | null>(null);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadCache = useCallback(async () => {
    setData(await readHome());
    setLastSynced(await getLastSynced());
    setLoading(false);
  }, []);

  const doRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refreshHome(); } catch {}
    await loadCache();
    setRefreshing(false);
  }, [loadCache]);

  useEffect(() => {
    (async () => {
      await loadCache();
      if (useNetwork.getState().online) { try { await refreshHome(); await loadCache(); } catch {} }
    })();
  }, [loadCache]);

  const balance = data?.balance ?? 0;
  const today = data?.today ?? { in: 0, out: 0 };
  const month = data?.month ?? { in: 0, out: 0, net: 0 };
  const cats = data?.topCategories ?? [];
  const recent = data?.recent ?? [];
  const maxBar = Math.max(month.in, month.out, 1);
  const maxCat = Math.max(cats[0]?.amount ?? 0, 1);
  const syncedLabel = lastSynced ? new Date(lastSynced).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: 28 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={doRefresh} tintColor={colors.primary} />}
    >
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.hello} numberOfLines={1}>{`${t("home.greeting")}, ${user?.full_name ?? ""}`}</Text>
        <TouchableOpacity hitSlop={10} onPress={() => Alert.alert(t("common.comingSoon"))}>
          <Ionicons name="ellipsis-vertical" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.hero}>
        <Text style={styles.heroLabel}>{t("home.balance")}</Text>
        <Text style={styles.heroAmount}>{money(balance)}</Text>
        <View style={styles.heroSync}>
          <Ionicons name="refresh" size={13} color="#A7F3D0" />
          <Text style={styles.heroSyncTxt}> {t("home.lastSynced")} {syncedLabel}</Text>
        </View>
      </View>

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
        <Text style={styles.cardTitle}>{t("home.monthTitle")}</Text>
        <View style={styles.keptRow}>
          <Ionicons name="checkmark-circle" size={18} color={month.net >= 0 ? colors.success : colors.error} />
          <Text style={styles.keptTxt}> {t("home.kept")} <Text style={{ fontWeight: "700", color: colors.primaryDark }}>{money(month.net)}</Text></Text>
        </View>
        <BarLine label={t("home.moneyIn")} value={money(month.in)} width={pctW(month.in, maxBar)} color={colors.moneyIn} />
        <BarLine label={t("home.moneyOut")} value={money(month.out)} width={pctW(month.out, maxBar)} color={colors.moneyOut} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t("home.question")}</Text>
        <Text style={styles.cardSub}>{t("home.questionSub")}</Text>
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
          : recent.map((tx, i) => <TxItem key={tx.id ?? String(i)} tx={tx} last={i === recent.length - 1} />)}
      </View>
    </ScrollView>
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


function TxItem({ tx, last }: { tx: TxRow; last: boolean }) {
  const isIn = tx.direction === "in";
  const name = tx.counterparty_name;
  const cat = tx.category?.name ?? null;
  const title = name || cat || "—";
  const time = new Date(tx.transacted_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  const showNumber = !!tx.counterparty_number;
  const showCat = !showNumber && !!name && !!cat;
  return (
    <View>
      <View style={styles.txRow}>
        <View style={[styles.iconCircle, { width: 36, height: 36, borderRadius: 18, backgroundColor: isIn ? "#DCFCE7" : "#FEE2E2" }]}>
          <Ionicons name={isIn ? "arrow-down" : "arrow-up"} size={18} color={isIn ? "#16A34A" : "#DC2626"} />
        </View>
        <View style={{ flex: 1, marginLeft: 11 }}>
          <Text style={styles.txTitle} numberOfLines={1}>{title}</Text>
          <View style={styles.metaRow}>
            {showNumber ? (
              <>
                <Ionicons name="call-outline" size={11} color={colors.textSecondary} />
                {/* <Text style={styles.metaNum} numberOfLines={1}> {tx.counterparty_number}</Text> */}
                <Text style={styles.metaNum} numberOfLines={1}> {localNum(tx.counterparty_number)}</Text>
              </>
            ) : showCat ? (
              <Text style={styles.txSub} numberOfLines={1}>{cat}</Text>
            ) : null}
            <Ionicons name="time-outline" size={11} color={colors.textSecondary} style={{ marginLeft: showNumber || showCat ? 8 : 0 }} />
            <Text style={styles.txSub}> {time}</Text>
          </View>
        </View>
        <Text style={[styles.txAmt, { color: isIn ? colors.moneyIn : colors.moneyOut }]}>{isIn ? "+" : "−"}{money(tx.amount)}</Text>
      </View>
      {!last ? <View style={styles.sep} /> : null}
    </View>
  );
}

// function TxItem({ tx, last }: { tx: TxRow; last: boolean }) {
//   const isIn = tx.direction === "in";
//   const name = tx.counterparty_name;
//   const cat = tx.category?.name ?? null;
//   const title = name || cat || "—";
//   const time = new Date(tx.transacted_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
//   const subParts: string[] = [];
//   if (tx.counterparty_number) subParts.push(tx.counterparty_number);
//   else if (name && cat) subParts.push(cat);
//   subParts.push(time);
//   const sub = subParts.join(" · ");
//   return (
//     <View>
//       <View style={styles.txRow}>
//         <View style={[styles.iconCircle, { width: 36, height: 36, borderRadius: 18, backgroundColor: isIn ? "#DCFCE7" : "#FEE2E2" }]}>
//           <Ionicons name={isIn ? "arrow-down" : "arrow-up"} size={18} color={isIn ? "#16A34A" : "#DC2626"} />
//         </View>
//         <View style={{ flex: 1, marginLeft: 11 }}>
//           <Text style={styles.txTitle} numberOfLines={1}>{title}</Text>
//           <Text style={styles.txSub} numberOfLines={1}>{sub}</Text>
//         </View>
//         <Text style={[styles.txAmt, { color: isIn ? colors.moneyIn : colors.moneyOut }]}>{isIn ? "+" : "−"}{money(tx.amount)}</Text>
//       </View>
//       {!last ? <View style={styles.sep} /> : null}
//     </View>
//   );
// }

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
  txRow: { flexDirection: "row", alignItems: "center", paddingVertical: 9 },
  txTitle: { fontSize: 14, fontWeight: "500", color: colors.text },
  txSub: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
  txAmt: { fontSize: 14, fontWeight: "600" },
  sep: { height: 1, backgroundColor: "#F1F5F9" },
  empty: { fontSize: 13, color: colors.textSecondary, marginTop: 10, textAlign: "center" },
});

// ------------------

// import { useCallback, useEffect, useState } from "react";
// import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
// import { useSafeAreaInsets } from "react-native-safe-area-context";
// import { useNavigation } from "@react-navigation/native";
// import { Ionicons } from "@expo/vector-icons";
// import { useTranslation } from "react-i18next";
// import { colors } from "../theme";
// import { useSession } from "../store/useSession";
// import { useNetwork } from "../store/useNetwork";
// import { readHome, refreshHome, type HomeData, type TxRow } from "../data/home";
// import { getLastSynced } from "../data/sync";

// const money = (n: number) => "$" + (n ?? 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
// // const pctW = (v: number, max: number) => `${max > 0 ? Math.round((v / max) * 100) : 0}%`;
// const pctW = (v: number, max: number): `${number}%` => `${max > 0 ? Math.round((v / max) * 100) : 0}%`;
// // function BarLine({ label, value, width, color }: { label: string; value: string; width: `${number}%`; color: string }) {

// export default function HomeScreen() {
//   const { t } = useTranslation();
//   const insets = useSafeAreaInsets();
//   const nav = useNavigation<any>();
//   const user = useSession((s) => s.user);
//   const [data, setData] = useState<HomeData | null>(null);
//   const [lastSynced, setLastSynced] = useState<string | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);

//   const loadCache = useCallback(async () => {
//     setData(await readHome());
//     setLastSynced(await getLastSynced());
//     setLoading(false);
//   }, []);

//   const doRefresh = useCallback(async () => {
//     setRefreshing(true);
//     try { await refreshHome(); } catch {}
//     await loadCache();
//     setRefreshing(false);
//   }, [loadCache]);

//   useEffect(() => {
//     (async () => {
//       await loadCache();
//       if (useNetwork.getState().online) { try { await refreshHome(); await loadCache(); } catch {} }
//     })();
//   }, [loadCache]);

//   const balance = data?.balance ?? 0;
//   const today = data?.today ?? { in: 0, out: 0 };
//   const month = data?.month ?? { in: 0, out: 0, net: 0 };
//   const cats = data?.topCategories ?? [];
//   const recent = data?.recent ?? [];
//   const maxBar = Math.max(month.in, month.out, 1);
//   const maxCat = Math.max(cats[0]?.amount ?? 0, 1);
//   const syncedLabel = lastSynced ? new Date(lastSynced).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";

//   if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;

//   return (
//     <ScrollView
//       style={{ flex: 1, backgroundColor: colors.background }}
//       contentContainerStyle={{ paddingBottom: 28 }}
//       refreshControl={<RefreshControl refreshing={refreshing} onRefresh={doRefresh} tintColor={colors.primary} />}
//     >
//       <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
//         {/* <Text style={styles.hello} numberOfLines={1}>{t("home.greeting")}{user ? `, ${user.full_name}` : ""}</Text> */}
//         <Text style={styles.hello} numberOfLines={1}>{`${t("home.greeting")}, ${user?.full_name ?? ""}`}</Text>
//         <TouchableOpacity hitSlop={10} onPress={() => { /* Settings/Tracked menu — Step 9 */ }}>
//           <Ionicons name="ellipsis-vertical" size={22} color={colors.text} />
//         </TouchableOpacity>
//       </View>

//       <View style={styles.hero}>
//         <Text style={styles.heroLabel}>{t("home.balance")}</Text>
//         <Text style={styles.heroAmount}>{money(balance)}</Text>
//         <View style={styles.heroSync}>
//           <Ionicons name="refresh" size={13} color="#A7F3D0" />
//           <Text style={styles.heroSyncTxt}> {t("home.lastSynced")} {syncedLabel}</Text>
//         </View>
//       </View>

//       <View style={styles.row}>
//         <View style={[styles.miniCard, { marginRight: 6 }]}>
//           <View style={styles.miniHead}>
//             <View style={[styles.iconCircle, { backgroundColor: "#DCFCE7" }]}><Ionicons name="arrow-down" size={15} color="#16A34A" /></View>
//             <Text style={styles.miniLabel}>{t("home.todayReceived")}</Text>
//           </View>
//           <Text style={[styles.miniAmount, { color: colors.moneyIn }]}>+{money(today.in)}</Text>
//         </View>
//         <View style={[styles.miniCard, { marginLeft: 6 }]}>
//           <View style={styles.miniHead}>
//             <View style={[styles.iconCircle, { backgroundColor: "#FEE2E2" }]}><Ionicons name="arrow-up" size={15} color="#DC2626" /></View>
//             <Text style={styles.miniLabel}>{t("home.todaySpent")}</Text>
//           </View>
//           <Text style={[styles.miniAmount, { color: colors.moneyOut }]}>−{money(today.out)}</Text>
//         </View>
//       </View>

//       <View style={styles.card}>
//         <Text style={styles.cardTitle}>{t("home.monthTitle")}</Text>
//         <View style={styles.keptRow}>
//           <Ionicons name="checkmark-circle" size={18} color={month.net >= 0 ? colors.success : colors.error} />
//           <Text style={styles.keptTxt}> {t("home.kept")} <Text style={{ fontWeight: "700", color: colors.primaryDark }}>{money(month.net)}</Text></Text>
//         </View>
//         <BarLine label={t("home.moneyIn")} value={money(month.in)} width={pctW(month.in, maxBar)} color={colors.moneyIn} />
//         <BarLine label={t("home.moneyOut")} value={money(month.out)} width={pctW(month.out, maxBar)} color={colors.moneyOut} />
//       </View>

//       <View style={styles.card}>
//         <Text style={styles.cardTitle}>{t("home.question")}</Text>
//         <Text style={styles.cardSub}>{t("home.questionSub")}</Text>
//         {cats.length === 0
//           ? <Text style={styles.empty}>{t("home.empty")}</Text>
//           : cats.map((c, i) => (
//             <View key={i} style={{ marginTop: 11 }}>
//               <View style={styles.lineTop}>
//                 <Text style={styles.catName}>{c.name}</Text>
//                 <Text style={styles.catAmt}>{money(c.amount)}</Text>
//               </View>
//               <View style={styles.barTrack}><View style={[styles.barFill, { width: pctW(c.amount, maxCat), backgroundColor: colors.primary }]} /></View>
//             </View>
//           ))}
//       </View>

//       <View style={styles.card}>
//         <View style={styles.recentHead}>
//           <Text style={styles.cardTitle}>{t("home.recent")}</Text>
//           <TouchableOpacity onPress={() => nav.navigate("Transactions")}>
//             <Text style={styles.seeAll}>{t("home.seeAll")} ›</Text>
//           </TouchableOpacity>
//         </View>
//         {recent.length === 0
//           ? <Text style={styles.empty}>{t("home.empty")}</Text>
//           : recent.map((tx, i) => <TxItem key={tx.id ?? String(i)} tx={tx} last={i === recent.length - 1} />)}
//       </View>
//     </ScrollView>
//   );
// }

// // function BarLine({ label, value, width, color }: { label: string; value: string; width: string; color: string }) {
// function BarLine({ label, value, width, color }: { label: string; value: string; width: `${number}%`; color: string }) {
//   return (
//     <View style={{ marginTop: 10 }}>
//       <View style={styles.lineTop}>
//         <Text style={styles.barLabel}>{label}</Text>
//         <Text style={styles.barValue}>{value}</Text>
//       </View>
//       <View style={styles.barTrack}><View style={[styles.barFill, { width, backgroundColor: color }]} /></View>
//     </View>
//   );
// }

// function TxItem({ tx, last }: { tx: TxRow; last: boolean }) {
//   const isIn = tx.direction === "in";
//   const title = tx.counterparty_name || tx.category?.name || "—";
//   const time = new Date(tx.transacted_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
//   return (
//     <View>
//       <View style={styles.txRow}>
//         <View style={[styles.iconCircle, { width: 36, height: 36, borderRadius: 18, backgroundColor: isIn ? "#DCFCE7" : "#FEE2E2" }]}>
//           <Ionicons name={isIn ? "arrow-down" : "arrow-up"} size={18} color={isIn ? "#16A34A" : "#DC2626"} />
//         </View>
//         <View style={{ flex: 1, marginLeft: 11 }}>
//           <Text style={styles.txTitle} numberOfLines={1}>{title}</Text>
//           <Text style={styles.txSub} numberOfLines={1}>{tx.category?.name ? tx.category.name + " · " : ""}{time}</Text>
//         </View>
//         <Text style={[styles.txAmt, { color: isIn ? colors.moneyIn : colors.moneyOut }]}>{isIn ? "+" : "−"}{money(tx.amount)}</Text>
//       </View>
//       {!last ? <View style={styles.sep} /> : null}
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
//   header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingBottom: 12, backgroundColor: colors.surface },
//   hello: { fontSize: 18, fontWeight: "600", color: colors.text, flex: 1 },
//   hero: { margin: 16, marginBottom: 4, backgroundColor: colors.primaryDark, borderRadius: 18, padding: 18 },
//   heroLabel: { fontSize: 13, color: "#A7F3D0" },
//   heroAmount: { fontSize: 32, fontWeight: "700", color: "#fff", marginTop: 2 },
//   heroSync: { flexDirection: "row", alignItems: "center", marginTop: 6 },
//   heroSyncTxt: { fontSize: 12, color: "#D1FAE5" },
//   row: { flexDirection: "row", paddingHorizontal: 16, marginTop: 10 },
//   miniCard: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 12 },
//   miniHead: { flexDirection: "row", alignItems: "center", gap: 6 },
//   iconCircle: { width: 22, height: 22, borderRadius: 7, alignItems: "center", justifyContent: "center" },
//   miniLabel: { fontSize: 12, color: colors.textSecondary, marginLeft: 6, flex: 1 },
//   miniAmount: { fontSize: 20, fontWeight: "600", marginTop: 8 },
//   card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16, marginHorizontal: 16, marginTop: 14 },
//   cardTitle: { fontSize: 15, fontWeight: "600", color: colors.text },
//   cardSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
//   keptRow: { flexDirection: "row", alignItems: "center", marginTop: 10 },
//   keptTxt: { fontSize: 15, color: colors.text },
//   lineTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
//   barLabel: { fontSize: 12, color: colors.textSecondary },
//   barValue: { fontSize: 13, fontWeight: "600", color: colors.text },
//   barTrack: { height: 9, backgroundColor: "#F1F5F9", borderRadius: 6, overflow: "hidden" },
//   barFill: { height: "100%", borderRadius: 6 },
//   catName: { fontSize: 13, color: colors.text },
//   catAmt: { fontSize: 13, fontWeight: "600", color: colors.text },
//   recentHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
//   seeAll: { fontSize: 13, color: colors.primary },
//   txRow: { flexDirection: "row", alignItems: "center", paddingVertical: 9 },
//   txTitle: { fontSize: 14, fontWeight: "500", color: colors.text },
//   txSub: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
//   txAmt: { fontSize: 14, fontWeight: "600" },
//   sep: { height: 1, backgroundColor: "#F1F5F9" },
//   empty: { fontSize: 13, color: colors.textSecondary, marginTop: 10, textAlign: "center" },
// });





