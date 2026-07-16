// Add a number — two phases. Phase 1: number (+ optional name, Individual/Business) → sends OTP.
// Phase 2: enter the code → verify. If the number belongs to another account, offer to reclaim.
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { colors } from "../theme";
import { PhoneField } from "../components/PhoneField";
import { TextField } from "../components/TextField";
import { Button } from "../components/Button";
import { ApiError } from "../api/client";
import { normalizePhone, isValidPhone } from "../utils/phone";
import { addPhoneNumber, verifyPhoneNumber, reclaimNumber, reclaimNumberVerify } from "../data/phoneNumbers";
import { ResendCode } from "../components/ResendCode";


type Cls = "individual" | "business";

export default function AddPhoneNumberScreen() {
  const { t } = useTranslation();
  const nav = useNavigation<any>();

  const [phase, setPhase] = useState<"details" | "otp">("details");
  const [mode, setMode] = useState<"add" | "reclaim">("add");
  const [phone, setPhone] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [classification, setClassification] = useState<Cls>("individual");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const normalized = normalizePhone(phone);


    // The number ended up on this account (a prior add/reclaim succeeded) → treat as done.
  const alreadyMine = (e: any) =>
    e instanceof ApiError && (e.code === "ALREADY_ADDED_NUMBER" || e.code === "ALREADY_OWN_NUMBER");

  const startReclaim = async () => {
    if (loading) return;
    setError(""); setLoading(true);
    try { await reclaimNumber(normalized); setMode("reclaim"); setPhase("otp"); }
    catch (e: any) {
      if (alreadyMine(e)) { setLoading(false); nav.goBack(); return; }
      setError(e?.message ?? t("auth.genericError"));
    }
    setLoading(false);
  };

  const sendCode = async () => {
    if (loading) return;
    setError("");
    if (!isValidPhone(normalized)) { setError(t("phones.needNumber")); return; }
    setLoading(true);
    try {
      await addPhoneNumber({ number: normalized, displayName: displayName.trim() || undefined, classification });
      setMode("add"); setPhase("otp");
    } catch (e: any) {
      if (alreadyMine(e)) { setLoading(false); nav.goBack(); return; }
      if (e instanceof ApiError && e.code === "PHONE_PREFIX_UNRECOGNISED") setError(t("phones.unsupported"));
      else if (e instanceof ApiError && e.code === "NUMBER_OWNED_BY_OTHER") {
        Alert.alert(t("phones.ownedTitle"), t("phones.ownedBody"), [
          { text: t("settings.cancel"), style: "cancel" },
          { text: t("phones.reclaim"), onPress: startReclaim },
        ]);
      } else setError(e?.message ?? t("auth.genericError"));
    }
    setLoading(false);
  };

  const verify = async () => {
    if (loading) return;
    setError("");
    if (otp.trim().length !== 6) { setError(t("phones.needCode")); return; }
    setLoading(true);
    try {
      if (mode === "reclaim") await reclaimNumberVerify(normalized, otp.trim());
      else await verifyPhoneNumber({ number: normalized, otp: otp.trim(), displayName: displayName.trim() || undefined, classification });
      setLoading(false); nav.goBack(); return;
    } catch (e: any) {
      if (alreadyMine(e)) { setLoading(false); nav.goBack(); return; }
      setError(e?.message ?? t("auth.genericError"));
    }
    setLoading(false);
  };

  // const startReclaim = async () => {
  //   setError(""); setLoading(true);
  //   try { await reclaimNumber(normalized); setMode("reclaim"); setPhase("otp"); }
  //   catch (e: any) { setError(e?.message ?? t("auth.genericError")); }
  //   setLoading(false);
  // };

  // const sendCode = async () => {
  //   setError("");
  //   if (!isValidPhone(normalized)) { setError(t("phones.needNumber")); return; }
  //   setLoading(true);
  //   try {
  //     await addPhoneNumber({ number: normalized, displayName: displayName.trim() || undefined, classification });
  //     setMode("add"); setPhase("otp");
  //   } catch (e: any) {
  //     if (e instanceof ApiError && e.code === "ALREADY_ADDED_NUMBER") setError(t("phones.alreadyAdded"));
  //     else if (e instanceof ApiError && e.code === "PHONE_PREFIX_UNRECOGNISED") setError(t("phones.unsupported"));
  //     else if (e instanceof ApiError && e.code === "NUMBER_OWNED_BY_OTHER") {
  //       Alert.alert(t("phones.ownedTitle"), t("phones.ownedBody"), [
  //         { text: t("settings.cancel"), style: "cancel" },
  //         { text: t("phones.reclaim"), onPress: startReclaim },
  //       ]);
  //     } else setError(e?.message ?? t("auth.genericError"));
  //   }
  //   setLoading(false);
  // };

  // const verify = async () => {
  //   setError("");
  //   if (otp.trim().length !== 6) { setError(t("phones.needCode")); return; }
  //   setLoading(true);
  //   try {
  //     if (mode === "reclaim") await reclaimNumberVerify(normalized, otp.trim());
  //     else await verifyPhoneNumber({ number: normalized, otp: otp.trim(), displayName: displayName.trim() || undefined, classification });
  //     nav.goBack();
  //   } catch (e: any) { setError(e?.message ?? t("auth.genericError")); }
  //   setLoading(false);
  // };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
        {phase === "details" ? (
          <>
            <PhoneField label={t("settings.phone")} value={phone} onChangeText={setPhone} placeholder={t("auth.numberHint")} />
            <TextField label={t("phones.displayName")} value={displayName} onChangeText={setDisplayName} placeholder={t("phones.displayName")} />
            <Text style={styles.fieldLabel}>{t("phones.classification")}</Text>
            <View style={styles.segment}>
              {(["individual", "business"] as Cls[]).map((c, i) => (
                <TouchableOpacity key={c} onPress={() => setClassification(c)} style={[styles.seg, i > 0 && styles.segDivider, classification === c && styles.segActive]}>
                  <Text style={[styles.segTxt, classification === c && styles.segTxtActive]}>{t(`phones.${c}`)}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <View style={{ marginTop: 12 }}><Button title={t("phones.sendCode")} onPress={sendCode} loading={loading} /></View>
          </>
        ) : (
          <>
            <Text style={styles.otpHint}>{t("phones.codeSentTo")} +252 {normalized.replace(/^252/, "")}</Text>
            <TextField label={t("phones.code")} value={otp} onChangeText={(v) => setOtp(v.replace(/[^0-9]/g, ""))} keyboardType="number-pad" maxLength={6} placeholder="••••••" />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {/* <View style={{ marginTop: 4 }}><Button title={t("phones.verify")} onPress={verify} loading={loading} /></View> */}
          
            <View style={{ marginTop: 4 }}><Button title={t("phones.verify")} onPress={verify} loading={loading} /></View>
            <ResendCode onResend={() => (mode === "reclaim"
              ? reclaimNumber(normalized)
              : addPhoneNumber({ number: normalized, displayName: displayName.trim() || undefined, classification }))} />
            <TouchableOpacity style={{ alignSelf: "center", marginTop: 16 }} onPress={() => { setPhase("details"); setOtp(""); setError(""); }}>
              <Text style={{ color: colors.primary, fontSize: 14 }}>{t("phones.changeNumber")}</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fieldLabel: { fontSize: 13, color: colors.textSecondary, marginBottom: 6 },
  segment: { flexDirection: "row", height: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.border, overflow: "hidden", backgroundColor: colors.surface, marginBottom: 16 },
  seg: { flex: 1, alignItems: "center", justifyContent: "center" },
  segDivider: { borderLeftWidth: 1, borderLeftColor: colors.border },
  segActive: { backgroundColor: colors.primary },
  segTxt: { fontSize: 14, color: colors.textSecondary },
  segTxtActive: { color: "#fff", fontWeight: "600" },
  otpHint: { fontSize: 14, color: colors.textSecondary, marginBottom: 16, textAlign: "center" },
  error: { color: colors.error, fontSize: 14, textAlign: "center", marginBottom: 12 },
});