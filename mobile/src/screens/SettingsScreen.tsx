// Settings hub: Account rows, inline language toggle (re-issues token + re-syncs), About, Log out.
import { useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { colors } from "../theme";
import { useLanguage } from "../store/useLanguage";
import { changeLanguage, logout } from "../data/profile";

const APP_VERSION = "1.0.0"; // update per release

export default function SettingsScreen() {
  const { t } = useTranslation();
  const nav = useNavigation<any>();
  const language = useLanguage((s) => s.language);
  const [switching, setSwitching] = useState(false);

  const onLanguage = async (lang: "so" | "en") => {
    if (lang === language || switching) return;
    setSwitching(true);
    try { await changeLanguage(lang); }
    catch (e: any) { Alert.alert(t("auth.errorTitle"), e?.message ?? ""); }
    setSwitching(false);
  };

  const onLogout = () => {
    Alert.alert(t("settings.logoutTitle"), t("settings.logoutBody"), [
      { text: t("settings.cancel"), style: "cancel" },
      { text: t("settings.logout"), style: "destructive", onPress: async () => { try { await logout(); } catch {} } },
    ]);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ paddingVertical: 12 }}>
      <Text style={styles.section}>{t("settings.account")}</Text>
      <View style={styles.group}>
        <Row icon="person-outline" label={t("settings.profile")} onPress={() => nav.navigate("Profile")} />
        <View style={styles.divider} />
        <Row icon="call-outline" label={t("phones.title")} onPress={() => nav.navigate("PhoneNumbers")} />
        <View style={styles.divider} />
        <Row icon="lock-closed-outline" label={t("settings.changePassword")} onPress={() => nav.navigate("ChangePassword")} />
        <View style={styles.divider} />
        <Row icon="trash-outline" label={t("deleted.title")} onPress={() => nav.navigate("DeletedTransactions")} />

      </View>
      

      <Text style={styles.section}>{t("settings.preferences")}</Text>
      <View style={styles.group}>
        <View style={styles.langRow}>
          <View style={styles.rowLeft}>
            <Ionicons name="language-outline" size={20} color={colors.text} />
            <Text style={styles.rowLabel}>{t("settings.language")}</Text>
          </View>
          {switching ? <ActivityIndicator color={colors.primary} /> : (
            <View style={styles.segment}>
              {(["so", "en"] as const).map((l, i) => (
                <TouchableOpacity key={l} onPress={() => onLanguage(l)} style={[styles.seg, i > 0 && styles.segDivider, language === l && styles.segActive]}>
                  <Text style={[styles.segTxt, language === l && styles.segTxtActive]}>{l === "so" ? "Af-Soomaali" : "English"}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      <Text style={styles.section}>{t("settings.about")}</Text>
      <View style={styles.group}>
        <View style={styles.aboutRow}><Text style={styles.rowLabel}>TLT</Text><Text style={styles.muted}>v{APP_VERSION}</Text></View>
      </View>

      <TouchableOpacity style={styles.logout} onPress={onLogout} activeOpacity={0.7}>
        <Ionicons name="log-out-outline" size={20} color={colors.error} />
        <Text style={styles.logoutTxt}>{t("settings.logout")}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Row({ icon, label, onPress }: { icon: any; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.rowLeft}><Ionicons name={icon} size={20} color={colors.text} /><Text style={styles.rowLabel}>{label}</Text></View>
      <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 12, fontWeight: "600", color: colors.textSecondary, marginHorizontal: 20, marginTop: 18, marginBottom: 6, textTransform: "uppercase" },
  group: { backgroundColor: colors.surface, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 15 },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  rowLabel: { fontSize: 15, color: colors.text },
  divider: { height: 1, backgroundColor: "#F1F5F9", marginLeft: 48 },
  langRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 11 },
  segment: { flexDirection: "row", height: 32, borderRadius: 999, borderWidth: 1, borderColor: colors.border, overflow: "hidden", backgroundColor: colors.background },
  seg: { paddingHorizontal: 12, justifyContent: "center" },
  segDivider: { borderLeftWidth: 1, borderLeftColor: colors.border },
  segActive: { backgroundColor: colors.primary },
  segTxt: { fontSize: 12, color: colors.textSecondary },
  segTxtActive: { color: "#fff", fontWeight: "600" },
  aboutRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 15 },
  muted: { color: colors.textSecondary, fontSize: 14 },
  logout: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 24, marginHorizontal: 16, paddingVertical: 15, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12 },
  logoutTxt: { color: colors.error, fontSize: 15, fontWeight: "600" },
});