// View + edit the account profile. Sends only changed fields; phone + member-since are read-only.
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { colors } from "../theme";
import { TextField } from "../components/TextField";
import { Button } from "../components/Button";
import { ApiError } from "../api/client";
import { getProfile, updateProfile, type Profile, type ProfilePatch } from "../data/profile";

const localNum = (n?: string | null) => (n ?? "").replace(/^252/, "");
type Sex = "male" | "female" | null;

export default function ProfileScreen() {
  const { t } = useTranslation();
  const nav = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [orig, setOrig] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [age, setAge] = useState("");
  const [city, setCity] = useState("");
  const [sex, setSex] = useState<Sex>(null);
  const [emailErr, setEmailErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const p = await getProfile();
        setOrig(p);
        setFullName(p.full_name ?? ""); setEmail(p.email ?? "");
        setAge(p.age != null ? String(p.age) : ""); setCity(p.city ?? ""); setSex(p.sex ?? null);
      } catch (e: any) { Alert.alert(t("auth.errorTitle"), e?.message ?? ""); }
      setLoading(false);
    })();
  }, []);

  const onSave = async () => {
    setEmailErr("");
    if (fullName.trim().length < 2) { Alert.alert(t("settings.nameShort")); return; }
    const ageNum = age.trim() ? parseInt(age, 10) : null;
    if (age.trim() && (isNaN(ageNum!) || ageNum! < 10 || ageNum! > 100)) { Alert.alert(t("settings.ageBad")); return; }

    const patch: ProfilePatch = {};
    if (orig) {
      if (fullName.trim() !== orig.full_name) patch.full_name = fullName.trim();
      const e = email.trim() || null; if (e !== orig.email) patch.email = e;
      if (ageNum !== orig.age) patch.age = ageNum;
      const c = city.trim() || null; if (c !== orig.city) patch.city = c;
      if (sex !== orig.sex) patch.sex = sex;
    }
    if (Object.keys(patch).length === 0) { nav.goBack(); return; }

    setSaving(true);
    try { await updateProfile(patch); nav.goBack(); }
    catch (e: any) {
      if (e instanceof ApiError && e.code === "EMAIL_TAKEN") setEmailErr(t("settings.emailTaken"));
      else Alert.alert(t("auth.errorTitle"), e?.message ?? "");
    }
    setSaving(false);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  const joined = orig?.created_at ? new Date(orig.created_at).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" }) : "—";

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
        <TextField label={t("settings.fullName")} value={fullName} onChangeText={setFullName} placeholder={t("settings.fullName")} />
        <TextField label={t("settings.email")} value={email} onChangeText={setEmail} placeholder={t("settings.emailOptional")} autoCapitalize="none" keyboardType="email-address" />
        {emailErr ? <Text style={styles.err}>{emailErr}</Text> : null}
        <TextField label={t("settings.age")} value={age} onChangeText={(v) => setAge(v.replace(/[^0-9]/g, ""))} keyboardType="number-pad" placeholder="—" />
        <TextField label={t("settings.city")} value={city} onChangeText={setCity} placeholder={t("settings.cityOptional")} />

        <Text style={styles.fieldLabel}>{t("settings.sex")}</Text>
        <View style={styles.segment}>
          {([["male", t("settings.male")], ["female", t("settings.female")], [null, t("settings.sexNone")]] as [Sex, string][]).map(([val, lbl], i) => (
            <TouchableOpacity key={String(val)} onPress={() => setSex(val)} style={[styles.seg, i > 0 && styles.segDivider, sex === val && styles.segActive]}>
              <Text style={[styles.segTxt, sex === val && styles.segTxtActive]}>{lbl}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.infoRow} onPress={() => nav.navigate("PhoneNumbers")}>
          <Text style={styles.infoLabel}>{t("settings.phone")}</Text>
          <Text style={[styles.infoVal, { color: colors.primary }]}>+252 {localNum(orig?.phone_number)} ›</Text>
        </TouchableOpacity>

        <View style={{ marginTop: 20 }}><Button title={t("settings.save")} onPress={onSave} loading={saving} /></View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
  fieldLabel: { fontSize: 13, color: colors.textSecondary, marginBottom: 6 },
  segment: { flexDirection: "row", height: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.border, overflow: "hidden", backgroundColor: colors.surface, marginBottom: 16 },
  seg: { flex: 1, alignItems: "center", justifyContent: "center" },
  segDivider: { borderLeftWidth: 1, borderLeftColor: colors.border },
  segActive: { backgroundColor: colors.primary },
  segTxt: { fontSize: 14, color: colors.textSecondary },
  segTxtActive: { color: "#fff", fontWeight: "600" },
  info: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, marginTop: 4 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  infoLabel: { fontSize: 13, color: colors.textSecondary },
  infoVal: { fontSize: 14, color: colors.text, fontWeight: "500" },
  err: { color: colors.error, fontSize: 13, marginTop: -8, marginBottom: 10 },
});