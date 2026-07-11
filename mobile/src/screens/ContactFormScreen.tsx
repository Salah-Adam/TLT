// Add / edit a tracked contact. Create = label + direction + one or more numbers (POST).
// Edit = label + direction only (PATCH); numbers are managed in the detail screen. Online-only.
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { colors } from "../theme";
import { useNetwork } from "../store/useNetwork";
import { TextField } from "../components/TextField";
import { PhoneField } from "../components/PhoneField";
import { Button } from "../components/Button";
import { normalizePhone } from "../utils/phone";
import { readContact, createContact, updateContact } from "../data/trackedContacts";

type Dir = "both" | "sent" | "received";
const isTrackable = (norm: string) => /^252\d{6,12}$/.test(norm);

export default function ContactFormScreen() {
  const { t } = useTranslation();
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const editId: string | undefined = route.params?.id;
  const isEdit = !!editId;

  const [label, setLabel] = useState("");
  const [direction, setDirection] = useState<Dir>("both");
  const [numbers, setNumbers] = useState<string[]>([""]); // create-only, local parts
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      const c = await readContact(editId!);
      if (c) { setLabel(c.label); setDirection(c.tracking_direction); }
      setLoading(false);
    })();
  }, [isEdit, editId]);

  const setNumberAt = (i: number, v: string) => setNumbers((p) => p.map((x, idx) => (idx === i ? v : x)));
  const addNumberField = () => setNumbers((p) => [...p, ""]);
  const removeNumberField = (i: number) => setNumbers((p) => (p.length === 1 ? p : p.filter((_, idx) => idx !== i)));

  const onSave = async () => {
    if (!useNetwork.getState().online) { Alert.alert(t("contacts.offlineAction")); return; }
    if (label.trim().length < 1) { Alert.alert(t("contacts.needLabel")); return; }
    setSaving(true);
    try {
      if (isEdit) {
        await updateContact(editId!, { label: label.trim(), trackingDirection: direction });
      } else {
        const norm = numbers.map((n) => normalizePhone(n)).filter((n) => n.length > 3);
        const uniq = Array.from(new Set(norm));
        if (uniq.length === 0) { Alert.alert(t("contacts.needNumber")); setSaving(false); return; }
        if (!uniq.every(isTrackable)) { Alert.alert(t("contacts.invalidNumber")); setSaving(false); return; }
        await createContact({ label: label.trim(), trackingDirection: direction, phoneNumbers: uniq });
      }
      nav.goBack();
    } catch (e: any) {
      Alert.alert(t("auth.errorTitle"), e?.message ?? "");
      setSaving(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 28 }} keyboardShouldPersistTaps="handled">
        <TextField label={t("contacts.label")} value={label} onChangeText={setLabel} placeholder={t("contacts.labelPlaceholder")} />

        <Text style={styles.fieldLabel}>{t("contacts.direction")}</Text>
        <View style={styles.segment}>
          {(["both", "sent", "received"] as Dir[]).map((d, i) => (
            <TouchableOpacity key={d} onPress={() => setDirection(d)} style={[styles.seg, i > 0 && styles.segDivider, direction === d && styles.segActive]}>
              <Text style={[styles.segTxt, direction === d && styles.segTxtActive]}>{t(`contacts.dir_${d}`)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {!isEdit ? (
          <View style={{ marginTop: 20 }}>
            <Text style={styles.fieldLabel}>{t("contacts.numbers")}</Text>
            {numbers.map((n, i) => (
              <View key={i} style={styles.numLine}>
                <View style={{ flex: 1 }}>
                  <PhoneField value={n} onChangeText={(v) => setNumberAt(i, v)} placeholder={t("contacts.numberPlaceholder")} />
                </View>
                {numbers.length > 1 ? (
                  <TouchableOpacity onPress={() => removeNumberField(i)} hitSlop={8} style={styles.numRemove}>
                    <Ionicons name="close-circle" size={22} color={colors.textSecondary} />
                  </TouchableOpacity>
                ) : null}
              </View>
            ))}
            <TouchableOpacity onPress={addNumberField} style={styles.addMore}>
              <Ionicons name="add" size={18} color={colors.primary} />
              <Text style={styles.addMoreTxt}>{t("contacts.addNumber")}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={{ marginTop: 24 }}>
          <Button title={t("contacts.save")} onPress={onSave} loading={saving} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
  fieldLabel: { fontSize: 13, color: colors.textSecondary, marginBottom: 6 },
  segment: { flexDirection: "row", height: 40, borderRadius: 12, borderWidth: 1, borderColor: colors.border, overflow: "hidden", backgroundColor: colors.surface },
  seg: { flex: 1, alignItems: "center", justifyContent: "center" },
  segDivider: { borderLeftWidth: 1, borderLeftColor: colors.border },
  segActive: { backgroundColor: colors.primary },
  segTxt: { fontSize: 14, color: colors.textSecondary },
  segTxtActive: { color: "#fff", fontWeight: "600" },
  numLine: { flexDirection: "row", alignItems: "center" },
  numRemove: { paddingLeft: 8, paddingBottom: 16 },
  addMore: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 6 },
  addMoreTxt: { color: colors.primary, fontSize: 14, fontWeight: "600" },
});