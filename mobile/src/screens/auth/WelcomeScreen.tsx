import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { colors } from "../../theme";
import { Button } from "../../components/Button";
import type { AuthStackParamList } from "../../navigation/AuthStack";

export default function WelcomeScreen() {
  const { t } = useTranslation();
  const nav = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  return (
    <View style={styles.c}>
      <View style={styles.center}>
        <Text style={styles.logo}>TLT</Text>
        <Text style={styles.tagline}>{t("auth.tagline")}</Text>
      </View>
      <View style={styles.actions}>
        <Button title={t("auth.createAccount")} onPress={() => nav.navigate("Register")} />
        <View style={{ height: 12 }} />
        <Button title={t("auth.haveAccount")} onPress={() => nav.navigate("Login")} variant="ghost" />
        <TouchableOpacity style={styles.recover} onPress={() => nav.navigate("Recover")}>
          <Text style={styles.recoverTxt}>{t("recover.link")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.background, padding: 24 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  logo: { fontSize: 56, fontWeight: "700", color: colors.primaryDark },
  tagline: { fontSize: 16, color: colors.textSecondary, marginTop: 8, textAlign: "center" },
  actions: { paddingBottom: 50 },
  recover: { alignSelf: "center", marginTop: 16 },
  recoverTxt: { color: colors.primary, fontSize: 14 },
});

