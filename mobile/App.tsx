// SafeAreaProvider handles the notch/nav-bar insets; NavigationContainer is the root of all navigation; it renders your tab navigator.


import "./src/i18n";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import RootNavigator from "./src/navigation/RootNavigator";
import { OfflineBanner } from "./src/components/OfflineBanner";
import { useSession } from "./src/store/useSession";
import { useNetwork } from "./src/store/useNetwork";
import { colors } from "./src/theme";

export default function App() {
  const hydrated = useSession((s) => s.hydrated);
  const hydrate = useSession((s) => s.hydrate);

  useEffect(() => { hydrate(); }, [hydrate]);
  useEffect(() => {
    const unsub = useNetwork.getState().init();
    return unsub;
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
      <NavigationContainer>
        <StatusBar style="dark" />
        <View style={{ flex: 1 }}>
          <OfflineBanner />
          <RootNavigator />
        </View>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}



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

