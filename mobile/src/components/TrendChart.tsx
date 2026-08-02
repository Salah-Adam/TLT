import React, { useState } from "react";
import { View, Text, StyleSheet, Modal, Pressable, TouchableWithoutFeedback } from "react-native";
import Svg, { Polyline, Circle, Line as SvgLine, Text as SvgText } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { colors } from "../theme";

export type TrendPoint = { label: string; popupTitle?: string; in: number; out: number };
const money = (n: number) => "$" + (n ?? 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
const tickLbl = (v: number) => "$" + (v >= 100 ? String(Math.round(v)) : String(Math.round(v * 10) / 10));

export function TrendChart({ points }: { points: TrendPoint[] }) {
  const { t } = useTranslation();
  const [w, setW] = useState(0);
  const [sel, setSel] = useState<number | null>(null);

  // const H = 210, padL = 46, padR = 14, padT = 12, padB = 30;
  const H = 210, padL = 35, padR = 8, padT = 12, padB = 30;
  const x0 = padL, y0 = padT;
  const x1 = Math.max(w - padR, x0 + 1), y1 = H - padB;
  const n = points.length;

  const vals = points.flatMap((p) => [p.in, p.out]);
  let min = vals.length ? Math.min(...vals) : 0;
  let max = vals.length ? Math.max(...vals) : 1;
  if (min === max) max = min + 1;
  const xFor = (i: number) => (n <= 1 ? (x0 + x1) / 2 : x0 + (i / (n - 1)) * (x1 - x0));
  const yFor = (v: number) => y1 - ((v - min) / (max - min)) * (y1 - y0);
  const ticks = Array.from({ length: 7 }, (_, i) => min + (i / 6) * (max - min));
  const inPts = points.map((p, i) => `${xFor(i)},${yFor(p.in)}`).join(" ");
  const outPts = points.map((p, i) => `${xFor(i)},${yFor(p.out)}`).join(" ");

  return (
    <View>
      <View style={styles.legend}>
        <View style={styles.legItem}><View style={[styles.sq, { backgroundColor: colors.moneyIn }]} /><Text style={styles.legTxt}>{t("analytics.legendIn")}</Text></View>
        <View style={styles.legItem}><View style={[styles.sq, { backgroundColor: colors.moneyOut }]} /><Text style={styles.legTxt}>{t("analytics.legendOut")}</Text></View>
      </View>

      <View onLayout={(e) => setW(e.nativeEvent.layout.width)}>
        {w > 0 && (
          <View style={{ position: "relative" }}>
            <Svg width={w} height={H}>
              {ticks.map((v, i) => <SvgText key={i} x={padL - 6} y={yFor(v) + 3} fill="#94A3B8" fontSize={9} textAnchor="end">{tickLbl(v)}</SvgText>)}
              <SvgLine x1={x0} y1={y0} x2={x0} y2={y1} stroke={colors.border} strokeWidth={1} />
              <SvgLine x1={x0} y1={y1} x2={x1} y2={y1} stroke={colors.border} strokeWidth={1} />
              <Polyline points={outPts} fill="none" stroke={colors.moneyOut} strokeWidth={2.5} />
              <Polyline points={inPts} fill="none" stroke={colors.moneyIn} strokeWidth={2.5} />
              {points.map((p, i) => (
                <React.Fragment key={i}>
                  <Circle cx={xFor(i)} cy={yFor(p.in)} r={sel === i ? 6 : 4} fill={colors.moneyIn} stroke="#fff" strokeWidth={sel === i ? 2 : 1} />
                  <Circle cx={xFor(i)} cy={yFor(p.out)} r={sel === i ? 6 : 4} fill={colors.moneyOut} stroke="#fff" strokeWidth={sel === i ? 2 : 1} />
                  {/* <SvgText x={xFor(i)} y={y1 + 15} fill={colors.textSecondary} fontSize={8} textAnchor="middle">{p.label}</SvgText> */}
                  <SvgText x={xFor(i)} y={y1 + 15} fill={colors.textSecondary} fontSize={8}
                    textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}>{p.label}</SvgText>
                </React.Fragment>
              ))}
            </Svg>
            {/* reliable RN tap targets — the whole day-column is pressable */}
            <View style={{ position: "absolute", left: x0, right: padR, top: y0, bottom: padB, flexDirection: "row" }}>
              {points.map((_, i) => <Pressable key={i} style={{ flex: 1 }} onPress={() => setSel(i)} />)}
            </View>
          </View>
        )}
      </View>

      <Modal transparent visible={sel !== null} animationType="fade" onRequestClose={() => setSel(null)}>
        <TouchableWithoutFeedback onPress={() => setSel(null)}>
          <View style={styles.backdrop}>
            <TouchableWithoutFeedback>
              <View style={styles.popup}>
                <Pressable style={styles.close} onPress={() => setSel(null)} hitSlop={8}><Ionicons name="close" size={16} color={colors.textSecondary} /></Pressable>
                <Text style={styles.popTitle}>{sel !== null ? (points[sel].popupTitle ?? points[sel].label) : ""}</Text>
                <View style={styles.popRow}><Text style={styles.popLbl}>{t("analytics.legendIn")}</Text><Text style={[styles.popVal, { color: colors.moneyIn }]}>{sel !== null ? money(points[sel].in) : ""}</Text></View>
                <View style={styles.popRow}><Text style={styles.popLbl}>{t("analytics.legendOut")}</Text><Text style={[styles.popVal, { color: colors.moneyOut }]}>{sel !== null ? money(points[sel].out) : ""}</Text></View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: "row", gap: 16, marginTop: 8, marginBottom: 2 },
  legItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  sq: { width: 11, height: 11, borderRadius: 3 },
  legTxt: { fontSize: 12, color: colors.text },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", alignItems: "center", justifyContent: "center", padding: 24 },
  popup: { minWidth: 210, backgroundColor: colors.surface, borderRadius: 14, padding: 14, paddingTop: 16, borderWidth: 1, borderColor: colors.border },
  close: { position: "absolute", top: 8, right: 8, width: 26, height: 26, borderRadius: 13, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" },
  popTitle: { fontSize: 14, fontWeight: "700", color: colors.text, marginBottom: 8 },
  popRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 6, minWidth: 150 },
  popLbl: { fontSize: 13, color: colors.textSecondary },
  popVal: { fontSize: 13, fontWeight: "600" },
});





