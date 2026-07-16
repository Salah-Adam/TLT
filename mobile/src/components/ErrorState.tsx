import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { colors } from "../theme";

export function ErrorState({ title, subtitle, onRetry }: { title?: string; subtitle?: string; onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <View style={styles.wrap}>
      <View style={styles.circle}><Ionicons name="cloud-offline-outline" size={28} color={colors.error} /></View>
      <Text style={styles.title}>{title ?? t("common.loadFailed")}</Text>
      {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
      <TouchableOpacity style={styles.btn} onPress={onRetry}>
        <Ionicons name="refresh" size={16} color={colors.primary} />
        <Text style={styles.btnTxt}>{t("common.retry")}</Text>
      </TouchableOpacity>
    </View>
  );
}
const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center", paddingVertical: 48, paddingHorizontal: 32 },
  circle: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#FEE2E2", alignItems: "center", justifyContent: "center", marginBottom: 14 },
  title: { fontSize: 15, fontWeight: "600", color: colors.text, textAlign: "center" },
  sub: { fontSize: 13, color: colors.textSecondary, textAlign: "center", marginTop: 6 },
  btn: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 16, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
  btnTxt: { fontSize: 14, color: colors.primary, fontWeight: "600" },
});