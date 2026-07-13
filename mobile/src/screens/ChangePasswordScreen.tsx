// Change password — three PasswordFields (eye toggle), same inline-error style as Login.
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { colors } from "../theme";
import { PasswordField } from "../components/PasswordField";
import { Button } from "../components/Button";
import { ApiError } from "../api/client";
import { changePassword } from "../data/profile";

export default function ChangePasswordScreen() {
  const { t } = useTranslation();
  const nav = useNavigation<any>();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const onSave = async () => {
    setError("");
    if (next.length < 4) { setError(t("settings.pwShort")); return; }
    if (next !== confirm) { setError(t("settings.pwMismatch")); return; }
    if (next === current) { setError(t("settings.pwSame")); return; }
    setSaving(true);
    try {
      await changePassword(current, next);
      Alert.alert(t("settings.pwChangedTitle"), t("settings.pwChangedBody"), [{ text: "OK", onPress: () => nav.goBack() }]);
    } catch (e: any) {
      if (e instanceof ApiError && e.code === "CURRENT_PASSWORD_WRONG") setError(t("settings.pwWrong"));
      else if (e instanceof ApiError && e.code === "PASSWORD_UNCHANGED") setError(t("settings.pwSame"));
      else setError(e?.message ?? t("auth.genericError"));
    }
    setSaving(false);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
        <PasswordField label={t("settings.currentPassword")} value={current} onChangeText={setCurrent} />
        <PasswordField label={t("settings.newPassword")} value={next} onChangeText={setNext} />
        <PasswordField label={t("settings.confirmPassword")} value={confirm} onChangeText={setConfirm} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={{ marginTop: 8 }}><Button title={t("settings.save")} onPress={onSave} loading={saving} /></View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  error: { color: colors.error, fontSize: 14, textAlign: "center", marginBottom: 12 },
});