//  the fixed 252 chip + numeric-only field; guarantees the country code and lets the user type only the local part (your requirement).

import { StyleSheet, Text, TextInput, View } from "react-native";
import { colors } from "../theme";

type Props = { value: string; onChangeText: (v: string) => void; label?: string; placeholder?: string };
export function PhoneField({ value, onChangeText, label, placeholder }: Props) {
  return (
    <View style={{ marginBottom: 16 }}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.row}>
        <View style={styles.prefix}><Text style={styles.prefixText}>252</Text></View>
        <TextInput
          value={value}
          onChangeText={(tx) => onChangeText(tx.replace(/[^0-9]/g, ""))}
          keyboardType="number-pad"
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          style={styles.input}
          maxLength={12}
        />
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  label: { fontSize: 13, color: colors.textSecondary, marginBottom: 6 },
  row: { flexDirection: "row" },
  prefix: { backgroundColor: colors.border, borderTopLeftRadius: 12, borderBottomLeftRadius: 12, paddingHorizontal: 14, justifyContent: "center" },
  prefixText: { fontSize: 16, fontWeight: "600", color: colors.text },
  input: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderTopRightRadius: 12, borderBottomRightRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: colors.text },
});