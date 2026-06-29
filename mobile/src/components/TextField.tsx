// one reusable themed text input, 
// so every form (login, register, settings) looks and behaves identically.

import { StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";
import { colors } from "../theme";

type Props = TextInputProps & { label?: string };
export function TextField({ label, style, ...props }: Props) {
  return (
    <View style={{ marginBottom: 16 }}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput placeholderTextColor={colors.textSecondary} style={[styles.input, style]} {...props} />
    </View>
  );
}
const styles = StyleSheet.create({
  label: { fontSize: 13, color: colors.textSecondary, marginBottom: 6 },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: colors.text },
});