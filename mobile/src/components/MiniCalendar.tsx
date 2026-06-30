// A tiny pure-RN month calendar. Tap one day = single date; tap a second = from→to range.
// No dependency, no native module. Emits YYYY-MM-DD strings (lexical compare = chronological).
import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme";

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const WEEK = ["S", "M", "T", "W", "T", "F", "S"];

export function MiniCalendar({ from, to, onChange }: {
  from: string | null; to: string | null; onChange: (from: string | null, to: string | null) => void;
}) {
  const init = from ? new Date(from + "T00:00:00") : new Date();
  const [view, setView] = useState(new Date(init.getFullYear(), init.getMonth(), 1));
  const year = view.getFullYear(), month = view.getMonth();

  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const pick = (d: Date) => {
    const k = ymd(d);
    if (!from || (from && to)) { onChange(k, null); return; } // start a new selection
    if (k < from) onChange(k, null); else onChange(from, k);   // complete the range
  };
  const isEnd = (k: string) => k === from || k === to;
  const inRange = (k: string) => !!(from && to && k > from && k < to);

  return (
    <View>
      <View style={styles.head}>
        <TouchableOpacity onPress={() => setView(new Date(year, month - 1, 1))} hitSlop={12}><Ionicons name="chevron-back" size={20} color={colors.text} /></TouchableOpacity>
        <Text style={styles.month}>{view.toLocaleDateString([], { month: "long", year: "numeric" })}</Text>
        <TouchableOpacity onPress={() => setView(new Date(year, month + 1, 1))} hitSlop={12}><Ionicons name="chevron-forward" size={20} color={colors.text} /></TouchableOpacity>
      </View>
      <View style={styles.weekRow}>{WEEK.map((w, i) => <Text key={i} style={styles.weekTxt}>{w}</Text>)}</View>
      <View style={styles.grid}>
        {cells.map((d, i) => {
          if (!d) return <View key={i} style={styles.cell} />;
          const k = ymd(d), end = isEnd(k), mid = inRange(k);
          return (
            <TouchableOpacity key={i} style={styles.cell} onPress={() => pick(d)} activeOpacity={0.7}>
              <View style={[styles.day, mid && styles.dayMid, end && styles.dayEnd]}>
                <Text style={[styles.dayTxt, end && { color: "#fff", fontWeight: "700" }]}>{d.getDate()}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 6, marginBottom: 8 },
  month: { fontSize: 15, fontWeight: "600", color: colors.text },
  weekRow: { flexDirection: "row" },
  weekTxt: { flexBasis: "14.2857%", textAlign: "center", fontSize: 11, color: colors.textSecondary, marginBottom: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { flexBasis: "14.2857%", aspectRatio: 1, alignItems: "center", justifyContent: "center" },
  day: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  dayMid: { backgroundColor: "#D1FAE5", borderRadius: 0, width: "100%" },
  dayEnd: { backgroundColor: colors.primary },
  dayTxt: { fontSize: 14, color: colors.text },
});