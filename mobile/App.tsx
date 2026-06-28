// SafeAreaProvider handles the notch/nav-bar insets; NavigationContainer is the root of all navigation; it renders your tab navigator.

// : on launch it loads any saved tokens from secure storage before rendering (showing a brief emerald spinner). 
// In Step 2 we'll branch here: accessToken ? <Tabs/> : <AuthStack/>.

import "./src/i18n";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import TabNavigator from "./src/navigation/TabNavigator";
import { useSession } from "./src/store/useSession";
import { colors } from "./src/theme";

export default function App() {
  const hydrated = useSession((s) => s.hydrated);
  const hydrate = useSession((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

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
        <TabNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}



// import "./src/i18n";
// import { NavigationContainer } from "@react-navigation/native";
// import { SafeAreaProvider } from "react-native-safe-area-context";
// import { StatusBar } from "expo-status-bar";
// import TabNavigator from "./src/navigation/TabNavigator";

// export default function App() {
//   return (
//     <SafeAreaProvider>
//       <NavigationContainer>
//         <StatusBar style="dark" />
//         <TabNavigator />
//       </NavigationContainer>
//     </SafeAreaProvider>
//   );
// }
