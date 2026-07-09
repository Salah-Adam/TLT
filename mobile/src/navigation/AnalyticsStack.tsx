import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { colors } from "../theme";
import AnalyticsScreen from "../screens/AnalyticsScreen";
import ReportScreen from "../screens/ReportScreen";

export type AnalyticsStackParamList = {
  AnalyticsMain: undefined;
  Report: { period: "daily" | "weekly" | "monthly"; date?: string; start?: string; year?: number; month?: number };
};

const Stack = createNativeStackNavigator<AnalyticsStackParamList>();

export default function AnalyticsStack() {
  const { t } = useTranslation();
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: colors.surface }, headerTitleStyle: { color: colors.text }, headerTintColor: colors.primary }}>
      <Stack.Screen name="AnalyticsMain" component={AnalyticsScreen} options={{ title: t("tabs.analytics") }} />
      <Stack.Screen name="Report" component={ReportScreen} options={{ title: t("report.title") }} />
    </Stack.Navigator>
  );
}