// // Dual-line trend chart (react-native-svg). Green = received (in), red = sent (out).
// // 7-tick flexible Y axis between the smallest and largest value, $ labels, rotated "Amount" title,
// // dot markers, and a tap-any-day popup (✕ or tap outside to close). App palette only.
// import React, { useState } from "react";
// import { View, Text, StyleSheet, Modal, Pressable, TouchableWithoutFeedback } from "react-native";
// import Svg, { Polyline, Circle, Line as SvgLine, Text as SvgText, Rect } from "react-native-svg";
// import { Ionicons } from "@expo/vector-icons";
// import { useTranslation } from "react-i18next";
// import { colors } from "../theme";

// export type TrendPoint = { label: string; popupTitle?: string; in: number; out: number };
// const money = (n: number) => "$" + (n ?? 0).toLocaleString("en-US", { maximumFractionDigits: 2 });

// export function TrendChart({ points }: { points: TrendPoint[] }) {
//   const { t } = useTranslation();
//   const [w, setW] = useState(0);
//   const [sel, setSel] = useState<number | null>(null);

//   const H = 210, padL = 46, padR = 14, padT = 12, padB = 28;
//   const x0 = padL, y0 = padT;
//   const x1 = Math.max(w - padR, x0 + 1), y1 = H - padB;
//   const n = points.length;

//   const vals = points.flatMap((p) => [p.in, p.out]);
//   let min = vals.length ? Math.min(...vals) : 0;
//   let max = vals.length ? Math.max(...vals) : 1;
//   if (min === max) max = min + 1;                       // flat data guard
//   const colW = (x1 - x0) / Math.max(n - 1, 1);
//   const xFor = (i: number) => (n <= 1 ? (x0 + x1) / 2 : x0 + (i / (n - 1)) * (x1 - x0));
//   const yFor = (v: number) => y1 - ((v - min) / (max - min)) * (y1 - y0);
//   const ticks = Array.from({ length: 7 }, (_, i) => min + (i / 6) * (max - min));
//   const inPts = points.map((p, i) => `${xFor(i)},${yFor(p.in)}`).join(" ");
//   const outPts = points.map((p, i) => `${xFor(i)},${yFor(p.out)}`).join(" ");

