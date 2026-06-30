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

  home: {
    greeting: "Hello", balance: "Your estimated balance",
    todayReceived: "Received today", todaySpent: "Spent today",
    monthTitle: "This month", kept: "You kept", moneyIn: "Money in", moneyOut: "Money out",
    question: "The question", questionSub: "Where most of your money went",
    recent: "Recent activity", seeAll: "See all", empty: "No transactions yet", lastSynced: "Last synced",
  },

  tx: {
    detailTitle: "Transaction",
    searchPlaceholder: "Search name or number",
    all: "All", in: "In", out: "Out",
    date: "Date", date_all: "All time", date_today: "Today", date_week: "Last 7 days", date_month: "This month",
    today: "Today", yesterday: "Yesterday",
    empty: "No transactions found",
    received: "Money received", spent: "Money spent",
    counterparty: "From / To", notAvailable: "Not available",
    category: "Category", uncategorized: "Uncategorized", autoTag: "Auto", pickCategory: "Choose a category",
    note: "Note", addNote: "Add a note",
    type: "Type", provider: "Provider", balanceAfter: "Balance after", charge: "Service charge",
    dateTime: "Date & time", reference: "Reference",
    changeCategory: "Category", editNote: "Note", delete: "Delete",
    deleteConfirmTitle: "Delete transaction?",
    deleteConfirmBody: "It will be hidden from your activity. This won't change your balances.",
    cancel: "Cancel", save: "Save",
    offlineAction: "Connect to the internet to do this.",

    colTransaction: "Transaction", colCategory: "Category", colAmount: "Amount", colBalance: "Balance",
    net: "net", allSims: "All SIMs", sims: "SIMs", filterSim: "Filter by SIM",
    pickDates: "Or pick exact dates", apply: "Apply",
  },
};

// export default {
//   tabs: { home: "Home", transactions: "Transactions", analytics: "Analytics", notifications: "Notifications" },
//   common: { comingSoon: "Coming soon" },
//   auth: { loginTitle: "Welcome back", phone: "Phone number", numberHint: "Number", password: "Password", loginBtn: "Log in", errorTitle: "Error", logout: "Log out" },
// };