// Level 1: the folder inbox — one row per notification type, newest-active on top,
// with a preview of the latest message and an unread-count badge. Tap → open the folder.
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { colors } from "../theme";
import { useNetwork } from "../store/useNetwork";
import { useNotifications } from "../store/useNotifications";
import { readFolders, refreshNotifications, flushPendingReads, type Folder } from "../data/notifications";
import { syncAll } from "../data/sync";
import { EmptyState } from "../components/EmptyState";

function familyIcon(key: string) {
  switch (key) {
    case "transactions": return { name: "swap-horizontal", bg: "#DCFCE7", fg: "#059669" };
    case "alerts": return { name: "alert-circle", bg: "#FEF3C7", fg: "#B45309" };
    case "summaries": return { name: "stats-chart", bg: "#DBEAFE", fg: "#1D4ED8" };
    case "reports": return { name: "document-text", bg: "#D1FAE5", fg: "#059669" };
    default: return { name: "person-circle", bg: "#F1F5F9", fg: "#64748B" };
  }
}

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const nav = useNavigation<any>();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => { setFolders(await readFolders()); setLoading(false); }, []);

  useFocusEffect(useCallback(() => { load(); useNotifications.getState().refresh(); }, [load]));
  useEffect(() => {
    (async () => {
      if (useNetwork.getState().online) { try { await flushPendingReads(); await refreshNotifications(); await load(); } catch {} }
      useNotifications.getState().refresh();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await syncAll(); } catch {}
    await load(); useNotifications.getState().refresh();
    setRefreshing(false);
  }, [load]);
  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.background }}
      data={folders}
      keyExtractor={(f) => f.key}
      contentContainerStyle={{ paddingVertical: 6 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={doRefresh} tintColor={colors.primary} />}
      // ListEmptyComponent={<Text style={styles.empty}>{t("notif.empty")}</Text>}
      ListEmptyComponent={<EmptyState icon="notifications-outline" title={t("notif.empty")} subtitle={t("notif.emptyHint")} />}
      renderItem={({ item }) => {
        const ic = familyIcon(item.key);
        const when = new Date(item.latestAt).toLocaleDateString([], { day: "numeric", month: "short" });
        const hasUnread = item.unread > 0;
        return (
          <TouchableOpacity style={styles.row} activeOpacity={0.7}
            onPress={() => nav.navigate("NotifGroup", { family: item.key, title: t(`notif.group_${item.key}`) })}>
            <View style={[styles.avatar, { backgroundColor: ic.bg }]}><Ionicons name={ic.name as any} size={22} color={ic.fg} /></View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.folder, hasUnread && styles.folderUnread]} numberOfLines={1}>{t(`notif.group_${item.key}`)}</Text>
              <Text style={[styles.preview, hasUnread && { color: colors.text }]} numberOfLines={1}>{item.latestBody || item.latestTitle}</Text>
            </View>
            <View style={styles.right}>
              <Text style={styles.when}>{when}</Text>
              {hasUnread ? <View style={styles.badge}><Text style={styles.badgeTxt}>{item.unread}</Text></View> : null}
            </View>
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 16, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  folder: { fontSize: 15, color: colors.text },
  folderUnread: { fontWeight: "700" },
  preview: { fontSize: 13, color: colors.textSecondary, marginTop: 3 },
  right: { alignItems: "flex-end", marginLeft: 10 },
  when: { fontSize: 12, color: colors.textSecondary },
  badge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", paddingHorizontal: 6, marginTop: 6 },
  badgeTxt: { color: "#fff", fontSize: 12, fontWeight: "700" },
  empty: { textAlign: "center", color: colors.textSecondary, marginTop: 40, fontSize: 14 },
});
