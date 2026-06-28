// import { ScreenPlaceholder } from "../components/ScreenPlaceholder";
// export default function NotificationsScreen() {
//   return <ScreenPlaceholder title="Ogeysiis" />;
// }


import { useTranslation } from "react-i18next";
import { ScreenPlaceholder } from "../components/ScreenPlaceholder";
export default function NotificationsScreen() {
  const { t } = useTranslation();
  return <ScreenPlaceholder title={t("tabs.notifications")} />;
}