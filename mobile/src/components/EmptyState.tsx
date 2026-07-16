import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme";

export function EmptyState({ icon = "file-tray-outline", title, subtitle }: { icon?: any; title: string; subtitle?: string }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.circle}><Ionicons name={icon} size={28} color={colors.textSecondary} /></View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
    </View>
  );
}
const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center", paddingVertical: 48, paddingHorizontal: 32 },
  circle: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center", marginBottom: 14 },
  title: { fontSize: 15, fontWeight: "600", color: colors.text, textAlign: "center" },
  sub: { fontSize: 13, color: colors.textSecondary, textAlign: "center", marginTop: 6, lineHeight: 19 },
});