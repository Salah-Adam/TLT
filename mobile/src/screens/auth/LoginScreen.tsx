//  the login form; it normalizes the phone, calls login, runs finishAuth, and the gate then flips to the app automatically. 
// KeyboardAvoidingView keeps the inputs visible when the keyboard opens.


import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { colors } from "../../theme";
import { PhoneField } from "../../components/PhoneField";
import { PasswordField } from "../../components/PasswordField";
import { Button } from "../../components/Button";
import { normalizePhone } from "../../utils/phone";
// import { validateLogin } from "../../utils/validate";
import { authApi, finishAuth } from "../../api/auth";
import { ApiError } from "../../api/client";
import type { AuthStackParamList } from "../../navigation/AuthStack";


export default function LoginScreen() {
  const { t } = useTranslation();
  const nav = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError("");
    setLoading(true);
    try {
      const tokens = await authApi.login(normalizePhone(phone), password);
      await finishAuth(tokens);
    } catch (e) {
      setError(e instanceof ApiError ? t("auth.invalidCredentials") : t("auth.genericError"));
    } finally {
      setLoading(false);
    }
  };
  // const submit = async () => {
  //   const phoneNumber = normalizePhone(phone);
  //   const v = validateLogin(phoneNumber, password);
  //   if (v) { setError(t(v)); return; }
  //   setError("");
  //   setLoading(true);
  //   try {
  //     const tokens = await authApi.login(phoneNumber, password);
  //     await finishAuth(tokens);
  //   } catch (e) {
  //     setError(e instanceof ApiError ? e.message : String(e));
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={styles.c} keyboardShouldPersistTaps="handled">
        <Text style={styles.logo}>TLT</Text>
        <Text style={styles.title}>{t("auth.loginTitle")}</Text>
        <PhoneField label={t("auth.phone")} value={phone} onChangeText={setPhone} placeholder={t("auth.numberHint")} />
        <PasswordField label={t("auth.password")} value={password} onChangeText={setPassword} />

        <TouchableOpacity onPress={() => nav.navigate("Forgot")} style={{ alignSelf: "flex-end", marginBottom: 12 }}>
          <Text style={{ color: colors.primary, fontSize: 14 }}>{t("auth.forgotLink")}</Text>
        </TouchableOpacity>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button title={t("auth.loginBtn")} onPress={submit} loading={loading} />
        <View style={{ height: 8 }} />
        <Button title={t("auth.createAccount")} onPress={() => nav.navigate("Register")} variant="ghost" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  c: { flexGrow: 1, justifyContent: "center", padding: 24 },
  logo: { fontSize: 44, fontWeight: "700", color: colors.primaryDark, textAlign: "center", marginBottom: 8 },
  title: { fontSize: 18, color: colors.textSecondary, textAlign: "center", marginBottom: 28 },
  error: { color: colors.error, fontSize: 14, textAlign: "center", marginBottom: 12 },
});


// ------------------------------------

// import { useState } from "react";
// import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
// import { useTranslation } from "react-i18next";
// import { useNavigation } from "@react-navigation/native";
// import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
// import { colors } from "../../theme";
// import { PhoneField } from "../../components/PhoneField";
// import { PasswordField } from "../../components/PasswordField";
// import { Button } from "../../components/Button";
// import { normalizePhone } from "../../utils/phone";
// import { authApi, finishAuth } from "../../api/auth";
// import { ApiError } from "../../api/client";
// import type { AuthStackParamList } from "../../navigation/AuthStack";

// export default function LoginScreen() {
//   const { t } = useTranslation();
//   const nav = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
//   const [phone, setPhone] = useState("");
//   const [password, setPassword] = useState("");
//   const [loading, setLoading] = useState(false);

//   const submit = async () => {
//     setLoading(true);
//     try {
//       const tokens = await authApi.login(normalizePhone(phone), password);
//       await finishAuth(tokens);
//     } catch (e) {
//       Alert.alert(t("auth.errorTitle"), e instanceof ApiError ? e.message : String(e));
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
//       <ScrollView contentContainerStyle={styles.c} keyboardShouldPersistTaps="handled">
//         <Text style={styles.logo}>TLT</Text>
//         <Text style={styles.title}>{t("auth.loginTitle")}</Text>
//         <PhoneField label={t("auth.phone")} value={phone} onChangeText={setPhone} placeholder={t("auth.numberHint")} />
//         <PasswordField label={t("auth.password")} value={password} onChangeText={setPassword} />
//         <Button title={t("auth.loginBtn")} onPress={submit} loading={loading} disabled={!phone || !password} />
//         <View style={{ height: 8 }} />
//         <Button title={t("auth.createAccount")} onPress={() => nav.navigate("Register")} variant="ghost" />
//       </ScrollView>
//     </KeyboardAvoidingView>
//   );
// }
// const styles = StyleSheet.create({
//   c: { flexGrow: 1, justifyContent: "center", padding: 24 },
//   logo: { fontSize: 44, fontWeight: "700", color: colors.primaryDark, textAlign: "center", marginBottom: 8 },
//   title: { fontSize: 18, color: colors.textSecondary, textAlign: "center", marginBottom: 28 },
// });
