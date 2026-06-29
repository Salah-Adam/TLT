import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from "react-native";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { colors } from "../../theme";
import { TextField } from "../../components/TextField";
import { Button } from "../../components/Button";
import { validateOtp } from "../../utils/validate";
import { authApi, finishAuth } from "../../api/auth";
import { ApiError } from "../../api/client";
import type { AuthStackParamList } from "../../navigation/AuthStack";

type Props = NativeStackScreenProps<AuthStackParamList, "Otp">;

export default function OtpScreen({ route }: Props) {
  const { t } = useTranslation();
  const { phoneNumber, purpose = "register" } = route.params;
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const v = validateOtp(otp);
    if (v) { setError(t(v)); return; }
    setError("");
    setLoading(true);
    try {
      const tokens = purpose === "reclaim"
        ? await authApi.reclaimVerify(phoneNumber, otp)
        : await authApi.verifyOtp(phoneNumber, otp);
      await finishAuth(tokens);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("auth.genericError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={styles.c} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{t("auth.otpTitle")}</Text>
        <Text style={styles.sub}>{t("auth.otpSent")} {phoneNumber}</Text>
        <TextField label={t("auth.otp")} value={otp} onChangeText={(v) => setOtp(v.replace(/[^0-9]/g, ""))} keyboardType="number-pad" maxLength={6} style={{ textAlign: "center", fontSize: 24, letterSpacing: 8 }} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button title={t("auth.verifyBtn")} onPress={submit} loading={loading} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  c: { flexGrow: 1, justifyContent: "center", padding: 24 },
  title: { fontSize: 24, fontWeight: "700", color: colors.text, textAlign: "center", marginBottom: 8 },
  sub: { fontSize: 14, color: colors.textSecondary, textAlign: "center", marginBottom: 28 },
  error: { color: colors.error, fontSize: 14, textAlign: "center", marginBottom: 12 },
});


// import { useState } from "react";
// import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from "react-native";
// import { useTranslation } from "react-i18next";
// import type { NativeStackScreenProps } from "@react-navigation/native-stack";
// import { colors } from "../../theme";
// import { TextField } from "../../components/TextField";
// import { Button } from "../../components/Button";
// import { validateOtp } from "../../utils/validate";
// import { authApi, finishAuth } from "../../api/auth";
// import { ApiError } from "../../api/client";
// import type { AuthStackParamList } from "../../navigation/AuthStack";

// type Props = NativeStackScreenProps<AuthStackParamList, "Otp">;

// export default function OtpScreen({ route }: Props) {
//   const { t } = useTranslation();
//   const { phoneNumber } = route.params;
//   const [otp, setOtp] = useState("");
//   const [error, setError] = useState("");
//   const [loading, setLoading] = useState(false);

//   const submit = async () => {
//     const v = validateOtp(otp);
//     if (v) { setError(t(v)); return; }
//     setError("");
//     setLoading(true);
//     try {
//       const tokens = await authApi.verifyOtp(phoneNumber, otp);
//       await finishAuth(tokens);
//     } catch (e) {
//       setError(e instanceof ApiError ? e.message : String(e));
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
//       <ScrollView contentContainerStyle={styles.c} keyboardShouldPersistTaps="handled">
//         <Text style={styles.title}>{t("auth.otpTitle")}</Text>
//         <Text style={styles.sub}>{t("auth.otpSent")} {phoneNumber}</Text>
//         <TextField
//           label={t("auth.otp")}
//           value={otp}
//           onChangeText={(v) => setOtp(v.replace(/[^0-9]/g, ""))}
//           keyboardType="number-pad"
//           maxLength={6}
//           style={{ textAlign: "center", fontSize: 24, letterSpacing: 8 }}
//         />
//         {error ? <Text style={styles.error}>{error}</Text> : null}
//         <Button title={t("auth.verifyBtn")} onPress={submit} loading={loading} />
//       </ScrollView>
//     </KeyboardAvoidingView>
//   );
// }
// const styles = StyleSheet.create({
//   c: { flexGrow: 1, justifyContent: "center", padding: 24 },
//   title: { fontSize: 24, fontWeight: "700", color: colors.text, textAlign: "center", marginBottom: 8 },
//   sub: { fontSize: 14, color: colors.textSecondary, textAlign: "center", marginBottom: 28 },
//   error: { color: colors.error, fontSize: 14, textAlign: "center", marginBottom: 12 },
// });


