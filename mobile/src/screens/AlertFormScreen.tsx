// Create or edit a spending alert. Create = category + limit + period + warn-% + optional SIM (POST).
// Edit = limit + warn-% only (PATCH); category/period/SIM are locked (delete & re-create to change them),
// plus a delete button. Online-only.
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { colors } from "../theme";
import { useNetwork } from "../store/useNetwork";
import { TextField } from "../components/TextField";
import { Button } from "../components/Button";
import { readCategories, type Category } from "../data/categories";
import { readSims, simLabel, type Sim } from "../data/phoneNumbers";
import { createAlert, updateAlert, deleteAlert, type SpendingAlert } from "../data/spendingAlerts";

type Period = "weekly" | "monthly";

export default function AlertFormScreen() {
  const { t } = useTranslation();
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const editing: SpendingAlert | undefined = route.params?.alert;
  const isEdit = !!editing;

  const [cats, setCats] = useState<Category[]>([]);
  const [sims, setSims] = useState<Sim[]>([]);
  const [catId, setCatId] = useState<string | null>(editing?.category.id ?? null);
  const [simId, setSimId] = useState<string | null>(editing?.phone_number_id ?? null);
  const [period, setPeriod] = useState<Period>(editing?.period ?? "monthly");
  const [limit, setLimit] = useState<string>(editing ? String(editing.limit_amount) : "");
  const [threshold, setThreshold] = useState<string>(editing ? String(editing.alert_threshold) : "80");

  const [catModal, setCatModal] = useState(false);
  const [simModal, setSimModal] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { readCategories().then(setCats); readSims().then(setSims); }, []);

  const catName = useMemo(() => editing?.category.name ?? cats.find((c) => c.id === catId)?.name ?? t("alerts.pickCategory"), [editing, cats, catId, t]);
  const simName = useMemo(() => {
    if (isEdit) return editing?.phone_number ? editing.phone_number.replace(/^252/, "") : t("alerts.allSims");
    if (!simId) return t("alerts.allSims");
    const s = sims.find((x) => x.id === simId); return s ? simLabel(s) : t("alerts.allSims");
  }, [isEdit, editing, simId, sims, t]);

  const requireOnline = () => { if (!useNetwork.getState().online) { Alert.alert(t("alerts.offlineAction")); return false; } return true; };

  const onSave = async () => {
    if (!requireOnline()) return;
    const lim = parseFloat(limit); const thr = parseInt(threshold, 10);
    if (!(lim > 0)) { Alert.alert(t("alerts.needLimit")); return; }
    if (!(thr >= 1 && thr <= 100)) { Alert.alert(t("alerts.badThreshold")); return; }

    setSaving(true);
    try {
      if (isEdit) {
        await updateAlert(editing!.id, { limitAmount: lim, alertThreshold: thr });
      } else {
        if (!catId) { Alert.alert(t("alerts.needCategory")); setSaving(false); return; }
        await createAlert({ categoryId: catId, limitAmount: lim, period, alertThreshold: thr, phoneNumberId: simId });
      }
      nav.goBack();
    } catch (e: any) {
      Alert.alert(t("auth.errorTitle"), e?.code === "ALERT_ALREADY_EXISTS" ? t("alerts.duplicate") : (e?.message ?? ""));
      setSaving(false);
    }
  };

  const onDelete = () => {
    if (!requireOnline()) return;
    Alert.alert(t("alerts.deleteTitle"), t("alerts.deleteBody"), [
      { text: t("alerts.cancel"), style: "cancel" },
      { text: t("alerts.delete"), style: "destructive", onPress: async () => {
        try { await deleteAlert(editing!.id); nav.goBack(); }
        catch (e: any) { Alert.alert(t("auth.errorTitle"), e?.message ?? ""); }
      } },
    ]);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 28 }} keyboardShouldPersistTaps="handled">
        {/* category */}
        <Text style={styles.fieldLabel}>{t("alerts.category")}</Text>
        <TouchableOpacity style={[styles.select, isEdit && styles.locked]} disabled={isEdit} onPress={() => setCatModal(true)}>
          <Text style={[styles.selectTxt, !catId && !isEdit && { color: colors.textSecondary }]}>{catName}</Text>
          {!isEdit ? <Ionicons name="chevron-down" size={18} color={colors.textSecondary} /> : <Ionicons name="lock-closed" size={15} color={colors.textSecondary} />}
        </TouchableOpacity>

        {/* period */}
        <Text style={styles.fieldLabel}>{t("alerts.period")}</Text>
        <View style={styles.segment}>
          {(["weekly", "monthly"] as Period[]).map((p, i) => (
            <TouchableOpacity key={p} disabled={isEdit} onPress={() => setPeriod(p)}
              style={[styles.seg, i > 0 && styles.segDivider, period === p && styles.segActive, isEdit && period !== p && { opacity: 0.4 }]}>
              <Text style={[styles.segTxt, period === p && styles.segTxtActive]}>{t(`alerts.${p}`)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* limit + threshold */}
        <View style={{ marginTop: 16 }}>
          <TextField label={t("alerts.limit")} value={limit} onChangeText={(v) => setLimit(v.replace(/[^0-9.]/g, ""))} keyboardType="decimal-pad" placeholder="0" />
        </View>
        <TextField label={t("alerts.threshold")} value={threshold} onChangeText={(v) => setThreshold(v.replace(/[^0-9]/g, ""))} keyboardType="number-pad" placeholder="80" />

        {/* SIM */}
        <Text style={styles.fieldLabel}>{t("alerts.sim")}</Text>
        <TouchableOpacity style={[styles.select, isEdit && styles.locked]} disabled={isEdit} onPress={() => setSimModal(true)}>
          <Text style={styles.selectTxt}>{simName}</Text>
          {!isEdit ? <Ionicons name="chevron-down" size={18} color={colors.textSecondary} /> : <Ionicons name="lock-closed" size={15} color={colors.textSecondary} />}
        </TouchableOpacity>

        {isEdit ? <Text style={styles.lockedHint}>{t("alerts.lockedHint")}</Text> : null}

        <View style={{ marginTop: 22 }}>
          <Button title={isEdit ? t("alerts.save") : t("alerts.create")} onPress={onSave} loading={saving} />
        </View>

        {isEdit ? (
          <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
            <Ionicons name="trash-outline" size={18} color={colors.error} />
            <Text style={styles.deleteTxt}>{t("alerts.delete")}</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>

      {/* category picker */}
      <Modal transparent visible={catModal} animationType="slide" onRequestClose={() => setCatModal(false)}>
        <Pressable style={styles.backdrop} onPress={() => setCatModal(false)}>
          <Pressable style={styles.sheet}>
            <Text style={styles.sheetTitle}>{t("alerts.pickCategory")}</Text>
            <ScrollView>
              {cats.map((c) => (
                <TouchableOpacity key={c.id} style={styles.row} onPress={() => { setCatId(c.id); setCatModal(false); }}>
                  <Text style={styles.rowTxt}>{c.name}</Text>
                  {catId === c.id ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* SIM picker */}
      <Modal transparent visible={simModal} animationType="slide" onRequestClose={() => setSimModal(false)}>
        <Pressable style={styles.backdrop} onPress={() => setSimModal(false)}>
          <Pressable style={styles.sheet}>
            <Text style={styles.sheetTitle}>{t("alerts.sim")}</Text>
            <TouchableOpacity style={styles.row} onPress={() => { setSimId(null); setSimModal(false); }}>
              <Text style={styles.rowTxt}>{t("alerts.allSims")}</Text>
              {!simId ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
            </TouchableOpacity>
            {sims.map((s) => (
              <TouchableOpacity key={s.id} style={styles.row} onPress={() => { setSimId(s.id); setSimModal(false); }}>
                <Text style={styles.rowTxt}>{simLabel(s)}</Text>
                {simId === s.id ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fieldLabel: { fontSize: 13, color: colors.textSecondary, marginBottom: 6, marginTop: 6 },
  select: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, marginBottom: 8 },
  locked: { backgroundColor: "#F8FAFC" },
  selectTxt: { fontSize: 16, color: colors.text },
  segment: { flexDirection: "row", height: 40, borderRadius: 12, borderWidth: 1, borderColor: colors.border, overflow: "hidden", backgroundColor: colors.surface },
  seg: { flex: 1, alignItems: "center", justifyContent: "center" },
  segDivider: { borderLeftWidth: 1, borderLeftColor: colors.border },
  segActive: { backgroundColor: colors.primary },
  segTxt: { fontSize: 14, color: colors.textSecondary },
  segTxtActive: { color: "#fff", fontWeight: "600" },
  lockedHint: { fontSize: 12, color: colors.textSecondary, marginTop: 12, lineHeight: 17 },
  deleteBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 16 },
  deleteTxt: { color: colors.error, fontSize: 14, fontWeight: "600" },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 18, paddingBottom: 28, maxHeight: "70%" },
  sheetTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  rowTxt: { fontSize: 15, color: colors.text },
});