import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { colors } from "../theme";

const APP_VERSION = "1.0.0";
export default function AboutScreen() {
  const { t } = useTranslation();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 20 }}>
      <Text style={styles.name}>TLT</Text>
      <Text style={styles.version}>v{APP_VERSION}</Text>
      <Text style={styles.tagline}>{t("about.tagline")}</Text>
      <Text style={styles.body}>{t("about.p1")}</Text>
      <Text style={styles.body}>{t("about.p2")}</Text>
      <Text style={styles.body}>{t("about.p3")}</Text>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  name: { fontSize: 26, fontWeight: "700", color: colors.primary },
  version: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  tagline: { fontSize: 16, fontWeight: "600", color: colors.text, marginTop: 18 },
  body: { fontSize: 14, lineHeight: 22, color: colors.textSecondary, marginTop: 12 },
});