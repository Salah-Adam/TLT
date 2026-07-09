//  Every user-facing string lives here keyed by name (tabs.home), and we grow them as we build each screen.


export default {
  tabs: { home: "Guriga", transactions: "Dhaqdhaqaaq", analytics: "Falanqayn", notifications: "Ogeysiis" },
  common: { comingSoon: "Dhowaan" },
  auth: {
    loginTitle: "Ku soo dhowow", tagline: "La soco shilin kasta, luqaddaada.",
    createAccount: "Samee akoon", haveAccount: "Akoon ayaan hore u leeyahay",
    registerTitle: "Samee akoonkaaga", fullName: "Magaca oo dhan", phone: "Lambarka taleefanka",
    numberHint: "Lambarka", password: "Furaha sirta ah", language: "Luqadda", registerBtn: "Sii wad",
    otpTitle: "Geli koodhka", otpSent: "Waxaan u dirnay koodh 6-god ah", otp: "Koodhka xaqiijinta", verifyBtn: "Xaqiiji",
    loginBtn: "Gal", errorTitle: "Khalad", logout: "Ka bax",
    invalidCredentials: "Lambarka ama furaha sirta ah waa khalad.",
    genericError: "Wax baa qaldamay. Fadlan isku day mar kale.",

    forgotLink: "Furaha sirta ma illowday?",
    forgotTitle: "Dib u deji furahaaga",
    forgotSub: "Hadii lambarkaaga uu diiwaangashan yahay, waxaan kuu soo diri doonnaa koodh.",
    sendCodeBtn: "Dir koodhka",
    resetTitle: "Furaha cusub",
    resetSub: "Geli koodhka aan kuu dirnay iyo furahaaga cusub.",
    newPassword: "Furaha cusub",
    resetBtn: "Dib u deji furaha",

    reclaimBtn: "Dib u qaado lambarkan",

    notRegistered: "Lambarkani lama diiwaan gelin."
  },  
  validation: {
    name: "Magaca waa inuu ugu yaraan laba xaraf ahaado.",
    phone: "Lambarka taleefanku waa khalad.",
    password: "Furaha sirta ah waa inuu ugu yaraan afar xaraf ahaado.",
    otp: "Geli koodhka 6-god ah.",
  },

  offline: { banner: "Xog la keydiyay · markii ugu dambeysay" },

  home: {
    greeting: "Salaan", balance: "Haraagaaga la qiyaasay waa",
    todayReceived: "Maanta la helay", todaySpent: "Maanta la bixiyay",
    monthTitle: "Bishaan", kept: "Waxaa kuu hartay", moneyIn: "Lacagta ku soo gashey", moneyOut: "Lacagta baxday",
    // question: "Su'aasha", questionSub: "Meesha ugu badan lacagtaada ku baxday",
    question: "Meesha ugu badan lacagtaada ku baxday bishan",

    recent: "Dhaqdhaqaaqii ugu dambeeyey", seeAll: "Arag Dhammaan", empty: "Wax dhaqdhaqaaq ah weli ma jiraan", lastSynced: "La cusbooneysiiyay",
  },


  tx: {
    detailTitle: "Dhaqdhaqaaq",
    searchPlaceholder: "Raadi magac ama lambar",
    all: "Dhammaan", in: "Soo gashay", out: "Baxday",
    date: "Taariikh", date_all: "Waqti kasta", date_today: "Maanta", date_week: "7-dii maalmood", date_month: "Bishaan",
    today: "Maanta", yesterday: "Shalay",
    empty: "Wax dhaqdhaqaaq ah lama helin",
    received: "Lacag soo gashay", spent: "Lacag baxday",
    counterparty: "Cidda", notAvailable: "Lama hayo",
    category: "Nooca", uncategorized: "Aan la kala saarin", autoTag: "Otomaatig", pickCategory: "Dooro nooca",
    note: "Faallo", addNote: "Ku dar faallo",
    type: "Nuuca", provider: "Shabakada", balanceAfter: "Haraaga kadib", charge: "Khidmada",
    dateTime: "Taariikh & waqti", reference: "Tixraac",
    changeCategory: "Nooca", editNote: "Faallo", delete: "Tirtir",
    deleteConfirmTitle: "Tirtir dhaqdhaqaaqa?",
    deleteConfirmBody: "Waxaa laga qarin doonaa dhaqdhaqaaqaaga. Tani ma beddesho haraagaaga.",
    cancel: "Jooji", save: "Keydi",
    offlineAction: "Ku xidh internetka si aad tan u samayso.",

    colTransaction: "Dhaqdhaqaaq", colCategory: "Nooca", colAmount: "Qiimaha", colBalance: "Haraaga",
    net: "saafi", allSims: "Dhammaan SIM-yada", sims: "SIM", filterSim: "Shaandhee SIM",
    pickDates: "Ama dooro taariikho gaar ah", apply: "Dabbaq",

    unknownParty: "qof aan la aqoon",
    msgIn: "{amount} ayaad ka heshay {who}, haraagaaga waa {balance}",
    msgInNoBal: "{amount} ayaad ka heshay {who}",
    msgOut: "{amount} ayaad wareejisay {who}, haraagaaga waa {balance}",
    msgOutNoBal: "{amount} ayaad wareejisay {who}",
  },


  notif: {
    all: "Dhammaan", unread: "Aan la akhrin", markAll: "Calaamadee dhammaan",
    empty: "Weli ogeysiis ma jiro", emptyUnread: "Ma jiro mid aan la akhrin",
    delete: "Tirtir", deleteTitle: "Tirtir ogeysiiska?", deleteBody: "Tan waxay ka saartaa liiskaaga.",
    offlineDelete: "Ku xidh internetka si aad u tirtirto.",

    group_transactions: "Dhaqdhaqaaq", group_alerts: "Digniino", group_summaries: "Soo koobid", group_reports: "Warbixino", group_account: "Akoonka",
  },

  analytics: {
    daily: "Maalinle", monthly: "Bille",
    received: "La helay", spent: "La bixiyay", kept: "Waxaa kuu hartay", overspent: "Waxaad dhaaftay",
    txns: "dhaqdhaqaaq",
    whereTitle: "Meesha lacagtaadu ku baxday", noSpending: "Kharash lama hayo muddadan",
    trendTitle: "Kharashka maalinlaha ah", highlights: "Waxyaabaha muhiimka ah",
    largestIn: "Lacagta ugu badan ee la helay: {{amount}}", largestOut: "Lacagta ugu badan ee la bixiyay: {{amount}}",
    busiestDay: "Maalinta ugu firfircoon: {{date}}", busiestHour: "Saacadda ugu firfircoon: {{hour}}:00",
    empty: "Dhaqdhaqaaq lama hayo muddadan",
    spendDiary: "{month} {day}, waxaad bixisey {amount}",
    viewReport: "Arag warbixinta buuxda",

    weekly: "Usbuucle"
  },

  report: {
    title: "Warbixin",
    daily: "Warbixinta maalinlaha", weekly: "Warbixinta usbuuca", monthly: "Warbixinta bisha",
    kept: "Waxaa kuu hartay", overspent: "Waxaad dhaaftay", received: "La helay", spent: "La bixiyay",
    insightsTitle: "Waxa dhacay", whereTitle: "Meesha lacagtaadu ku baxday",
    txns: "dhaqdhaqaaq", empty: "Xog lama hayo muddadan",

    whatHappened: "Waxa dhacay",
    grpCategory: "Meesha lacagtaadu ku baxday", grpSenders: "Cidda lacagta kuu soo dirtay", grpRecipients: "Cidda aad lacagta u dirtay",
    grpBiggestIn: "Lacagta ugu badan ee soo gashay", grpBiggestOut: "Lacagta ugu badan ee baxday", grpDaily: "Kharashka maalinlaha",
    catLine: "Waxaad ku bixisay {amount} {category} ({pct}%)",
    senderLine: "{who} wuxuu kuu soo diray {amount} ({count} jeer)",
    recipientLine: "Waxaad u dirtay {who} {amount} ({count} jeer)",
    biggestIn: "{amount} laga helay {who}",
    biggestOut: "{amount} loo diray {who}",


    highlights: "Waxyaabaha muhiimka ah",
    hlAhead: "Waxaad kaydsatay {{amount}}",
    hlBehind: "Waxaad dhaaftay {{amount}}",
    // hlSpendUp: "Waxaad bixisay {{pct}}% ka badan xilligii hore",
    // hlSpendDown: "Waxaad bixisay {{pct}}% ka yar xilligii hore",
    hlBusiest: "Maalinta ugu firfircoon waxay ahayd {{date}} oo leh {{count}} dhaqdhaqaaq",
    hlBusiestNoCount: "Maalinta ugu firfircoon waxay ahayd {{date}}",
    hlBusiestHour: "Saacadda ugu firfircoon waxay ahayd {{hour}}:00",

    trend_daily: "Kharashka — 6-dii maalmood ee la soo dhaafay", trend_weekly: "Kharashka — 4-tii usbuuc ee la soo dhaafay", trend_monthly: "Kharashka — 6-dii bilood ee la soo dhaafay",
    prev_daily: "shalay", prev_weekly: "usbuucii hore", prev_monthly: "bishii hore",
    hlSpendUp: "Waxaad bixisay {{pct}}% ka badan {{prev}}",
    hlSpendDown: "Waxaad bixisay {{pct}}% ka yar {{prev}}",
  },

};



// export default {
//   tabs: { home: "Guriga", transactions: "Dhaqdhaqaaq", analytics: "Falanqayn", notifications: "Ogeysiis" },
//   common: { comingSoon: "Dhowaan" },
//   auth: { loginTitle: "Ku soo dhowow", phone: "Lambarka taleefanka", numberHint: "Lambarka", password: "Furaha sirta ah", loginBtn: "Gal", errorTitle: "Khalad", logout: "Ka bax" },
// };