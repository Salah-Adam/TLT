// // a tiny reusable placeholder so the four tab screens aren't copy-pasted boilerplate; each real screen replaces it in later steps.


import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { colors } from "../theme";

export function ScreenPlaceholder({ title }: { title: string }) {
  const { t } = useTranslation();
  return (
    <View style={styles.c}>
      <Text style={styles.t}>{title}</Text>
      <Text style={styles.s}>{t("common.comingSoon")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" },
  t: { fontSize: 26, fontWeight: "600", color: colors.text },
  s: { fontSize: 14, color: colors.textSecondary, marginTop: 6 },
});
