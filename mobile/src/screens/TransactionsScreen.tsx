// import { ScreenPlaceholder } from "../components/ScreenPlaceholder";
// export default function TransactionsScreen() {
//   return <ScreenPlaceholder title="Dhaqdhaqaaq" />;
// }


import { useTranslation } from "react-i18next";
import { ScreenPlaceholder } from "../components/ScreenPlaceholder";
export default function TransactionsScreen() {
  const { t } = useTranslation();
  return <ScreenPlaceholder title={t("tabs.transactions")} />;
}