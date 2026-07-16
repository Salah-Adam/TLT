import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { colors } from "../../theme";
import { TextField } from "../../components/TextField";
import { PhoneField } from "../../components/PhoneField";
import { PasswordField } from "../../components/PasswordField";
import { Button } from "../../components/Button";
import { normalizePhone } from "../../utils/phone";
import { validateRegister } from "../../utils/validate";
import { authApi } from "../../api/auth";
import { ApiError } from "../../api/client";
import { useLanguage } from "../../store/useLanguage";
import type { AuthStackParamList } from "../../navigation/AuthStack";

export default function RegisterScreen() {
  const { t } = useTranslation();
  const nav = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const { language, setLanguage } = useLanguage();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [canReclaim, setCanReclaim] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const phoneNumber = normalizePhone(phone);
    const v = validateRegister(fullName, phoneNumber, password);
    if (v) { setError(t(v)); return; }
    setError(""); setCanReclaim(false);
    setLoading(true);
    try {
      await authApi.register({ fullName: fullName.trim(), phoneNumber, password, language });
      // nav.navigate("Otp", { phoneNumber, purpose: "register" });
      nav.navigate("Otp", { phoneNumber, purpose: "register", fullName: fullName.trim(), password, language });
    } catch (e) {
      if (e instanceof ApiError && e.code === "PHONE_ALREADY_REGISTERED") {
        setError(e.message);
        setCanReclaim(true);
      } else {
        setError(e instanceof ApiError ? e.message : t("auth.genericError"));
      }
    } finally {
      setLoading(false);
    }
  };

  const reclaim = async () => {
    setError(""); setLoading(true);
    try {
      const phoneNumber = normalizePhone(phone);
      await authApi.reclaim({ fullName: fullName.trim(), phoneNumber, password, language });
      // nav.navigate("Otp", { phoneNumber, purpose: "reclaim" });
      nav.navigate("Otp", { phoneNumber, purpose: "reclaim", fullName: fullName.trim(), password, language });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("auth.genericError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={styles.c} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{t("auth.registerTitle")}</Text>
        <TextField label={t("auth.fullName")} value={fullName} onChangeText={setFullName} autoCapitalize="words" />
        <PhoneField label={t("auth.phone")} value={phone} onChangeText={(v) => { setPhone(v); setCanReclaim(false); }} placeholder={t("auth.numberHint")} />
        <PasswordField label={t("auth.password")} value={password} onChangeText={setPassword} />
        <Text style={styles.label}>{t("auth.language")}</Text>
        <View style={styles.segment}>
          {(["so", "en"] as const).map((lng) => (
            <TouchableOpacity key={lng} style={[styles.segBtn, language === lng && styles.segActive]} onPress={() => setLanguage(lng)}>
              <Text style={[styles.segText, language === lng && styles.segTextActive]}>{lng === "so" ? "Soomaali" : "English"}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {canReclaim
          ? <Button title={t("auth.reclaimBtn")} onPress={reclaim} loading={loading} />
          : <Button title={t("auth.registerBtn")} onPress={submit} loading={loading} />}
        <View style={{ height: 8 }} />
        <Button title={t("auth.haveAccount")} onPress={() => nav.navigate("Login")} variant="ghost" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  c: { flexGrow: 1, justifyContent: "center", padding: 24 },
  title: { fontSize: 24, fontWeight: "700", color: colors.text, textAlign: "center", marginBottom: 24 },
  label: { fontSize: 13, color: colors.textSecondary, marginBottom: 6 },
  segment: { flexDirection: "row", backgroundColor: colors.border, borderRadius: 12, padding: 4, marginBottom: 16 },
  segBtn: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: "center" },
  segActive: { backgroundColor: colors.surface },
  segText: { fontSize: 15, color: colors.textSecondary, fontWeight: "600" },
  segTextActive: { color: colors.primaryDark },
  error: { color: colors.error, fontSize: 14, textAlign: "center", marginBottom: 12 },
});


// import { useState } from "react";
// import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
// import { useTranslation } from "react-i18next";
// import { useNavigation } from "@react-navigation/native";
// import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
// import { colors } from "../../theme";
// import { TextField } from "../../components/TextField";
// import { PhoneField } from "../../components/PhoneField";
// import { PasswordField } from "../../components/PasswordField";
// import { Button } from "../../components/Button";
// import { normalizePhone } from "../../utils/phone";
// import { validateRegister } from "../../utils/validate";
// import { authApi } from "../../api/auth";
// import { ApiError } from "../../api/client";
// import type { AuthStackParamList } from "../../navigation/AuthStack";
// import { useLanguage } from "../../store/useLanguage";

// export default function RegisterScreen() {
//   const { t } = useTranslation();
// //   const { t, i18n } = useTranslation();
//   const nav = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
//   const [fullName, setFullName] = useState("");
//   const [phone, setPhone] = useState("");
//   const [password, setPassword] = useState("");
// //   const [language, setLanguage] = useState<"so" | "en">((i18n.language as "so" | "en") ?? "so");
//   const { language, setLanguage } = useLanguage();
//   const [error, setError] = useState("");
//   const [loading, setLoading] = useState(false);

//   const submit = async () => {
//     const phoneNumber = normalizePhone(phone);
//     const v = validateRegister(fullName, phoneNumber, password);
//     if (v) { setError(t(v)); return; }
//     setError("");
//     setLoading(true);
//     try {
//       await authApi.register({ fullName: fullName.trim(), phoneNumber, password, language });
//       nav.navigate("Otp", { phoneNumber });
//     } catch (e) {
//       setError(e instanceof ApiError ? e.message : String(e));
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
//       <ScrollView contentContainerStyle={styles.c} keyboardShouldPersistTaps="handled">
//         <Text style={styles.title}>{t("auth.registerTitle")}</Text>
//         <TextField label={t("auth.fullName")} value={fullName} onChangeText={setFullName} autoCapitalize="words" />
//         <PhoneField label={t("auth.phone")} value={phone} onChangeText={setPhone} placeholder={t("auth.numberHint")} />
//         <PasswordField label={t("auth.password")} value={password} onChangeText={setPassword} />
//         <Text style={styles.label}>{t("auth.language")}</Text>
//         <View style={styles.segment}>
//           {(["so", "en"] as const).map((lng) => (
//             <TouchableOpacity key={lng} style={[styles.segBtn, language === lng && styles.segActive]} onPress={() => setLanguage(lng)}>
//               <Text style={[styles.segText, language === lng && styles.segTextActive]}>{lng === "so" ? "Soomaali" : "English"}</Text>
//             </TouchableOpacity>
//           ))}
//         </View>
//         {error ? <Text style={styles.error}>{error}</Text> : null}
//         <Button title={t("auth.registerBtn")} onPress={submit} loading={loading} />

//         {/* have an account? Log in */}
//         <View style={{ height: 8 }} />
//         <Button title={t("auth.haveAccount")} onPress={() => nav.navigate("Login")} variant="ghost" />
//       </ScrollView>
//     </KeyboardAvoidingView>
//   );
// }
// const styles = StyleSheet.create({
//   c: { flexGrow: 1, justifyContent: "center", padding: 24 },
//   title: { fontSize: 24, fontWeight: "700", color: colors.text, textAlign: "center", marginBottom: 24 },
//   label: { fontSize: 13, color: colors.textSecondary, marginBottom: 6 },
//   segment: { flexDirection: "row", backgroundColor: colors.border, borderRadius: 12, padding: 4, marginBottom: 16 },
//   segBtn: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: "center" },
//   segActive: { backgroundColor: colors.surface },
//   segText: { fontSize: 15, color: colors.textSecondary, fontWeight: "600" },
//   segTextActive: { color: colors.primaryDark },
//   error: { color: colors.error, fontSize: 14, textAlign: "center", marginBottom: 12 },
// });


