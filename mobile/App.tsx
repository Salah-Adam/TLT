// SafeAreaProvider handles the notch/nav-bar insets; NavigationContainer is the root of all navigation; it renders your tab navigator.


import "./src/i18n";
import { useEffect, useRef } from "react";
import { ActivityIndicator, AppState, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import RootNavigator from "./src/navigation/RootNavigator";
import { OfflineBanner } from "./src/components/OfflineBanner";
import { useSession } from "./src/store/useSession";
import { useNetwork } from "./src/store/useNetwork";
import { colors } from "./src/theme";
import { syncAll } from "./src/data/sync";

import { navRef } from "./src/navigation/navRef";
import { registerPush, initPushListeners } from "./src/services/push";
import * as Sentry from "@sentry/react-native";

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.EXPO_PUBLIC_SENTRY_DSN,   // no DSN → disabled (safe locally)
  environment: __DEV__ ? "development" : "production",
  tracesSampleRate: 0,                              // errors only, no perf tracing (stays in free quota)
  sendDefaultPii: false,                            // finance app — no PII to a third party
});

// export default function App() {
function App() {
  const hydrated = useSession((s) => s.hydrated);
  const hydrate = useSession((s) => s.hydrate);

  const accessToken = useSession((s) => s.accessToken);
  useEffect(() => { const unsub = initPushListeners(); return unsub; }, []);
  useEffect(() => { if (accessToken) registerPush(); }, [accessToken]);

  useEffect(() => { hydrate(); }, [hydrate]);
  useEffect(() => {
    const unsub = useNetwork.getState().init();
    return unsub;
  }, []);

  const lastResume = useRef(0);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      if (!useSession.getState().accessToken) return;
      const now = Date.now();
      if (now - lastResume.current < 30000) return; // debounce: skip if synced <30s ago
      lastResume.current = now;
      syncAll().catch(() => {});
    });
    return () => sub.remove();
  }, []);
  
  if (!hydrated) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  return (
    <SafeAreaProvider>
      <NavigationContainer ref={navRef}>
        <StatusBar style="dark" />
        <View style={{ flex: 1 }}>
          <OfflineBanner />
          <RootNavigator />
        </View>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default Sentry.wrap(App);



// import "./src/i18n";
// import { useEffect } from "react";
// import { ActivityIndicator, View } from "react-native";
// import { NavigationContainer } from "@react-navigation/native";
// import { SafeAreaProvider } from "react-native-safe-area-context";
// import { StatusBar } from "expo-status-bar";
// import RootNavigator from "./src/navigation/RootNavigator";
// import { useSession } from "./src/store/useSession";
// import { colors } from "./src/theme";

// export default function App() {
//   const hydrated = useSession((s) => s.hydrated);
//   const hydrate = useSession((s) => s.hydrate);
//   useEffect(() => { hydrate(); }, [hydrate]);

//   if (!hydrated) {
//     return (
//       <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
//         <ActivityIndicator size="large" color={colors.primary} />
//       </View>
//     );
//   }
//   return (
//     <SafeAreaProvider>
//       <NavigationContainer>
//         <StatusBar style="dark" />
//         <RootNavigator />
//       </NavigationContainer>
//     </SafeAreaProvider>
//   );
// }

