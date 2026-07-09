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
    // question: "The question", questionSub: "Where most of your money went this month",
    question: "Where most of your money went this month",

    recent: "Recent activity", seeAll: "See all", empty: "No transactions yet", lastSynced: "Last synced",

    weekTitle: "This week", weekSpent: "You spent {{amount}} this week",
    weekUp: "{{pct}}% more than last week", weekDown: "{{pct}}% less than last week", weekSame: "About the same as last week",
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

    unknownParty: "unknown",
    msgIn: "You received {amount} from {who}, balance {balance}",
    msgInNoBal: "You received {amount} from {who}",
    msgOut: "You sent {amount} to {who}, balance {balance}",
    msgOutNoBal: "You sent {amount} to {who}",
  },


  notif: {
    all: "All", unread: "Unread", markAll: "Mark all read",
    empty: "No notifications yet", emptyUnread: "No unread notifications",
    delete: "Delete", deleteTitle: "Delete notification?", deleteBody: "This removes it from your list.",
    offlineDelete: "Connect to the internet to delete.",

    group_transactions: "Transactions", group_alerts: "Alerts", group_summaries: "Summaries", group_reports: "Reports", group_account: "Account",

  },

  analytics: {
    daily: "Daily", monthly: "Monthly",
    received: "Received", spent: "Spent", kept: "You kept", overspent: "You overspent",
    txns: "transactions",
    whereTitle: "Where your money went", noSpending: "No spending this period",
    trendTitle: "Daily spending", highlights: "Highlights",
    largestIn: "Largest received: {{amount}}", largestOut: "Largest spent: {{amount}}",
    busiestDay: "Busiest day: {{date}}", busiestHour: "Busiest hour: {{hour}}:00",
    empty: "No activity this period",
    spendDiary: "On {day} {month}, you spent {amount}",
    viewReport: "View full report",

    weekly: "Weekly"
  },

  report: {
    title: "Report",
    daily: "Daily report", weekly: "Weekly report", monthly: "Monthly report",
    kept: "You kept", overspent: "You overspent", received: "Received", spent: "Spent",
    insightsTitle: "What happened", whereTitle: "Where your money went",
    txns: "transactions", empty: "No data for this period",

    whatHappened: "What happened",
    grpCategory: "Where your money went", grpSenders: "Who sent you money", grpRecipients: "Who you sent money to",
    grpBiggestIn: "Biggest money in", grpBiggestOut: "Biggest money out", grpDaily: "Daily spending",
    catLine: "You spent {amount} on {category} ({pct}%)",
    senderLine: "{who} sent you {amount} ({count}×)",
    recipientLine: "You sent {who} {amount} ({count}×)",
    biggestIn: "{amount} from {who}",
    biggestOut: "{amount} to {who}",

    highlights: "Highlights",
    hlAhead: "You came out ahead by {{amount}}",
    hlBehind: "You went behind by {{amount}}",
    // hlSpendUp: "You spent {{pct}}% more than last period",
    // hlSpendDown: "You spent {{pct}}% less than last period",
    hlBusiest: "Your busiest day was {{date}} with {{count}} transactions",
    hlBusiestNoCount: "Your busiest day was {{date}}",
    hlBusiestHour: "Your busiest hour was {{hour}}:00",

    trend_daily: "Spending — last 6 days", trend_weekly: "Spending — last 4 weeks", trend_monthly: "Spending — last 6 months",
    prev_daily: "yesterday", prev_weekly: "last week", prev_monthly: "last month",
    hlSpendUp: "You spent {{pct}}% more than {{prev}}",
    hlSpendDown: "You spent {{pct}}% less than {{prev}}",

  },

};

// export default {
//   tabs: { home: "Home", transactions: "Transactions", analytics: "Analytics", notifications: "Notifications" },
//   common: { comingSoon: "Coming soon" },
//   auth: { loginTitle: "Welcome back", phone: "Phone number", numberHint: "Number", password: "Password", loginBtn: "Log in", errorTitle: "Error", logout: "Log out" },
// };