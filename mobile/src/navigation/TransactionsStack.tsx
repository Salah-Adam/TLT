// Wraps the Transactions tab in a native-stack so the list can push a detail screen.
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { colors } from "../theme";
import TransactionsScreen from "../screens/TransactionsScreen";
import TransactionDetailScreen from "../screens/TransactionDetailScreen";

export type TransactionsStackParamList = {
  TxList: undefined;
  TxDetail: { id: string };
};

const Stack = createNativeStackNavigator<TransactionsStackParamList>();

export default function TransactionsStack() {
  const { t } = useTranslation();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { color: colors.text },
        headerTintColor: colors.primary,
      }}
    >
      <Stack.Screen name="TxList" component={TransactionsScreen} options={{ title: t("tabs.transactions") }} />
      <Stack.Screen name="TxDetail" component={TransactionDetailScreen} options={{ title: t("tx.detailTitle") }} />
    </Stack.Navigator>
  );
}