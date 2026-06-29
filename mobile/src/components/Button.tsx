//  one themed button with loading/disabled/ghost states, reused across the whole app so buttons stay consistent.

import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from "react-native";
import { colors } from "../theme";

type Props = { title: string; onPress: () => void; loading?: boolean; disabled?: boolean; variant?: "primary" | "ghost" };
export function Button({ title, onPress, loading, disabled, variant = "primary" }: Props) {
  const ghost = variant === "ghost";
  return (
    <TouchableOpacity
      style={[styles.btn, ghost && styles.ghost, (disabled || loading) && styles.disabled]}
      onPress={onPress} disabled={disabled || loading} activeOpacity={0.85}
    >
      {loading ? <ActivityIndicator color={ghost ? colors.primary : "#fff"} />
        : <Text style={[styles.text, ghost && styles.ghostText]}>{title}</Text>}
    </TouchableOpacity>
  );
}
const styles = StyleSheet.create({
  btn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  ghost: { backgroundColor: "transparent" },
  disabled: { opacity: 0.6 },
  text: { color: "#fff", fontSize: 16, fontWeight: "600" },
  ghostText: { color: colors.primary },
});