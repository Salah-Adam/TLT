// Recover a deactivated account: enter number → OTP + new password → reactivates the account
// (restores its data) and logs in. Reachable from Welcome and from the recover push deep-link.
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { colors } from "../../theme";
import { PhoneField } from "../../components/PhoneField";
import { PasswordField } from "../../components/PasswordField";
import { TextField } from "../../components/TextField";
import { Button } from "../../components/Button";
import { normalizePhone, isValidPhone } from "../../utils/phone";
import { authApi, finishAuth } from "../../api/auth";
import { ApiError } from "../../api/client";
import type { AuthStackParamList } from "../../navigation/AuthStack";
import { ResendCode } from "../../components/ResendCode";

export default function RecoverScreen() {
  const { t } = useTranslation();
  const nav = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const route = useRoute<any>();

  const [phase, setPhase] = useState<"details" | "otp">("details");
  const [phone, setPhone] = useState<string>(route.params?.phoneNumber ?? "");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const normalized = normalizePhone(phone);

  const sendCode = async () => {
    if (loading) return;
    setError("");
    if (!isValidPhone(normalized)) { setError(t("recover.needNumber")); return; }
    setLoading(true);
    try { await authApi.recover(normalized); setPhase("otp"); }
    catch (e: any) {
      if (e instanceof ApiError && e.code === "NO_RECOVERABLE_ACCOUNT") setError(t("recover.noAccount"));
      else setError(e?.message ?? t("auth.genericError"));
    }
    setLoading(false);
  };

  const submit = async () => {
    if (loading) return;
    setError("");
    if (otp.trim().length !== 6) { setError(t("recover.needCode")); return; }
    if (password.length < 4) { setError(t("recover.pwShort")); return; }
    if (password !== confirm) { setError(t("recover.pwMismatch")); return; }
    setLoading(true);
    try {
      const tokens = await authApi.recoverVerify(normalized, otp.trim(), password);
      await finishAuth(tokens); // gate flips to the app with restored data
    } catch (e: any) {
      setError(e?.message ?? t("auth.genericError"));
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={styles.c} keyboardShouldPersistTaps="handled">
        <Text style={styles.logo}>TLT</Text>
        <Text style={styles.title}>{t("recover.title")}</Text>
        {phase === "details" ? (
          <>
            <Text style={styles.sub}>{t("recover.subtitle")}</Text>
            <PhoneField label={t("recover.number")} value={phone} onChangeText={setPhone} placeholder={t("auth.numberHint")} />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button title={t("recover.sendCode")} onPress={sendCode} loading={loading} />
          </>
        ) : (
          <>
            <Text style={styles.sub}>{t("recover.codeSentTo")} +252 {normalized.replace(/^252/, "")}</Text>
            <TextField label={t("recover.code")} value={otp} onChangeText={(v) => setOtp(v.replace(/[^0-9]/g, ""))} keyboardType="number-pad" maxLength={6} placeholder="••••••" />
            <PasswordField label={t("recover.newPassword")} value={password} onChangeText={setPassword} />
            <PasswordField label={t("recover.confirmPassword")} value={confirm} onChangeText={setConfirm} />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {/* <Button title={t("recover.recoverBtn")} onPress={submit} loading={loading} /> */}

            <Button title={t("recover.recoverBtn")} onPress={submit} loading={loading} />
            <ResendCode onResend={() => authApi.recover(normalized)} />
            <TouchableOpacity style={{ alignSelf: "center", marginTop: 16 }} onPress={() => { setPhase("details"); setOtp(""); setError(""); }}>
              <Text style={{ color: colors.primary, fontSize: 14 }}>{t("recover.changeNumber")}</Text>
            </TouchableOpacity>
          </>
        )}
        <TouchableOpacity style={{ alignSelf: "center", marginTop: 20 }} onPress={() => nav.navigate("Welcome")}>
          <Text style={{ color: colors.textSecondary, fontSize: 14 }}>{t("settings.cancel")}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  c: { flexGrow: 1, justifyContent: "center", padding: 24 },
  logo: { fontSize: 44, fontWeight: "700", color: colors.primaryDark, textAlign: "center", marginBottom: 8 },
  title: { fontSize: 18, color: colors.text, textAlign: "center", marginBottom: 8, fontWeight: "600" },
  sub: { fontSize: 14, color: colors.textSecondary, textAlign: "center", marginBottom: 20 },
  error: { color: colors.error, fontSize: 14, textAlign: "center", marginBottom: 12 },
});