// self-contained — it renders nothing when online, and when offline shows an amber strip with the last-synced time (loaded from the DB on the transition). Self-contained so we can drop it in once, globally. Amber matches the warning palette.



import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNetwork } from "../store/useNetwork";
import { getLastSynced } from "../data/sync";

export function OfflineBanner() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const online = useNetwork((s) => s.online);
  const [last, setLast] = useState<string | null>(null);

  useEffect(() => { if (!online) getLastSynced().then(setLast); }, [online]);

  if (online) return null;
  const time = last
    ? new Date(last).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : "—";
  return (
    <View style={[styles.b, { paddingTop: insets.top + 10 }]}>
      <Text style={styles.txt}>{t("offline.banner")} {time}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  b: { backgroundColor: "#FEF3C7", paddingBottom: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: "#FCD34D" },
  txt: { color: "#92400E", fontSize: 13, textAlign: "center" },
});



// import { useEffect, useState } from "react";
// import { StyleSheet, Text, View } from "react-native";
// import { useTranslation } from "react-i18next";
// import { useNetwork } from "../store/useNetwork";
// import { getLastSynced } from "../data/sync";

// export function OfflineBanner() {
//   const { t } = useTranslation();
//   const online = useNetwork((s) => s.online);
//   const [last, setLast] = useState<string | null>(null);

//   useEffect(() => { if (!online) getLastSynced().then(setLast); }, [online]);

//   if (online) return null;
//   const time = last
//     ? new Date(last).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
//     : "—";
//   return (
//     <View style={styles.b}>
//       <Text style={styles.txt}>{t("offline.banner")} {time}</Text>
//     </View>
//   );
// }
// const styles = StyleSheet.create({
//   b: { backgroundColor: "#FEF3C7", paddingVertical: 8, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: "#FCD34D" },
//   txt: { color: "#92400E", fontSize: 13, textAlign: "center" },
// });