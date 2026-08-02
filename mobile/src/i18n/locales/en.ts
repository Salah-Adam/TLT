//  Every user-facing string lives here keyed by name (tabs.home), and we grow them as we build each screen.


export default {
  tabs: { home: "Home", transactions: "Transactions", analytics: "Analytics", notifications: "Notifications" },
  common: { comingSoon: "Coming soon",
    loadFailed: "Couldn't load", retry: "Retry",
   },
  auth: {
    loginTitle: "Welcome back", tagline: "Track every shilling, in your language.",
    createAccount: "Create account", haveAccount: "I already have an account",
    registerTitle: "Create your account", fullName: "Full name", phone: "Phone number",
    numberHint: "Number", password: "Password", language: "Language", registerBtn: "Continue",
    otpTitle: "Enter the code", otpSent: "We sent a 6-digit code to", otp: "Verification code", verifyBtn: "Verify",
    loginBtn: "Log in", errorTitle: "Error", logout: "Log out",
    invalidCredentials: "Phone number or password is incorrect.",
    genericError: "Something went wrong. Please try again.",
    rateLimited: "Too many attempts. Please wait a moment and try again.",

    resendCode: "Resend code",
    resendIn: "Resend code in {{time}}",
    codeResent: "A new code was sent.",

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

    menuTitle: "Menu", menuAlerts: "Spending alerts",
  },

  tx: {
    detailTitle: "Transaction",
    searchPlaceholder: "Search name or number",
    all: "All", in: "In", out: "Out",
    date: "Date", date_all: "All time", date_today: "Today", date_week: "Last 7 days", date_month: "This month",
    today: "Today", yesterday: "Yesterday",
    empty: "No transactions found",
    received: "Money received", spent: "Money spent",
    // counterparty: "From / To", notAvailable: "Not available",
    receivedFrom: "Received from", sentTo: "Sent to", notAvailable: "Not available",
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

    yourNumber: "Your number",

    emptyHint: "Your transactions will show up here once your SMS are synced.",
  },


  notif: {
    all: "All", unread: "Unread", markAll: "Mark all read",
    empty: "No notifications yet", emptyUnread: "No unread notifications",
    delete: "Delete", deleteTitle: "Delete notification?", deleteBody: "This removes it from your list.",
    offlineDelete: "Connect to the internet to delete.",

    group_transactions: "Transactions", group_alerts: "Alerts", group_summaries: "Summaries", group_reports: "Reports", group_account: "Account",

    emptyHint: "You'll see transactions, alerts, summaries, and reports here.",
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

    weekly: "Weekly",

    legendIn: "Received",
    legendOut:  "Sent",
    amountAxis:  "Amount",
    trendTitleWeek: "This week's trend",
    trendTitleMonth: "This month's trend",
    leadDaily:  "Today",
    leadWeekly: "This week",
    leadMonthly: "This month",
    sumSentencePos: "{lead}, you received {in}, sent {out}, and kept {net} across {count} transactions.",
    sumSentenceNeg: "{lead}, you spent {deficit} more than you received — sent {out}, received {in}, across {count} transactions.",
    trendLine:"{label}: received {in}, sent {out}.",

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
    catLine: "You spent {amount} on {category} ({pct}% of your expenses)",
    senderLine: "{who} sent you {amount} ({count}×)",
    recipientLine: "You sent {amount} to {who} ({count}×)",
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

    uncatLine: "{amount} of your spending is uncategorized ({pct}%).",


    hlSpendMore: "You spent {delta} more than {when} ({prev}).",
    hlSpendLess: "You spent {delta} less than {when} ({prev}).",
    hlSpendSame: "You spent the same as {when} ({prev}).",



  },

  contacts: {
    title: "Tracked people", detailTitle: "Contact", addTitle: "Add contact", editTitle: "Edit contact",
    empty: "You're not tracking anyone yet", emptyHint: "Track a person to see your all-time totals with them.",
    addContact: "Add contact", edit: "Edit",
    label: "Name / label", labelPlaceholder: "e.g. Supplier Xasan",
    direction: "What to track", dir_both: "Both", dir_sent: "Sent", dir_received: "Received",
    numbers: "Phone numbers", addNumber: "Add number", numberPlaceholder: "Number", removeNumber: "Remove", removeNumberTitle: "Remove this number?",
    net: "Net", txnShort: "Txns", timeline: "History",
    summary: "Sent {{sent}} · Received {{received}} · {{count}} transactions",
    lastActivity: "Last activity {{date}}", noActivity: "No activity yet",
    save: "Save", cancel: "Cancel",
    delete: "Delete contact", deleteConfirmTitle: "Delete contact?",
    deleteConfirmBody: "This stops tracking them. Your transactions are not affected.",
    offlineAction: "Connect to the internet to do this.",
    invalidNumber: "Enter a valid Somali number.", needNumber: "Add at least one number.", needLabel: "Enter a name or label.",

    allNumbers: "All numbers",

    filterNumber: "Filter by number", numbersWord: "numbers",
  },


  alerts: {
    title: "Spending alerts", addTitle: "New alert", editTitle: "Edit alert",
    empty: "No spending alerts yet", emptyHint: "Set a budget for a category and get warned before you overspend.",
    addAlert: "New alert",
    category: "Category", pickCategory: "Choose a category",
    limit: "Limit amount", period: "Period", weekly: "Weekly", monthly: "Monthly",
    threshold: "Warn me at ($)", sim: "SIM (optional)", allSims: "All SIMs",
    progress: "{{spent}} of {{limit}} {{period}}", periodWeek: "this week", periodMonth: "this month",
    percentUsed: "{{percent}}% used", over: "Over by {{amount}}",
    save: "Save", create: "Create alert", cancel: "Cancel",
    delete: "Delete alert", deleteTitle: "Delete alert?", deleteBody: "You'll stop getting warnings for this budget.",
    offlineAction: "Connect to the internet to do this.",
    needCategory: "Choose a category.", needLimit: "Enter a limit greater than 0.", badThreshold: "Warn % must be between 1 and 100.",
    duplicate: "You already have an alert for this category and period.",
    lockedHint: "Category, period and SIM can't be changed. Delete and create a new alert to change them.",
  },

  settings: {
    title: "Settings", account: "Account", preferences: "Preferences", about: "About",
    profile: "Profile", changePassword: "Change password", language: "Language",
    fullName: "Full name", email: "Email", emailOptional: "Email (optional)",
    age: "Age", city: "City", cityOptional: "City (optional)",
    sex: "Sex", male: "Male", female: "Female", sexNone: "—",
    phone: "Primary Phone number", memberSince: "Member since", save: "Save",
    nameShort: "Name must be at least 2 characters.", ageBad: "Age must be between 10 and 100.", emailTaken: "That email is already in use.",
    currentPassword: "Current password", newPassword: "New password", confirmPassword: "Confirm new password",
    pwShort: "Password must be at least 4 characters.", pwMismatch: "The new passwords don't match.",
    pwSame: "New password must be different from previous one.", pwWrong: "Your current password is incorrect.",
    pwChangedTitle: "Password changed", pwChangedBody: "Your password has been updated.",
    logout: "Log out", logoutTitle: "Log out?", logoutBody: "You'll need to sign in again to use the app.", cancel: "Cancel",
  },

  phones: {
    title: "Phone numbers", manage: "Manage", empty: "No numbers yet", primary: "Primary", addedOn: "Added {{date}}",
    addTitle: "Add a number",
    displayName: "Name (optional)", classification: "Type", individual: "Individual", business: "Business",
    sendCode: "Send code", verify: "Verify", code: "Verification code", codeSentTo: "We sent a 6-digit code to", changeNumber: "Change number",
    delete: "Remove", deleteTitle: "Remove this number?", deleteBody: "You'll stop receiving notifications for this number.",
    deleteLastTitle: "Remove your only number?", deleteLastBody: "This is your last number — removing it deletes your account and all its data. This can't be undone.",
    accountDeletedTitle: "Account deleted", accountDeletedBody: "Your account has been deleted.",
    ownedTitle: "Number in use", ownedBody: "This number is registered to another account. Reclaim it into yours?", reclaim: "Reclaim",
    alreadyAdded: "You've already added this number.", unsupported: "That number's prefix isn't supported.",
    offlineAction: "Connect to the internet to do this.", needNumber: "Enter a valid Somali number.", needCode: "Enter the 6-digit code.",

    continue: "Continue",
    deleteAccountTitle: "Delete your account?",
    deleteAccountBody: "Are you really sure? Your account and all your data will be permanently deleted and can't be recovered.",
    deleteAccount: "Delete account",
  },

  recover: {
    link: "Recover your account", title: "Recover your account",
    subtitle: "Enter your number and we'll send a code to restore your account and its data.",
    number: "Phone number", sendCode: "Send code",
    code: "Verification code", newPassword: "New password", confirmPassword: "Confirm new password",
    recoverBtn: "Recover account", changeNumber: "Change number",
    codeSentTo: "We sent a 6-digit code to",
    noAccount: "No recoverable account for this number. You can register instead.",
    pwShort: "Password must be at least 4 characters.", pwMismatch: "The passwords don't match.",
    needNumber: "Enter a valid Somali number.", needCode: "Enter the 6-digit code.",
  },

  onboarding: {
    skip: "Skip", next: "Next", start: "Get started", gotIt: "Got it",
    s1Title: "Your ledger, automatically",
    s1Body: "Every payment you send or receive becomes a clear record here — no typing, no receipts.",
    s2Title: "Understand your money",
    s2Body: "See where your money goes with simple summaries, categories, and reports.",
    s3Title: "Stay in control",
    s3Body: "Set spending alerts and keep an eye on the people you pay most — in Somali or English.",
    s4Title: "Every provider",
    s4Body:  "Use the numbers you own across every telecom in the country.",
    tipHome: "Tap here for Settings, Spending alerts, and Tracked contacts.",
    tipTx: "Tap any transaction to categorize it or add a note.",
    tipAnalytics: "Switch between daily, weekly, and monthly here — then open a full report for the details.",

    tipAnalyticsCycle: "Tap the cycle icon (↻) on the right to change how a report is shown — chart or plain words.",


   

  },

  deleted: {
    title: "Recently deleted transactions",
    empty: "Nothing deleted",
    emptyHint: "Deleted transactions can be restored here within 30 days.",
    restore: "Restore",
    autoDeletes: "Deletes in {{days}}d",
    offlineTitle: "You're offline",
    offlineHint: "Connect to the internet to view and restore deleted transactions.",
  },

  alertDetail: {
    transactions: "Transactions",
    fullPeriod: "Full period",
    empty: "No transactions in this range.",
  },

  about:{
    tagline:"Understand where your money goes." ,
    p1: "TLT automatically turns your mobile-money messages into a clear record of every transaction across all your SIMs.",
    p2: "See reports, set spending alerts, and track contacts — online or offline.",
    p3: "Your data is encrypted on your device and on our servers.",
  },
};
