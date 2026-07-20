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
import SettingsScreen from "../screens/SettingsScreen";
import ProfileScreen from "../screens/ProfileScreen";
import ChangePasswordScreen from "../screens/ChangePasswordScreen";
import PhoneNumbersScreen from "../screens/PhoneNumbersScreen";
import AddPhoneNumberScreen from "../screens/AddPhoneNumberScreen";

// import { useEffect, useState } from "react";
// import { OnboardingIntro } from "../components/OnboardingIntro";
// import { hasSeen } from "../onboarding";
import DeletedTransactionsScreen from "../screens/DeletedTransactionsScreen";
import SpendingAlertDetailScreen from "../screens/SpendingAlertDetailScreen";

export type AppStackParamList = {
  Tabs: undefined;
  TrackedContacts: undefined;
  TrackedContactDetail: { id: string; label?: string };
  ContactForm: { id?: string } | undefined;
  SpendingAlerts: undefined;
  SpendingAlertDetail: { alert: any };
  AlertForm: { alert?: any } | undefined;
  Settings: undefined;
  Profile: undefined;
  ChangePassword: undefined;
  PhoneNumbers: undefined;
  AddPhoneNumber: undefined;
  DeletedTransactions: undefined;
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
      <Stack.Screen name="SpendingAlertDetail" component={SpendingAlertDetailScreen} options={{ title: t("alerts.title") }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: t("settings.title") }} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: t("settings.profile") }} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ title: t("settings.changePassword") }} />
      <Stack.Screen name="PhoneNumbers" component={PhoneNumbersScreen} options={{ title: t("phones.title") }} />
      <Stack.Screen name="AddPhoneNumber" component={AddPhoneNumberScreen} options={{ title: t("phones.addTitle") }} />
      <Stack.Screen name="DeletedTransactions" component={DeletedTransactionsScreen} options={{ title: t("deleted.title") }} />
    </Stack.Navigator>
  );
}


// -- this relates to showing the intro carousel after login

// export default function AppStack() {
//   const { t } = useTranslation();
//   const [showIntro, setShowIntro] = useState(false);
//   useEffect(() => { hasSeen("intro").then((seen) => setShowIntro(!seen)); }, []);
//   return (
//     <>
//       <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: colors.surface }, headerTitleStyle: { color: colors.text }, headerTintColor: colors.primary }}>
//         <Stack.Screen name="Tabs" component={TabNavigator} options={{ headerShown: false }} />
//         <Stack.Screen name="TrackedContacts" component={TrackedContactsScreen} options={{ title: t("contacts.title") }} />
//         <Stack.Screen name="TrackedContactDetail" component={TrackedContactDetailScreen}
//         options={({ route }) => ({ title: (route.params as any)?.label ?? t("contacts.detailTitle") })} />
//         <Stack.Screen name="ContactForm" component={ContactFormScreen}
//           options={({ route }) => ({ title: (route.params as any)?.id ? t("contacts.editTitle") : t("contacts.addTitle") })} />
//         <Stack.Screen name="SpendingAlerts" component={SpendingAlertsScreen} options={{ title: t("alerts.title") }} />
//         <Stack.Screen name="AlertForm" component={AlertFormScreen}
//           options={({ route }) => ({ title: (route.params as any)?.alert ? t("alerts.editTitle") : t("alerts.addTitle") })} />
//         <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: t("settings.title") }} />
//         <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: t("settings.profile") }} />
//         <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ title: t("settings.changePassword") }} />
//         <Stack.Screen name="PhoneNumbers" component={PhoneNumbersScreen} options={{ title: t("phones.title") }} />
//         {/* …every other Stack.Screen you already have, unchanged… */}
//         <Stack.Screen name="AddPhoneNumber" component={AddPhoneNumberScreen} options={{ title: t("phones.addTitle") }} />
//       </Stack.Navigator>
//       {showIntro ? <OnboardingIntro onDone={() => setShowIntro(false)} /> : null}
//     </>
//   );
// }


// -----------------

// import { createNativeStackNavigator } from "@react-navigation/native-stack";
// import { useTranslation } from "react-i18next";
// import { colors } from "../theme";
// import TabNavigator from "./TabNavigator";
// import TrackedContactsScreen from "../screens/TrackedContactsScreen";
// import TrackedContactDetailScreen from "../screens/TrackedContactDetailScreen";
// import ContactFormScreen from "../screens/ContactFormScreen";
// import SpendingAlertsScreen from "../screens/SpendingAlertsScreen";
// import AlertFormScreen from "../screens/AlertFormScreen";
// import SettingsScreen from "../screens/SettingsScreen";
// import ProfileScreen from "../screens/ProfileScreen";
// import ChangePasswordScreen from "../screens/ChangePasswordScreen";

// export type AppStackParamList = {
//   Tabs: undefined;
//   TrackedContacts: undefined;
//   TrackedContactDetail: { id: string; label?: string };
//   ContactForm: { id?: string } | undefined;
//   SpendingAlerts: undefined;
//   AlertForm: { alert?: any } | undefined;
//   Settings: undefined;
//   Profile: undefined;
//   ChangePassword: undefined;
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
//       <Stack.Screen name="SpendingAlerts" component={SpendingAlertsScreen} options={{ title: t("alerts.title") }} />
//       <Stack.Screen name="AlertForm" component={AlertFormScreen}
//         options={({ route }) => ({ title: (route.params as any)?.alert ? t("alerts.editTitle") : t("alerts.addTitle") })} />
//       <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: t("settings.title") }} />
//       <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: t("settings.profile") }} />
//       <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ title: t("settings.changePassword") }} />
//     </Stack.Navigator>
//   );
// }
