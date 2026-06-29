//  the gate: token present → tabs, no token → auth stack. The single switch that decides what the user sees, driven by the session store.


import { useSession } from "../store/useSession";
import TabNavigator from "./TabNavigator";
import AuthStack from "./AuthStack";

export default function RootNavigator() {
  const accessToken = useSession((s) => s.accessToken);
  return accessToken ? <TabNavigator /> : <AuthStack />;
}