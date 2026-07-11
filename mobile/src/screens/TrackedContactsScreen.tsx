// Level-1: the list of tracked people — a card per contact with the all-time net + summary.
// ＋ in the header adds one. Network-first (offline shows the last snapshot).
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { colors } from "../theme";
import { readContacts, type TrackedContact } from "../data/trackedContacts";

const money = (n: number) => "$" + (n ?? 0).toLocaleString("en-US", { maximumFractionDigits: 2 });

export default function TrackedContactsScreen() {
  const { t } = useTranslation();
  const nav = useNavigation<any>();
  const [items, setItems] = useState<TrackedContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => { setItems(await readContacts()); setLoading(false); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const doRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  useEffect(() => {
    nav.setOptions({
      headerRight: () => (
        <TouchableOpacity hitSlop={10} onPress={() => nav.navigate("ContactForm")}>
          <Ionicons name="add" size={26} color={colors.primary} />
        </TouchableOpacity>
      ),
    });
  }, [nav]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.background }}
      data={items}
      keyExtractor={(c) => c.id}
      contentContainerStyle={{ padding: 16, paddingBottom: 28, flexGrow: 1 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={doRefresh} tintColor={colors.primary} />}
      ListEmptyComponent={
        <View style={styles.emptyWrap}>
          <Ionicons name="people-outline" size={40} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>{t("contacts.empty")}</Text>
          <Text style={styles.emptyHint}>{t("contacts.emptyHint")}</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => nav.navigate("ContactForm")}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.addTxt}>{t("contacts.addContact")}</Text>
          </TouchableOpacity>
        </View>
      }
      renderItem={({ item }) => {
        const isPos = item.net >= 0;
        const last = item.last_transaction_at
          ? t("contacts.lastActivity", { date: new Date(item.last_transaction_at).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" }) })
          : t("contacts.noActivity");
        return (
          <TouchableOpacity style={styles.card} activeOpacity={0.7}
            onPress={() => nav.navigate("TrackedContactDetail", { id: item.id, label: item.label })}>
            <View style={styles.cardTop}>
              <Text style={styles.label} numberOfLines={1}>{item.label}</Text>
              <Text style={[styles.net, { color: isPos ? colors.moneyIn : colors.moneyOut }]}>{isPos ? "+" : "−"}{money(Math.abs(item.net))}</Text>
            </View>
            <Text style={styles.summary} numberOfLines={1}>
              {t("contacts.summary", { sent: money(item.total_sent), received: money(item.total_received), count: item.transaction_count })}
            </Text>
            <Text style={styles.last}>{last}</Text>
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16, marginBottom: 12 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label: { fontSize: 16, fontWeight: "600", color: colors.text, flex: 1, marginRight: 10 },
  net: { fontSize: 16, fontWeight: "700" },
  summary: { fontSize: 13, color: colors.textSecondary, marginTop: 6 },
  last: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  emptyWrap: { alignItems: "center", justifyContent: "center", flex: 1, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: colors.text, marginTop: 14, textAlign: "center" },
  emptyHint: { fontSize: 13, color: colors.textSecondary, marginTop: 6, textAlign: "center" },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 18, marginTop: 20 },
  addTxt: { color: "#fff", fontSize: 15, fontWeight: "600" },
});