// the stack of unauthenticated screens


import { createNativeStackNavigator } from "@react-navigation/native-stack";
import WelcomeScreen from "../screens/auth/WelcomeScreen";
import LoginScreen from "../screens/auth/LoginScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";
import OtpScreen from "../screens/auth/OtpScreen";
import ForgotPasswordScreen from "../screens/auth/ForgotPasswordScreen";
import ResetPasswordScreen from "../screens/auth/ResetPasswordScreen";

export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  // Otp: { phoneNumber: string };
  Otp: { phoneNumber: string; purpose?: "register" | "reclaim" };
  Forgot: undefined;
  Reset: { phoneNumber: string };
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="Otp" component={OtpScreen} />
      <Stack.Screen name="Forgot" component={ForgotPasswordScreen} />
      <Stack.Screen name="Reset" component={ResetPasswordScreen} />
    </Stack.Navigator>
  );
}


// import { createNativeStackNavigator } from "@react-navigation/native-stack";
// import WelcomeScreen from "../screens/auth/WelcomeScreen";
// import LoginScreen from "../screens/auth/LoginScreen";
// import RegisterScreen from "../screens/auth/RegisterScreen";
// import OtpScreen from "../screens/auth/OtpScreen";

// export type AuthStackParamList = {
//   Welcome: undefined;
//   Login: undefined;
//   Register: undefined;
//   Otp: { phoneNumber: string };
// };

// const Stack = createNativeStackNavigator<AuthStackParamList>();

// export default function AuthStack() {
//   return (
//     <Stack.Navigator screenOptions={{ headerShown: false }}>
//       <Stack.Screen name="Welcome" component={WelcomeScreen} />
//       <Stack.Screen name="Login" component={LoginScreen} />
//       <Stack.Screen name="Register" component={RegisterScreen} />
//       <Stack.Screen name="Otp" component={OtpScreen} />
//     </Stack.Navigator>
//   );
// }

