// // the 4-tab bar you chose, in the emerald active color with Somali labels. @expo/vector-icons (Ionicons) ships with Expo — no install needed.



import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { colors } from "../theme";
import HomeScreen from "../screens/HomeScreen";
import TransactionsScreen from "../screens/TransactionsScreen";
import AnalyticsScreen from "../screens/AnalyticsScreen";
import NotificationsScreen from "../screens/NotificationsScreen";

const Tab = createBottomTabNavigator();

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Home: "home-outline",
  Transactions: "swap-horizontal-outline",
  Analytics: "bar-chart-outline",
  Notifications: "notifications-outline",
};

export default function TabNavigator() {
  const { t } = useTranslation();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { color: colors.text },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={ICONS[route.name]} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: t("tabs.home") }} />
      <Tab.Screen name="Transactions" component={TransactionsScreen} options={{ title: t("tabs.transactions") }} />
      <Tab.Screen name="Analytics" component={AnalyticsScreen} options={{ title: t("tabs.analytics") }} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} options={{ title: t("tabs.notifications") }} />
    </Tab.Navigator>
  );
}


// -----------------------------------------


// import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
// import { Ionicons } from "@expo/vector-icons";
// import { colors } from "../theme";
// import HomeScreen from "../screens/HomeScreen";
// import TransactionsScreen from "../screens/TransactionsScreen";
// import AnalyticsScreen from "../screens/AnalyticsScreen";
// import NotificationsScreen from "../screens/NotificationsScreen";

// const Tab = createBottomTabNavigator();

// const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
//   Home: "home-outline",
//   Transactions: "swap-horizontal-outline",
//   Analytics: "bar-chart-outline",
//   Notifications: "notifications-outline",
// };

// export default function TabNavigator() {
//   return (
//     <Tab.Navigator
//       screenOptions={({ route }) => ({
//         headerStyle: { backgroundColor: colors.surface },
//         headerTitleStyle: { color: colors.text },
//         tabBarActiveTintColor: colors.primary,
//         tabBarInactiveTintColor: colors.textSecondary,
//         tabBarIcon: ({ color, size }) => (
//           <Ionicons name={ICONS[route.name]} size={size} color={color} />
//         ),
//       })}
//     >
//       <Tab.Screen name="Home" component={HomeScreen} options={{ title: "Guriga" }} />
//       <Tab.Screen name="Transactions" component={TransactionsScreen} options={{ title: "Dhaqdhaqaaq" }} />
//       <Tab.Screen name="Analytics" component={AnalyticsScreen} options={{ title: "Falanqayn" }} />
//       <Tab.Screen name="Notifications" component={NotificationsScreen} options={{ title: "Ogeysiis" }} />
//     </Tab.Navigator>
//   );
// }