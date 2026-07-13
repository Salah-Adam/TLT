// Manage the account's numbers: list (number · Primary · provider · added date), add, delete.
// Deleting your LAST active number deletes the account (backend), so we warn hard and sign out.
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { colors } from "../theme";
import { useNetwork } from "../store/useNetwork";
import { useSession } from "../store/useSession";
import { listPhoneNumbers, deletePhoneNumber, type PhoneNumber } from "../data/phoneNumbers";

const localNum = (n?: string | null) => (n ?? "").replace(/^252/, "");

export default function PhoneNumbersScreen() {
  const { t } = useTranslation();
  const nav = useNavigation<any>();
  const [items, setItems] = useState<PhoneNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { const list = await listPhoneNumbers(); setItems(list.filter((p) => p.is_active)); }
    catch { /* keep what we have */ }
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const doRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  useEffect(() => {
    nav.setOptions({
      headerRight: () => (
        <TouchableOpacity hitSlop={10} onPress={() => nav.navigate("AddPhoneNumber")}>
          <Ionicons name="add" size={26} color={colors.primary} />
        </TouchableOpacity>
      ),
    });
  }, [nav]);

  // const onDelete = (p: PhoneNumber) => {
  //   if (!useNetwork.getState().online) { Alert.alert(t("phones.offlineAction")); return; }
  //   const isLast = items.length <= 1;
  //   Alert.alert(
  //     isLast ? t("phones.deleteLastTitle") : t("phones.deleteTitle"),
  //     isLast ? t("phones.deleteLastBody") : t("phones.deleteBody"),
  //     [
  //       { text: t("settings.cancel"), style: "cancel" },
  //       { text: t("phones.delete"), style: "destructive", onPress: async () => {
  //         try {
  //           const r = await deletePhoneNumber(p.id);
  //           if (r.accountDeleted) {
  //             Alert.alert(t("phones.accountDeletedTitle"), t("phones.accountDeletedBody"), [
  //               { text: "OK", onPress: () => useSession.getState().signOut() },
  //             ]);
  //           } else { await load(); }
  //         } catch (e: any) { Alert.alert(t("auth.errorTitle"), e?.message ?? ""); }
  //       } },
  //     ]
  //   );
  // };

  const doDelete = async (p: PhoneNumber) => {
    try {
      const r = await deletePhoneNumber(p.id);
      if (r.accountDeleted) {
        Alert.alert(t("phones.accountDeletedTitle"), t("phones.accountDeletedBody"), [
          { text: "OK", onPress: () => useSession.getState().signOut() },
        ]);
      } else { await load(); }
    } catch (e: any) { Alert.alert(t("auth.errorTitle"), e?.message ?? ""); }
  };

  const onDelete = (p: PhoneNumber) => {
    if (!useNetwork.getState().online) { Alert.alert(t("phones.offlineAction")); return; }
    if (items.length > 1) {
      Alert.alert(t("phones.deleteTitle"), t("phones.deleteBody"), [
        { text: t("settings.cancel"), style: "cancel" },
        { text: t("phones.delete"), style: "destructive", onPress: () => doDelete(p) },
      ]);
      return;
    }
    // Last number → deleting it deletes the account. Two-step confirmation.
    Alert.alert(t("phones.deleteLastTitle"), t("phones.deleteLastBody"), [
      { text: t("settings.cancel"), style: "cancel" },
      { text: t("phones.continue"), style: "destructive", onPress: () => {
        Alert.alert(t("phones.deleteAccountTitle"), t("phones.deleteAccountBody"), [
          { text: t("settings.cancel"), style: "cancel" },
          { text: t("phones.deleteAccount"), style: "destructive", onPress: () => doDelete(p) },
        ]);
      } },
    ]);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.background }}
      data={items}
      keyExtractor={(p) => p.id}
      contentContainerStyle={{ padding: 16, paddingBottom: 28, flexGrow: 1 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={doRefresh} tintColor={colors.primary} />}
      ListEmptyComponent={
        <View style={styles.emptyWrap}>
          <Ionicons name="call-outline" size={40} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>{t("phones.empty")}</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => nav.navigate("AddPhoneNumber")}>
            <Ionicons name="add" size={18} color="#fff" /><Text style={styles.addTxt}>{t("phones.addTitle")}</Text>
          </TouchableOpacity>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.icon}><Ionicons name="call" size={18} color={colors.primaryDark} /></View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={styles.num}>{localNum(item.number)}</Text>
              {item.is_primary ? <Text style={styles.badge}>{t("phones.primary")}</Text> : null}
            </View>
            <Text style={styles.sub}>{(item.provider_name ?? item.provider ?? "")} · {t("phones.addedOn", { date: new Date(item.created_at).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" }) })}</Text>
          </View>
          <TouchableOpacity onPress={() => onDelete(item)} hitSlop={8}><Ionicons name="trash-outline" size={20} color={colors.error} /></TouchableOpacity>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 14, marginBottom: 10 },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "#DCFCE7" },
  num: { fontSize: 16, fontWeight: "600", color: colors.text },
  badge: { fontSize: 10, color: colors.primaryDark, backgroundColor: "#D1FAE5", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, overflow: "hidden", fontWeight: "600" },
  sub: { fontSize: 12, color: colors.textSecondary, marginTop: 3 },
  emptyWrap: { alignItems: "center", justifyContent: "center", flex: 1, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 15, color: colors.textSecondary, marginTop: 12 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 18, marginTop: 18 },
  addTxt: { color: "#fff", fontSize: 15, fontWeight: "600" },
});