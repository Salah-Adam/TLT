// The authed root: the tab bar, plus the ⋮-menu destinations pushed OVER the tabs.
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { colors } from "../theme";
import TabNavigator from "./TabNavigator";
import TrackedContactsScreen from "../screens/TrackedContactsScreen";
import TrackedContactDetailScreen from "../screens/TrackedContactDetailScreen";
import ContactFormScreen from "../screens/ContactFormScreen";
import SpendingAlertsScreen from "../screens/SpendingAlertsScreen";
import AlertFormScreen from "../screens/AlertFormScreen";

export type AppStackParamList = {
  Tabs: undefined;
  TrackedContacts: undefined;
  TrackedContactDetail: { id: string; label?: string };
  ContactForm: { id?: string } | undefined;
  SpendingAlerts: undefined;
  AlertForm: { alert?: any } | undefined; // alert present = edit
};

const Stack = createNativeStackNavigator<AppStackParamList>();

export default function AppStack() {
  const { t } = useTranslation();
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: colors.surface }, headerTitleStyle: { color: colors.text }, headerTintColor: colors.primary }}>
      <Stack.Screen name="Tabs" component={TabNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="TrackedContacts" component={TrackedContactsScreen} options={{ title: t("contacts.title") }} />
      <Stack.Screen name="TrackedContactDetail" component={TrackedContactDetailScreen}
        options={({ route }) => ({ title: (route.params as any)?.label ?? t("contacts.detailTitle") })} />
      <Stack.Screen name="ContactForm" component={ContactFormScreen}
        options={({ route }) => ({ title: (route.params as any)?.id ? t("contacts.editTitle") : t("contacts.addTitle") })} />
      <Stack.Screen name="SpendingAlerts" component={SpendingAlertsScreen} options={{ title: t("alerts.title") }} />
      <Stack.Screen name="AlertForm" component={AlertFormScreen}
        options={({ route }) => ({ title: (route.params as any)?.alert ? t("alerts.editTitle") : t("alerts.addTitle") })} />
    </Stack.Navigator>
  );
}



// // The authed root: the tab bar, plus the ⋮-menu destinations pushed OVER the tabs.
// // (8B adds SpendingAlerts + AlertForm to this same stack.)
// import { createNativeStackNavigator } from "@react-navigation/native-stack";
// import { useTranslation } from "react-i18next";
// import { colors } from "../theme";
// import TabNavigator from "./TabNavigator";
// import TrackedContactsScreen from "../screens/TrackedContactsScreen";
// import TrackedContactDetailScreen from "../screens/TrackedContactDetailScreen";
// import ContactFormScreen from "../screens/ContactFormScreen";

// export type AppStackParamList = {
//   Tabs: undefined;
//   TrackedContacts: undefined;
//   TrackedContactDetail: { id: string; label?: string };
//   ContactForm: { id?: string } | undefined; // id present = edit label/direction
// };

// const Stack = createNativeStackNavigator<AppStackParamList>();

// export default function AppStack() {
//   const { t } = useTranslation();
//   return (
//     <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: colors.surface }, headerTitleStyle: { color: colors.text }, headerTintColor: colors.primary }}>
//       <Stack.Screen name="Tabs" component={TabNavigator} options={{ headerShown: false }} />
//       <Stack.Screen name="TrackedContacts" component={TrackedContactsScreen} options={{ title: t("contacts.title") }} />
//       <Stack.Screen name="TrackedContactDetail" component={TrackedContactDetailScreen}
//         options={({ route }) => ({ title: (route.params as any)?.label ?? t("contacts.detailTitle") })} />
//       <Stack.Screen name="ContactForm" component={ContactFormScreen}
//         options={({ route }) => ({ title: (route.params as any)?.id ? t("contacts.editTitle") : t("contacts.addTitle") })} />
//     </Stack.Navigator>
//   );
// }