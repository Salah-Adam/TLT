//  validates the number (12-digit rule, since this is "your own number" like register), requests the code, then moves to Reset carrying the phoneNumber.

import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from "react-native";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { colors } from "../../theme";
import { PhoneField } from "../../components/PhoneField";
import { Button } from "../../components/Button";
import { normalizePhone, isValidPhone } from "../../utils/phone";
import { authApi } from "../../api/auth";
import { ApiError } from "../../api/client";
import type { AuthStackParamList } from "../../navigation/AuthStack";

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const nav = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const phoneNumber = normalizePhone(phone);
    if (!isValidPhone(phoneNumber)) { setError(t("validation.phone")); return; }
    setError("");
    setLoading(true);
    try {
      await authApi.forgotPassword(phoneNumber);
      nav.navigate("Reset", { phoneNumber });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("auth.genericError"));
    } finally {
      setLoading(false);
    }
  };

  
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={styles.c} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{t("auth.forgotTitle")}</Text>
        <Text style={styles.sub}>{t("auth.forgotSub")}</Text>
        <PhoneField label={t("auth.phone")} value={phone} onChangeText={setPhone} placeholder={t("auth.numberHint")} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button title={t("auth.sendCodeBtn")} onPress={submit} loading={loading} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  c: { flexGrow: 1, justifyContent: "center", padding: 24 },
  title: { fontSize: 24, fontWeight: "700", color: colors.text, textAlign: "center", marginBottom: 8 },
  sub: { fontSize: 14, color: colors.textSecondary, textAlign: "center", marginBottom: 24 },
  error: { color: colors.error, fontSize: 14, textAlign: "center", marginBottom: 12 },
});