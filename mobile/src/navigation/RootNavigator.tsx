//  the gate: token present → app stack (tabs + ⋮ destinations), no token → auth stack.

import { useSession } from "../store/useSession";
import AppStack from "./AppStack";
import AuthStack from "./AuthStack";

export default function RootNavigator() {
  const accessToken = useSession((s) => s.accessToken);
  return accessToken ? <AppStack /> : <AuthStack />;
}


// import { useSession } from "../store/useSession";
// import TabNavigator from "./TabNavigator";
// import AuthStack from "./AuthStack";

// export default function RootNavigator() {
//   const accessToken = useSession((s) => s.accessToken);
//   return accessToken ? <TabNavigator /> : <AuthStack />;
// }