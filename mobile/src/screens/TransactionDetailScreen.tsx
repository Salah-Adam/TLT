// Full transaction detail: categorize (picker), edit note, delete (soft). Writes are online-only.
import { useEffect, useState } from "react";
import {
  ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { colors } from "../theme";
import { useNetwork } from "../store/useNetwork";
import {
  getTransactionDetail, setTransactionCategory, setTransactionNote, deleteTransactionTx, type Tx,
} from "../data/transactions";
import { readCategories, type Category } from "../data/categories";

const money = (n: number | null) => "$" + (n ?? 0).toLocaleString("en-US", { maximumFractionDigits: 2 });

export default function TransactionDetailScreen() {
  const { t } = useTranslation();
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const id: string = route.params?.id;
  const online = useNetwork((s) => s.online);

  const [tx, setTx] = useState<Tx | null>(null);
  const [loading, setLoading] = useState(true);
  const [cats, setCats] = useState<Category[]>([]);
  const [catModal, setCatModal] = useState(false);
  const [noteModal, setNoteModal] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try { setTx(await getTransactionDetail(id, useNetwork.getState().online)); } catch {}
      setLoading(false);
    })();
    readCategories().then(setCats);
  }, [id]);

  const requireOnline = () => { if (!online) { Alert.alert(t("tx.offlineAction")); return false; } return true; };

  const pickCategory = async (categoryId: string | null) => {
    setCatModal(false);
    if (!requireOnline()) return;
    try { setTx(await setTransactionCategory(id, categoryId)); }
    catch (e: any) { Alert.alert(t("auth.errorTitle"), e?.message ?? ""); }
  };

  const openNote = () => { if (!requireOnline()) return; setNoteDraft(tx?.note ?? ""); setNoteModal(true); };
  const saveNote = async () => {
    setSaving(true);
    try { setTx(await setTransactionNote(id, noteDraft.trim() || null)); setNoteModal(false); }
    catch (e: any) { Alert.alert(t("auth.errorTitle"), e?.message ?? ""); }
    setSaving(false);
  };

  const onDelete = () => {
    if (!requireOnline()) return;
    Alert.alert(t("tx.deleteConfirmTitle"), t("tx.deleteConfirmBody"), [
      { text: t("tx.cancel"), style: "cancel" },
      { text: t("tx.delete"), style: "destructive", onPress: async () => {
        try { await deleteTransactionTx(id); nav.goBack(); }
        catch (e: any) { Alert.alert(t("auth.errorTitle"), e?.message ?? ""); }
      } },
    ]);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  if (!tx) return <View style={styles.center}><Text style={styles.muted}>{t("tx.empty")}</Text></View>;

  const isIn = tx.direction === "in";
  const cpName = tx.counterparty_available ? (tx.counterparty_name || tx.counterparty_number || "—") : t("tx.notAvailable");

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ paddingBottom: 28 }}>
      {/* hero */}
      <View style={styles.hero}>
        <View style={[styles.bigIcon, { backgroundColor: isIn ? "#DCFCE7" : "#FEE2E2" }]}>
          <Ionicons name={isIn ? "arrow-down" : "arrow-up"} size={26} color={isIn ? "#16A34A" : "#DC2626"} />
        </View>
        <Text style={[styles.bigAmt, { color: isIn ? colors.moneyIn : colors.moneyOut }]}>{isIn ? "+" : "−"}{money(tx.amount)} {tx.currency}</Text>
        <Text style={styles.heroSub}>{isIn ? t("tx.received") : t("tx.spent")}</Text>
      </View>

      <View style={styles.card}>
        <Field label={t("tx.counterparty")} value={cpName} />
        {tx.counterparty_available && tx.counterparty_name && tx.counterparty_number
          ? <Field label="" value={tx.counterparty_number} /> : null}

        {/* category (tappable) */}
        <TouchableOpacity style={styles.fieldRow} onPress={() => setCatModal(true)} activeOpacity={0.7}>
          <Text style={styles.fieldLabel}>{t("tx.category")}</Text>
          <View style={styles.fieldRight}>
            <Text style={styles.fieldValue}>{tx.category?.name ?? t("tx.uncategorized")}</Text>
            {tx.is_auto_categorized ? <Text style={styles.tag}>{t("tx.autoTag")}</Text> : null}
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} style={{ marginLeft: 4 }} />
          </View>
        </TouchableOpacity>

        {/* note (tappable) */}
        <TouchableOpacity style={styles.fieldRow} onPress={openNote} activeOpacity={0.7}>
          <Text style={styles.fieldLabel}>{t("tx.note")}</Text>
          <View style={styles.fieldRight}>
            <Text style={[styles.fieldValue, !tx.note && { color: colors.textSecondary }]} numberOfLines={1}>{tx.note || t("tx.addNote")}</Text>
            <Ionicons name="create-outline" size={16} color={colors.textSecondary} style={{ marginLeft: 6 }} />
          </View>
        </TouchableOpacity>

        {tx.type ? <Field label={t("tx.type")} value={tx.type} /> : null}
        {tx.provider ? <Field label={t("tx.provider")} value={tx.provider} /> : null}
        {tx.balance_after != null ? <Field label={t("tx.balanceAfter")} value={money(tx.balance_after)} /> : null}
        {tx.service_charge != null && tx.service_charge > 0 ? <Field label={t("tx.charge")} value={money(tx.service_charge)} /> : null}
        <Field label={t("tx.dateTime")} value={new Date(tx.transacted_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })} />
        {tx.provider_reference ? <Field label={t("tx.reference")} value={tx.provider_reference} /> : null}
      </View>

      {/* actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => setCatModal(true)}>
          <Ionicons name="pricetag-outline" size={18} color={colors.primary} />
          <Text style={styles.actionTxt}>{t("tx.changeCategory")}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={openNote}>
          <Ionicons name="create-outline" size={18} color={colors.primary} />
          <Text style={styles.actionTxt}>{t("tx.editNote")}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={onDelete}>
          <Ionicons name="trash-outline" size={18} color={colors.error} />
          <Text style={[styles.actionTxt, { color: colors.error }]}>{t("tx.delete")}</Text>
        </TouchableOpacity>
      </View>

      {/* category picker */}
      <Modal transparent visible={catModal} animationType="slide" onRequestClose={() => setCatModal(false)}>
        <Pressable style={styles.backdrop} onPress={() => setCatModal(false)}>
          <Pressable style={styles.sheetTall}>
            <Text style={styles.sheetTitle}>{t("tx.pickCategory")}</Text>
            <ScrollView>
              <TouchableOpacity style={styles.catRow} onPress={() => pickCategory(null)}>
                <Text style={styles.catTxt}>{t("tx.uncategorized")}</Text>
                {!tx.category ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
              </TouchableOpacity>
              {cats.map((c) => (
                <TouchableOpacity key={c.id} style={styles.catRow} onPress={() => pickCategory(c.id)}>
                  <Text style={styles.catTxt}>{c.name}</Text>
                  {tx.category?.id === c.id ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* note editor */}
      <Modal transparent visible={noteModal} animationType="fade" onRequestClose={() => setNoteModal(false)}>
        <Pressable style={[styles.backdrop, { justifyContent: "center", padding: 24 }]} onPress={() => setNoteModal(false)}>
          <Pressable style={styles.noteBox}>
            <Text style={styles.sheetTitle}>{t("tx.note")}</Text>
            <TextInput
              style={styles.noteInput}
              value={noteDraft}
              onChangeText={setNoteDraft}
              placeholder={t("tx.addNote")}
              placeholderTextColor={colors.textSecondary}
              multiline
            />
            <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 12 }}>
              <TouchableOpacity onPress={() => setNoteModal(false)} style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
                <Text style={{ color: colors.textSecondary, fontWeight: "600" }}>{t("tx.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveNote} disabled={saving} style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
                {saving ? <ActivityIndicator color={colors.primary} /> : <Text style={{ color: colors.primary, fontWeight: "700" }}>{t("tx.save")}</Text>}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
  muted: { color: colors.textSecondary },
  hero: { alignItems: "center", paddingVertical: 24, backgroundColor: colors.surface },
  bigIcon: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  bigAmt: { fontSize: 28, fontWeight: "700" },
  heroSub: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  card: { backgroundColor: colors.surface, marginTop: 12, marginHorizontal: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 16 },
  fieldRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  fieldLabel: { fontSize: 13, color: colors.textSecondary, flex: 1 },
  fieldRight: { flexDirection: "row", alignItems: "center", flexShrink: 1, justifyContent: "flex-end" },
  fieldValue: { fontSize: 14, color: colors.text, fontWeight: "500", maxWidth: 220, textAlign: "right" },
  tag: { fontSize: 10, color: colors.primary, backgroundColor: "#D1FAE5", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 6, overflow: "hidden" },
  actions: { flexDirection: "row", marginHorizontal: 16, marginTop: 16, gap: 8 },
  actionBtn: { flex: 1, flexDirection: "column", alignItems: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingVertical: 14, gap: 4 },
  actionTxt: { fontSize: 12, color: colors.primary, fontWeight: "600" },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" },
  sheetTall: { backgroundColor: colors.surface, borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingVertical: 14, paddingHorizontal: 20, maxHeight: "70%" },
  sheetTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 8 },
  catRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  catTxt: { fontSize: 15, color: colors.text },
  noteBox: { backgroundColor: colors.surface, borderRadius: 16, padding: 18 },
  noteInput: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, minHeight: 90, textAlignVertical: "top", color: colors.text, fontSize: 15 },
});