import { useRef, useState } from "react";
import { Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { colors } from "../theme";
import { markSeen } from "../onboarding";

type Slide = { icon?: any; title: string; body: string; grid?: boolean };

// Drop real logos in assets/telecoms/ then uncomment `logo`:
const TELECOMS = [
  { name: "Hormuud" /*, logo: require("../../assets/telecoms/hormuud.png") */ },
  { name: "Somtel"  /*, logo: require("../../assets/telecoms/somtel.png")  */ },
  { name: "Telesom" /*, logo: require("../../assets/telecoms/telesom.png") */ },
  { name: "Golis"   /*, logo: require("../../assets/telecoms/golis.png")   */ },
  { name: "Somnet"  /*, logo: require("../../assets/telecoms/somnet.png")  */ },
  { name: "Amtel"   /*, logo: require("../../assets/telecoms/amtel.png")   */ },
] as { name: string; logo?: any }[];

export function OnboardingIntro({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const ref = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);

  const slides: Slide[] = [
    { icon: "receipt-outline", title: t("onboarding.s1Title"), body: t("onboarding.s1Body") },
    { icon: "pie-chart-outline", title: t("onboarding.s2Title"), body: t("onboarding.s2Body") },
    { icon: "shield-checkmark-outline", title: t("onboarding.s3Title"), body: t("onboarding.s3Body") },
    { grid: true, title: t("onboarding.s4Title"), body: t("onboarding.s4Body") },
  ];
  const last = page === slides.length - 1;
  const finish = async () => { await markSeen("intro"); onDone(); };
  const next = () => { if (last) return finish(); const n = page + 1; ref.current?.scrollTo({ x: n * width, animated: true }); setPage(n); };

  return (
    <Modal visible animationType="fade" onRequestClose={finish}>
      <View style={[styles.wrap, { paddingTop: insets.top, paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.top}><TouchableOpacity onPress={finish} hitSlop={10}><Text style={styles.skip}>{t("onboarding.skip")}</Text></TouchableOpacity></View>
        <ScrollView ref={ref} horizontal pagingEnabled style={{ flex: 1 }} showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}>
          {slides.map((s, i) => (
            <View key={i} style={[styles.slide, { width }]}>
              {s.grid ? (
                <>
                  <Text style={styles.title}>{s.title}</Text>
                  <Text style={styles.body}>{s.body}</Text>
                  <View style={styles.grid}>
                    {TELECOMS.map((tc) => (
                      <View key={tc.name} style={styles.tile}>
                        {tc.logo ? <Image source={tc.logo} style={styles.logo} resizeMode="contain" />
                                 : <Text style={styles.tileTxt}>{tc.name}</Text>}
                      </View>
                    ))}
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.iconWrap}><Ionicons name={s.icon} size={60} color={colors.primaryDark} /></View>
                  <Text style={styles.title}>{s.title}</Text>
                  <Text style={styles.body}>{s.body}</Text>
                </>
              )}
            </View>
          ))}
        </ScrollView>
        <View style={styles.dots}>{slides.map((_, i) => <View key={i} style={[styles.dot, i === page && styles.dotActive]} />)}</View>
        <TouchableOpacity style={styles.btn} onPress={next} activeOpacity={0.85}>
          <Text style={styles.btnTxt}>{last ? t("onboarding.start") : t("onboarding.next")}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.background },
  top: { flexDirection: "row", justifyContent: "flex-end", paddingHorizontal: 20, height: 44, alignItems: "center" },
  skip: { fontSize: 15, color: colors.textSecondary },
  slide: { alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  iconWrap: { width: 132, height: 132, borderRadius: 40, backgroundColor: "#ECFDF5", alignItems: "center", justifyContent: "center", marginBottom: 30 },
  title: { fontSize: 22, fontWeight: "700", color: colors.text, textAlign: "center" },
  body: { fontSize: 15, color: colors.textSecondary, textAlign: "center", marginTop: 12, lineHeight: 22 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 12, marginTop: 24 },
  tile: { width: 88, height: 88, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  logo: { width: 52, height: 52 },
  tileTxt: { fontSize: 12, fontWeight: "600", color: colors.primaryDark },
  dots: { flexDirection: "row", justifyContent: "center", gap: 6, marginVertical: 20 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#CBD5E1" },
  dotActive: { width: 20, backgroundColor: colors.primary },
  btn: { backgroundColor: colors.primary, marginHorizontal: 24, borderRadius: 14, paddingVertical: 15, alignItems: "center" },
  btnTxt: { color: "#fff", fontSize: 16, fontWeight: "600" },
});








// import { useRef, useState } from "react";
// import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from "react-native";
// import { useSafeAreaInsets } from "react-native-safe-area-context";
// import { Ionicons } from "@expo/vector-icons";
// import { useTranslation } from "react-i18next";
// import { colors } from "../theme";
// import { markSeen } from "../onboarding";

// type Slide = { icon: any; title: string; body: string };

// export function OnboardingIntro({ onDone }: { onDone: () => void }) {
//   const { t } = useTranslation();
//   const { width } = useWindowDimensions();
//   const insets = useSafeAreaInsets();
//   const ref = useRef<ScrollView>(null);
//   const [page, setPage] = useState(0);

//   const slides: Slide[] = [
//     { icon: "receipt-outline", title: t("onboarding.s1Title"), body: t("onboarding.s1Body") },
//     { icon: "pie-chart-outline", title: t("onboarding.s2Title"), body: t("onboarding.s2Body") },
//     { icon: "shield-checkmark-outline", title: t("onboarding.s3Title"), body: t("onboarding.s3Body") },
//   ];
//   const last = page === slides.length - 1;

//   const finish = async () => { await markSeen("intro"); onDone(); };
//   const next = () => {
//     if (last) { finish(); return; }
//     const n = page + 1;
//     ref.current?.scrollTo({ x: n * width, animated: true });
//     setPage(n);
//   };

//   return (
//     <Modal visible animationType="fade" onRequestClose={finish}>
//       <View style={[styles.wrap, { paddingTop: insets.top, paddingBottom: insets.bottom + 16 }]}>
//         <View style={styles.top}>
//           <TouchableOpacity onPress={finish} hitSlop={10}><Text style={styles.skip}>{t("onboarding.skip")}</Text></TouchableOpacity>
//         </View>
//         <ScrollView
//           ref={ref}
//           horizontal
//           pagingEnabled
//           style={{ flex: 1 }}
//           showsHorizontalScrollIndicator={false}
//           onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
//         >
//           {slides.map((s, i) => (
//             <View key={i} style={[styles.slide, { width }]}>
//               <View style={styles.iconWrap}><Ionicons name={s.icon} size={44} color={colors.primaryDark} /></View>
//               <Text style={styles.title}>{s.title}</Text>
//               <Text style={styles.body}>{s.body}</Text>
//             </View>
//           ))}
//         </ScrollView>
//         <View style={styles.dots}>
//           {slides.map((_, i) => <View key={i} style={[styles.dot, i === page && styles.dotActive]} />)}
//         </View>
//         <TouchableOpacity style={styles.btn} onPress={next} activeOpacity={0.85}>
//           <Text style={styles.btnTxt}>{last ? t("onboarding.start") : t("onboarding.next")}</Text>
//         </TouchableOpacity>
//       </View>
//     </Modal>
//   );
// }

// const styles = StyleSheet.create({
//   wrap: { flex: 1, backgroundColor: colors.background },
//   top: { flexDirection: "row", justifyContent: "flex-end", paddingHorizontal: 20, height: 44, alignItems: "center" },
//   skip: { fontSize: 15, color: colors.textSecondary },
//   slide: { alignItems: "center", justifyContent: "center", paddingHorizontal: 36 },
//   iconWrap: { width: 96, height: 96, borderRadius: 48, backgroundColor: "#ECFDF5", alignItems: "center", justifyContent: "center", marginBottom: 28 },
//   title: { fontSize: 22, fontWeight: "700", color: colors.text, textAlign: "center" },
//   body: { fontSize: 15, color: colors.textSecondary, textAlign: "center", marginTop: 12, lineHeight: 22 },
//   dots: { flexDirection: "row", justifyContent: "center", gap: 6, marginVertical: 20 },
//   dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#CBD5E1" },
//   dotActive: { width: 20, backgroundColor: colors.primary },
//   btn: { backgroundColor: colors.primary, marginHorizontal: 24, borderRadius: 14, paddingVertical: 15, alignItems: "center" },
//   btnTxt: { color: "#fff", fontSize: 16, fontWeight: "600" },
// });