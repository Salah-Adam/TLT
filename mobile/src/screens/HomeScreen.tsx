// it reads categories from the local DB (not the API), shows the count + last-synced time, and Refresh now runs syncAll. After you log in, the count should already be 24 (synced by finishAuth).

import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { colors } from "../theme";
import { Button } from "../components/Button";
import { useSession } from "../store/useSession";
import { authApi } from "../api/auth";
import { readCategories } from "../data/categories";
import { syncAll, getLastSynced } from "../data/sync";
import { ApiError } from "../api/client";

export default function HomeScreen() {
  const { t } = useTranslation();
  const user = useSession((s) => s.user);
  const refreshToken = useSession((s) => s.refreshToken);
  const signOut = useSession((s) => s.signOut);
  const [count, setCount] = useState<number | null>(null);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setCount((await readCategories()).length);
    setLastSynced(await getLastSynced());
  }, []);

  useEffect(() => { load(); }, [load]);

  const refresh = async () => {
    setLoading(true); setMsg("");
    try { await syncAll(); await load(); }
    catch (e) { setMsg(e instanceof ApiError ? e.message : t("auth.genericError")); }
    finally { setLoading(false); }
  };

  const logout = async () => {
    try { if (refreshToken) await authApi.logout(refreshToken); } catch {}
    await signOut();
  };

  return (
    <View style={styles.c}>
      <Text style={styles.t}>{t("tabs.home")}</Text>
      {user ? <Text style={styles.s}>{user.full_name}</Text> : null}
      <Text style={styles.s}>Categories cached: {count ?? "…"}</Text>
      <Text style={styles.s}>Last synced: {lastSynced ? new Date(lastSynced).toLocaleTimeString() : "never"}</Text>
      <View style={{ height: 16 }} />
      <Button title="Refresh now" onPress={refresh} loading={loading} />
      {msg ? <Text style={styles.err}>{msg}</Text> : null}
      <View style={{ height: 12 }} />
      <Button title={t("auth.logout")} onPress={logout} variant="ghost" />
    </View>
  );
}
const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", padding: 24 },
  t: { fontSize: 26, fontWeight: "600", color: colors.text },
  s: { fontSize: 15, color: colors.textSecondary, marginTop: 6 },
  err: { color: colors.error, fontSize: 14, marginTop: 10, textAlign: "center" },
});



// import { useState } from "react";
// import { StyleSheet, Text, View } from "react-native";
// import { useTranslation } from "react-i18next";
// import { colors } from "../theme";
// import { Button } from "../components/Button";
// import { useSession } from "../store/useSession";
// import { authApi } from "../api/auth";
// import { getDb } from "../db";

// export default function HomeScreen() {
//   const { t } = useTranslation();
//   const user = useSession((s) => s.user);
//   const refreshToken = useSession((s) => s.refreshToken);
//   const signOut = useSession((s) => s.signOut);
//   const [dbResult, setDbResult] = useState("");

//   const logout = async () => {
//     try { if (refreshToken) await authApi.logout(refreshToken); } catch {}
//     await signOut();
//   };

//   const testDb = async () => {
//     setDbResult("…");
//     try {
//       const db = await getDb();
//       await db.execAsync("CREATE TABLE IF NOT EXISTS smoke (id INTEGER PRIMARY KEY AUTOINCREMENT, msg TEXT)");
//       await db.runAsync("INSERT INTO smoke (msg) VALUES (?)", ["hello"]);
//       const row = await db.getFirstAsync<{ n: number }>("SELECT COUNT(*) AS n FROM smoke");
//       setDbResult(`✅ encrypted DB OK (${row?.n ?? 0} rows)`);
//     } catch (e) {
//       setDbResult(`❌ ${String((e as Error)?.message ?? e)}`);
//     }
//   };

//   return (
//     <View style={styles.c}>
//       <Text style={styles.t}>{t("tabs.home")}</Text>
//       {user ? <Text style={styles.s}>{user.full_name}</Text> : null}
//       <View style={{ height: 24 }} />
//       <Button title="Test encrypted DB" onPress={testDb} />
//       {dbResult ? <Text style={styles.r}>{dbResult}</Text> : null}
//       <View style={{ height: 12 }} />
//       <Button title={t("auth.logout")} onPress={logout} variant="ghost" />
//     </View>
//   );
// }
// const styles = StyleSheet.create({
//   c: { flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", padding: 24 },
//   t: { fontSize: 26, fontWeight: "600", color: colors.text },
//   s: { fontSize: 16, color: colors.textSecondary, marginTop: 6 },
//   r: { fontSize: 15, color: colors.text, marginTop: 12 },
// });



