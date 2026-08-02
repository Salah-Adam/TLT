import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useEffect } from "react";
import { colors } from "../theme";
import HomeScreen from "../screens/HomeScreen";
import TransactionsStack from "./TransactionsStack";
import AnalyticsStack from "./AnalyticsStack";
import SettingsScreen from "../screens/SettingsScreen";
import { useUnreadTx } from "../store/useUnreadTx";
import { useNotifications } from "../store/useNotifications";

const Tab = createBottomTabNavigator();
const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Home: "home-outline", Transactions: "swap-horizontal-outline", Analytics: "bar-chart-outline", Settings: "settings-outline",
};

export default function TabNavigator() {
  const { t } = useTranslation();
  const unreadTx = useUnreadTx((s) => s.count);
  useEffect(() => { useUnreadTx.getState().refresh(); useNotifications.getState().refresh(); }, []);
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: colors.surface }, headerTitleStyle: { color: colors.text },
        tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.textSecondary,
        tabBarIcon: ({ color, size }) => <Ionicons name={ICONS[route.name]} size={size} color={color} />,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: t("tabs.home"), headerShown: false }} />
      <Tab.Screen name="Transactions" component={TransactionsStack}
        options={{ title: t("tabs.transactions"), headerShown: false, tabBarBadge: unreadTx > 0 ? unreadTx : undefined }}
        listeners={({ navigation }) => ({
          tabPress: () => { useUnreadTx.getState().markAll(); navigation.navigate("Transactions", { screen: "TxList" }); },
        })}
      />
      {/* <Tab.Screen name="Analytics" component={AnalyticsStack} options={{ title: t("tabs.analytics"), headerShown: false }} /> */}

      <Tab.Screen name="Analytics" component={AnalyticsStack}
        options={{ title: t("tabs.analytics"), headerShown: false }}
        listeners={({ navigation }) => ({
          tabPress: () => navigation.navigate("Analytics", { screen: "AnalyticsMain" }),
        })}
      />

      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: t("settings.title"), headerShown: true }} />
    </Tab.Navigator>
  );
}






// // // the 4-tab bar you chose, in the emerald active color with Somali labels. @expo/vector-icons (Ionicons) ships with Expo — no install needed.
// import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
// import { Ionicons } from "@expo/vector-icons";
// import { useTranslation } from "react-i18next";
// import { colors } from "../theme";
// import TransactionsScreen from "../screens/TransactionsScreen";
// import HomeScreen from "../screens/HomeScreen";
// import TransactionsStack from "./TransactionsStack";
// import AnalyticsScreen from "../screens/AnalyticsScreen";
// import { useEffect } from "react";
// import { useNotifications } from "../store/useNotifications";
// import NotificationsStack from "./NotificationsStack";
// import AnalyticsStack from "./AnalyticsStack";

// const Tab = createBottomTabNavigator();

// const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
//   Home: "home-outline",
//   Transactions: "swap-horizontal-outline",
//   Analytics: "bar-chart-outline",
//   Notifications: "notifications-outline",
// };

// export default function TabNavigator() {
//   const { t } = useTranslation();
//   const unread = useNotifications((s) => s.unread);
//   useEffect(() => { useNotifications.getState().refresh(); }, []);
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
//       <Tab.Screen name="Home" component={HomeScreen} options={{ title: t("tabs.home"), headerShown: false }} />
//       {/* <Tab.Screen name="Transactions" component={TransactionsStack} options={{ title: t("tabs.transactions"), headerShown: false }} /> */}
//       <Tab.Screen name="Transactions" component={TransactionsStack}
//         options={{ title: t("tabs.transactions"), headerShown: false }}
//         listeners={({ navigation }) => ({
//           tabPress: () => navigation.navigate("Transactions", { screen: "TxList" }),   // always land on the list
//         })}
//       />
//       <Tab.Screen name="Analytics" component={AnalyticsStack} options={{ title: t("tabs.analytics"), headerShown: false }} />
//       <Tab.Screen name="Notifications" component={NotificationsStack} options={{ title: t("tabs.notifications"), headerShown: false, tabBarBadge: unread > 0 ? unread : undefined }} />
//     </Tab.Navigator>

//   );
// }
