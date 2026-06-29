//  Every user-facing string lives here keyed by name (tabs.home), and we grow them as we build each screen.


export default {
  tabs: { home: "Home", transactions: "Transactions", analytics: "Analytics", notifications: "Notifications" },
  common: { comingSoon: "Coming soon" },
  auth: {
    loginTitle: "Welcome back", tagline: "Track every shilling, in your language.",
    createAccount: "Create account", haveAccount: "I already have an account",
    registerTitle: "Create your account", fullName: "Full name", phone: "Phone number",
    numberHint: "Number", password: "Password", language: "Language", registerBtn: "Continue",
    otpTitle: "Enter the code", otpSent: "We sent a 6-digit code to", otp: "Verification code", verifyBtn: "Verify",
    loginBtn: "Log in", errorTitle: "Error", logout: "Log out",
    invalidCredentials: "Phone number or password is incorrect.",
    genericError: "Something went wrong. Please try again.",

    forgotLink: "Forgot password?",
    forgotTitle: "Reset your password",
    forgotSub: "If your number exists, we`ll send a verification code",
    sendCodeBtn: "Send code",
    resetTitle: "New password",
    resetSub: "Enter the code we sent and your new password.",
    newPassword: "New password",
    resetBtn: "Reset password",

    reclaimBtn: "Reclaim this number",

    // notRegistered: "This number isn't registered."
  },
  validation: {
    name: "Name must be at least 2 characters.",
    phone: "The phone number is incorrect.",
    password: "Password must be at least 4 characters.",
    otp: "Enter the 6-digit code.",
  },

  offline: { banner: "Viewing saved data · last synced" },
};

// export default {
//   tabs: { home: "Home", transactions: "Transactions", analytics: "Analytics", notifications: "Notifications" },
//   common: { comingSoon: "Coming soon" },
//   auth: { loginTitle: "Welcome back", phone: "Phone number", numberHint: "Number", password: "Password", loginBtn: "Log in", errorTitle: "Error", logout: "Log out" },
// };