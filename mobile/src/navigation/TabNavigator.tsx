// // the 4-tab bar you chose, in the emerald active color with Somali labels. @expo/vector-icons (Ionicons) ships with Expo — no install needed.
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { colors } from "../theme";
import TransactionsScreen from "../screens/TransactionsScreen";
import HomeScreen from "../screens/HomeScreen";
import TransactionsStack from "./TransactionsStack";
import AnalyticsScreen from "../screens/AnalyticsScreen";
import { useEffect } from "react";
import { useNotifications } from "../store/useNotifications";
import NotificationsStack from "./NotificationsStack";
import AnalyticsStack from "./AnalyticsStack";

const Tab = createBottomTabNavigator();

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Home: "home-outline",
  Transactions: "swap-horizontal-outline",
  Analytics: "bar-chart-outline",
  Notifications: "notifications-outline",
};

export default function TabNavigator() {
  const { t } = useTranslation();
  const unread = useNotifications((s) => s.unread);
  useEffect(() => { useNotifications.getState().refresh(); }, []);
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
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: t("tabs.home"), headerShown: false }} />
      <Tab.Screen name="Transactions" component={TransactionsStack} options={{ title: t("tabs.transactions"), headerShown: false }} />
      <Tab.Screen name="Analytics" component={AnalyticsStack} options={{ title: t("tabs.analytics"), headerShown: false }} />
      <Tab.Screen name="Notifications" component={NotificationsStack} options={{ title: t("tabs.notifications"), headerShown: false, tabBarBadge: unread > 0 ? unread : undefined }} />
    </Tab.Navigator>

  );
}
