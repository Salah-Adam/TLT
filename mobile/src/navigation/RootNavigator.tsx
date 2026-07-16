//  the gate: token present → app stack (tabs + ⋮ destinations), no token → auth stack.

// import { useSession } from "../store/useSession";
// import AppStack from "./AppStack";
// import AuthStack from "./AuthStack";

// export default function RootNavigator() {
//   const accessToken = useSession((s) => s.accessToken);
//   return accessToken ? <AppStack /> : <AuthStack />;
// }

import { useEffect, useState } from "react";
import { useSession } from "../store/useSession";
import AppStack from "./AppStack";
import AuthStack from "./AuthStack";
import { OnboardingIntro } from "../components/OnboardingIntro";
import { hasSeen } from "../onboarding";

export default function RootNavigator() {
  const accessToken = useSession((s) => s.accessToken);
  const [showIntro, setShowIntro] = useState(false);
  useEffect(() => { hasSeen("intro").then((seen) => setShowIntro(!seen)); }, []);
  return (
    <>
      {accessToken ? <AppStack /> : <AuthStack />}
      {showIntro ? <OnboardingIntro onDone={() => setShowIntro(false)} /> : null}
    </>
  );
}