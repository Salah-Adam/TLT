import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { colors } from "../theme";
import { useLanguage } from "../store/useLanguage";
import { api, ApiError } from "../api/client";

type Category = { id: string; name: string };

export default function HomeScreen() {
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();
  const [result, setResult] = useState("");

  const testApi = async () => {
    setResult("…");
    try {
      const cats = await api.get<Category[]>("/api/v1/categories");
      setResult(`✅ ${cats.length} categories`);
    } catch (e) {
      setResult(`❌ ${e instanceof ApiError ? e.code : String(e)}`);
    }
  };

  return (
    <View style={styles.c}>
      <Text style={styles.t}>{t("tabs.home")}</Text>
      <Text style={styles.s}>{t("common.comingSoon")}</Text>

      <TouchableOpacity style={styles.btn} onPress={() => setLanguage(language === "so" ? "en" : "so")}>
        <Text style={styles.btnText}>{language === "so" ? "Switch to English" : "U beddel Soomaali"}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.btn, styles.btn2]} onPress={testApi}>
        <Text style={styles.btnText}>Test API: /categories</Text>
      </TouchableOpacity>
      {result ? <Text style={styles.result}>{result}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", padding: 24 },
  t: { fontSize: 26, fontWeight: "600", color: colors.text },
  s: { fontSize: 14, color: colors.textSecondary, marginTop: 6, marginBottom: 24 },
  btn: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginTop: 12 },
  btn2: { backgroundColor: colors.secondary },
  btnText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  result: { marginTop: 16, fontSize: 16, color: colors.text },
});



// ----------------


// import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
// import { useTranslation } from "react-i18next";
// import { colors } from "../theme";
// import { useLanguage } from "../store/useLanguage";

// export default function HomeScreen() {
//   const { t } = useTranslation();
//   const { language, setLanguage } = useLanguage();
//   return (
//     <View style={styles.c}>
//       <Text style={styles.t}>{t("tabs.home")}</Text>
//       <Text style={styles.s}>{t("common.comingSoon")}</Text>
//       <TouchableOpacity style={styles.btn} onPress={() => setLanguage(language === "so" ? "en" : "so")}>
//         <Text style={styles.btnText}>
//           {language === "so" ? "Switch to English" : "U beddel Soomaali"}
//         </Text>
//       </TouchableOpacity>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   c: { flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", padding: 24 },
//   t: { fontSize: 26, fontWeight: "600", color: colors.text },
//   s: { fontSize: 14, color: colors.textSecondary, marginTop: 6, marginBottom: 24 },
//   btn: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
//   btnText: { color: "#fff", fontWeight: "600", fontSize: 15 },
// });