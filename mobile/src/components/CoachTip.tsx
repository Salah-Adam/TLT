import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";

// type Arrow = "top-right" | "bottom-left" | "none";
type Arrow = "top-right" | "top-left" | "bottom-left" | "none";

export function CoachTip({ text, onDismiss, arrow = "none", style }: { text: string; onDismiss: () => void; arrow?: Arrow; style?: any }) {
  const { t } = useTranslation();
  return (
    <View pointerEvents="box-none" style={[styles.wrap, style]}>
      <View style={styles.bubble}>
        {arrow === "top-right" ? <View style={styles.arrowTop} /> : null}
        {arrow === "top-left" ? <View style={styles.arrowTopLeft} /> : null}
        <Text style={styles.txt}>{text}</Text>
        <TouchableOpacity onPress={onDismiss} hitSlop={8} style={styles.btn}>
          <Text style={styles.btnTxt}>{t("onboarding.gotIt")}</Text>
        </TouchableOpacity>
        {arrow === "bottom-left" ? <View style={styles.arrowBottom} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute" },
  bubble: { backgroundColor: "#0F172A", borderRadius: 12, paddingHorizontal: 13, paddingVertical: 11 },
  txt: { color: "#fff", fontSize: 13, lineHeight: 19 },
  btn: { alignSelf: "flex-end", marginTop: 8 },
  btnTxt: { color: "#6EE7B7", fontSize: 13, fontWeight: "600" },
  arrowTop: { position: "absolute", top: -6, right: 18, width: 14, height: 14, backgroundColor: "#0F172A", transform: [{ rotate: "45deg" }] },
  arrowBottom: { position: "absolute", bottom: -6, left: 20, width: 14, height: 14, backgroundColor: "#0F172A", transform: [{ rotate: "45deg" }] },
  arrowTopLeft: { position: "absolute", top: -6, left: 18, width: 14, height: 14, backgroundColor: "#0F172A", transform: [{ rotate: "45deg" }] },

});