//   return (
//     <View>
//       <View style={styles.legend}>
//         <View style={styles.legItem}><View style={[styles.sq, { backgroundColor: colors.moneyIn }]} /><Text style={styles.legTxt}>{t("analytics.legendIn")}</Text></View>
//         <View style={styles.legItem}><View style={[styles.sq, { backgroundColor: colors.moneyOut }]} /><Text style={styles.legTxt}>{t("analytics.legendOut")}</Text></View>
//       </View>

//       <View onLayout={(e) => setW(e.nativeEvent.layout.width)}>
//         {w > 0 && (
//           <Svg width={w} height={H}>
//             <SvgText x={12} y={(y0 + y1) / 2} fill={colors.textSecondary} fontSize={10} textAnchor="middle" transform={`rotate(-90 12 ${(y0 + y1) / 2})`}>{t("analytics.amountAxis")}</SvgText>
//             {ticks.map((v, i) => <SvgText key={i} x={padL - 6} y={yFor(v) + 3} fill="#94A3B8" fontSize={9} textAnchor="end">{money(v)}</SvgText>)}
//             <SvgLine x1={x0} y1={y0} x2={x0} y2={y1} stroke={colors.border} strokeWidth={1} />
//             <SvgLine x1={x0} y1={y1} x2={x1} y2={y1} stroke={colors.border} strokeWidth={1} />
//             <Polyline points={outPts} fill="none" stroke={colors.moneyOut} strokeWidth={2.5} />
//             <Polyline points={inPts} fill="none" stroke={colors.moneyIn} strokeWidth={2.5} />
//             {points.map((p, i) => (
//               <React.Fragment key={i}>
//                 <Circle cx={xFor(i)} cy={yFor(p.in)} r={sel === i ? 5 : 3} fill={colors.moneyIn} stroke="#fff" strokeWidth={sel === i ? 1.5 : 0} />
//                 <Circle cx={xFor(i)} cy={yFor(p.out)} r={sel === i ? 5 : 3} fill={colors.moneyOut} stroke="#fff" strokeWidth={sel === i ? 1.5 : 0} />
//                 <SvgText x={xFor(i)} y={y1 + 16} fill={colors.textSecondary} fontSize={9} textAnchor="middle">{p.label}</SvgText>
//                 <Rect x={xFor(i) - colW / 2} y={y0} width={colW} height={y1 - y0} fill="transparent" onPress={() => setSel(i)} />
//               </React.Fragment>
//             ))}
//           </Svg>
//         )}
//       </View>

//       <Modal transparent visible={sel !== null} animationType="fade" onRequestClose={() => setSel(null)}>
//         <TouchableWithoutFeedback onPress={() => setSel(null)}>
//           <View style={styles.backdrop}>
//             <TouchableWithoutFeedback>
//               <View style={styles.popup}>
//                 <Pressable style={styles.close} onPress={() => setSel(null)} hitSlop={8}><Ionicons name="close" size={16} color="#fff" /></Pressable>
//                 <Text style={styles.popTitle}>{sel !== null ? (points[sel].popupTitle ?? points[sel].label) : ""}</Text>
//                 <View style={styles.popRow}><Text style={styles.popLbl}>{t("analytics.legendIn")}</Text><Text style={[styles.popVal, { color: colors.moneyIn }]}>{sel !== null ? money(points[sel].in) : ""}</Text></View>
//                 <View style={styles.popRow}><Text style={styles.popLbl}>{t("analytics.legendOut")}</Text><Text style={[styles.popVal, { color: colors.moneyOut }]}>{sel !== null ? money(points[sel].out) : ""}</Text></View>
//               </View>
//             </TouchableWithoutFeedback>
//           </View>
//         </TouchableWithoutFeedback>
//       </Modal>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   legend: { flexDirection: "row", gap: 16, marginTop: 8, marginBottom: 2 },
//   legItem: { flexDirection: "row", alignItems: "center", gap: 6 },
//   sq: { width: 11, height: 11, borderRadius: 3 },
//   legTxt: { fontSize: 12, color: colors.text },
//   backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", alignItems: "center", justifyContent: "center", padding: 24 },
//   popup: { minWidth: 200, backgroundColor: "#0F172A", borderRadius: 14, padding: 14, paddingTop: 16 },
//   close: { position: "absolute", top: 8, right: 8, width: 24, height: 24, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" },
//   popTitle: { fontSize: 13, fontWeight: "700", color: "#fff", marginBottom: 8 },
//   popRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
//   popLbl: { fontSize: 13, color: "#CBD5E1" },
//   popVal: { fontSize: 13, fontWeight: "600" },
// });