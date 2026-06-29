// a reusable password input with a show/hide eye toggle (eye-off-outline ↔ eye-outline). hidden state flips secureTextEntry.
// We'll reuse this in Register, Reset, and Change-password too, so the toggle behaves the same everywhere

import { useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme";

type Props = { value: string; onChangeText: (v: string) => void; label?: string; placeholder?: string };
export function PasswordField({ value, onChangeText, label, placeholder }: Props) {
  const [hidden, setHidden] = useState(true);
  return (
    <View style={{ marginBottom: 16 }}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.row}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={hidden}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          style={styles.input}
        />
        <TouchableOpacity onPress={() => setHidden((h) => !h)} style={styles.eye} hitSlop={10}>
          <Ionicons name={hidden ? "eye-off-outline" : "eye-outline"} size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  label: { fontSize: 13, color: colors.textSecondary, marginBottom: 6 },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingRight: 12 },
  input: { flex: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: colors.text },
  eye: { padding: 4 },
});