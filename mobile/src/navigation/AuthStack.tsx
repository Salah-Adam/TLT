// the stack of unauthenticated screens


import { createNativeStackNavigator } from "@react-navigation/native-stack";
import WelcomeScreen from "../screens/auth/WelcomeScreen";
import LoginScreen from "../screens/auth/LoginScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";
import OtpScreen from "../screens/auth/OtpScreen";
import ForgotPasswordScreen from "../screens/auth/ForgotPasswordScreen";
import ResetPasswordScreen from "../screens/auth/ResetPasswordScreen";
import RecoverScreen from "../screens/auth/RecoverScreen";

export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  // Otp: { phoneNumber: string; purpose?: "register" | "reclaim" };
  Otp: { phoneNumber: string; purpose?: "register" | "reclaim"; fullName?: string; password?: string; language?: "en" | "so" };
  Forgot: undefined;
  Reset: { phoneNumber: string };
  Recover: { phoneNumber?: string } | undefined;
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

      <Stack.Screen name="Recover" component={RecoverScreen} />
    </Stack.Navigator>


  );
}
