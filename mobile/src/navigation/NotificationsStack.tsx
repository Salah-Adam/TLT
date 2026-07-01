import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { colors } from "../theme";
import NotificationsScreen from "../screens/NotificationsScreen";
import NotificationGroupScreen from "../screens/NotificationGroupScreen";

export type NotificationsStackParamList = {
  NotifFolders: undefined;
  NotifGroup: { family: string; title: string };
};

const Stack = createNativeStackNavigator<NotificationsStackParamList>();

export default function NotificationsStack() {
  const { t } = useTranslation();
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: colors.surface }, headerTitleStyle: { color: colors.text }, headerTintColor: colors.primary }}>
      <Stack.Screen name="NotifFolders" component={NotificationsScreen} options={{ title: t("tabs.notifications") }} />
      <Stack.Screen name="NotifGroup" component={NotificationGroupScreen} options={({ route }) => ({ title: (route.params as any).title })} />
    </Stack.Navigator>
  );
}