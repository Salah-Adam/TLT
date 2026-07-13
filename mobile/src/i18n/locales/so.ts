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

    weekTitle: "Isbuucan", weekSpent: "Isbuucaan waxaad bixisey {{amount}} ",
    weekUp: "{{pct}}% In kabadan isbuucii hore", weekDown: "{{pct}}% in ka yar isbuucii hore", weekSame: "in la mid ah isbuucii hore",


    menuTitle: "Menu", menuAlerts: "Digniinaha kharashka",
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

  contacts: {
    title: "Dadka la raadraaco", detailTitle: "Qofka", addTitle: "Ku dar qof", editTitle: "Wax ka beddel",
    empty: "Weli qofna ma raadraacaysid", emptyHint: "Raadraac qof si aad u aragto wadarta aad la leedahay.",
    addContact: "Ku dar qof", edit: "Wax ka beddel",
    label: "Magac / summad", labelPlaceholder: "tusaale: Hooyo, Iibiye Xasan",
    direction: "Waxa la raadraacayo", dir_both: "Labada", dir_sent: "La diray", dir_received: "La helay",
    numbers: "Lambarrada", addNumber: "Ku dar lambar", numberPlaceholder: "Lambar", removeNumber: "Ka saar", removeNumberTitle: "Ka saar lambarkan?",
    net: "Saafi", txnShort: "Dhaqdhaqaaq", timeline: "Taariikh",
    summary: "La diray {{sent}} · La helay {{received}} · {{count}} dhaqdhaqaaq",
    lastActivity: "Dhaqdhaqaaqii u dambeeyay {{date}}", noActivity: "Weli wax dhaqdhaqaaq ah ma jiro",
    save: "Keydi", cancel: "Jooji",
    delete: "Tirtir qofka", deleteConfirmTitle: "Tirtir qofka?",
    deleteConfirmBody: "Tani way joojinaysaa raadraaca. Dhaqdhaqaaqaaga wax dhib ah ma gaadho.",
    offlineAction: "Ku xidh internetka si aad tan u samayso.",
    invalidNumber: "Geli lambar Soomaali sax ah.", needNumber: "Ugu yaraan hal lambar ku dar.", needLabel: "Geli magac ama summad.",

    allNumbers: "Dhammaan lambarrada",

    filterNumber: "Shaandhee lambar", numbersWord: "lambar",
  },


  alerts: {
    title: "Digniinaha kharashka", addTitle: "Digniin cusub", editTitle: "Wax ka beddel digniinta",
    empty: "Weli digniin kharash ma jirto", emptyHint: "U dhig qadar nooc kasta, kahor intaadan xad-dhaafin.",
    addAlert: "Digniin cusub",
    category: "Nooca", pickCategory: "Dooro nooca",
    limit: "Xadka qadarka", period: "Muddada", weekly: "Toddobaadle", monthly: "Bishii",
    threshold: "Iga digo marka (%)", sim: "SIM (ikhtiyaari)", allSims: "Dhammaan SIM-yada",
    progress: "{{spent}} oo ka mid ah {{limit}} {{period}}", periodWeek: "todobaadkan", periodMonth: "bishaan",
    percentUsed: "{{percent}}% la isticmaalay", over: "Waxaad ka gudubtay {{amount}}",
    save: "Keydi", create: "Abuur digniin", cancel: "Jooji",
    delete: "Tirtir digniinta", deleteTitle: "Tirtir digniinta?", deleteBody: "Waad joojin doontaa digniinaha qadarkan.",
    offlineAction: "Ku xidh internetka si aad tan u samayso.",
    needCategory: "Dooro nooca.", needLimit: "Geli xad ka weyn 0.", badThreshold: "Boqolkiiba waa inuu u dhexeeyaa 1 iyo 100.",
    duplicate: "Horey ayaad u leedahay digniin noocan iyo muddadan.",
    lockedHint: "Nooca, muddada iyo SIM lama beddeli karo. Tirtir oo abuur mid cusub si aad u beddesho.",
  },


  settings: {
    title: "Mawduuca", account: "Akoonka", preferences: "Doorbidyada", about: "Ku saabsan",
    profile: "Astaanta", changePassword: "Beddel furaha", language: "Luqadda",
    fullName: "Magaca oo dhan", email: "Iimaylka", emailOptional: "Iimaylka (ikhtiyaari)",
    age: "Da'da", city: "Magaalada", cityOptional: "Magaalada (ikhtiyaari)",
    sex: "Jinsiga", male: "Lab", female: "Dhedig", sexNone: "—",
    phone: "Lambarka taleefanka", memberSince: "Xubin ilaa", save: "Keydi",
    nameShort: "Magacu waa inuu ugu yaraan 2 xaraf yahay.", ageBad: "Da'du waa inay u dhaxaysaa 10 iyo 100.", emailTaken: "Iimaylkaas horey ayaa loo isticmaalay.",
    currentPassword: "Furaha hadda", newPassword: "Furaha cusub", confirmPassword: "Xaqiiji furaha cusub",
    pwShort: "Furuhu waa inuu ugu yaraan 4 xaraf yahay.", pwMismatch: "Furayaasha cusub isma laha.",
    pwSame: "Furaha cusub waa inuu ka duwan yahay.", pwWrong: "Furahaaga hadda waa qalad.",
    pwChangedTitle: "Furaha waa la beddelay", pwChangedBody: "Furahaaga waa la cusboonaysiiyay.",
    logout: "Ka bax", logoutTitle: "Ka bax?", logoutBody: "Waxaad u baahan doontaa inaad mar kale gasho si aad u isticmaasho.", cancel: "Jooji",
  },


  phones: {
    title: "Lambarrada", manage: "Maamul", empty: "Weli lambar ma jiro", primary: "Aasaasi", addedOn: "La abuurey {{date}}",
    addTitle: "Ku dar lambar",
    displayName: "Magac (ikhtiyaari)", classification: "Nooca", individual: "Shakhsi", business: "Ganacsi",
    sendCode: "Dir koodka", verify: "Xaqiiji", code: "Koodka xaqiijinta", codeSentTo: "Waxaan kood 6-god ah u dirnay", changeNumber: "Beddel lambarka",
    delete: "Ka saar", deleteTitle: "Ka saar lambarkan?", deleteBody: "Waad joojin doontaa ogeysiisyada lambarkan.",
    deleteLastTitle: "Ka saar lambarkaaga kaliya?", deleteLastBody: "Kani waa lambarkaaga u dambeeya — ka saariddiisu waxay tirtiraysaa akoonkaaga iyo dhammaan xogtiisa. Dib looma soo celin karo.",
    accountDeletedTitle: "Akoonka waa la tirtiray", accountDeletedBody: "Akoonkaaga waa la tirtiray.",
    ownedTitle: "Lambar la isticmaalayo", ownedBody: "Lambarkan waxaa leh akoon kale. Ma dooneysaa inaad ku soo celiso kaaga?", reclaim: "Dib u qaado",
    alreadyAdded: "Horey ayaad u dartay lambarkan.", unsupported: "Horgalaha lambarkaas lama taageero.",
    offlineAction: "Ku xidh internetka si aad tan u samayso.", needNumber: "Geli lambar Soomaali sax ah.", needCode: "Geli koodka 6-god ah.",

    continue: "Sii wad",
    deleteAccountTitle: "Tirtir akoonkaaga?",
    deleteAccountBody: "Ma hubtaa? Akoonkaaga iyo dhammaan xogtaada si joogto ah ayaa loo tirtiri doonaa, dib looma soo celin karo.",
    deleteAccount: "Tirtir akoonka",
  },

  recover: {
    link: "Soo celi akoonkaaga", title: "Soo celi akoonkaaga",
    subtitle: "Geli lambarkaaga, waxaan kuu soo diri doonaa kood si aad u soo celiso akoonkaaga iyo xogtiisa.",
    number: "Lambarka taleefanka", sendCode: "Dir koodka",
    code: "Koodka xaqiijinta", newPassword: "Furaha cusub", confirmPassword: "Xaqiiji furaha cusub",
    recoverBtn: "Soo celi akoonka", changeNumber: "Beddel lambarka",
    codeSentTo: "Waxaan kood 6-god ah u dirnay",
    noAccount: "Ma jiro akoon dib loo soo celin karo lambarkan. Waxaad diiwaangelin kartaa.",
    pwShort: "Furuhu waa inuu ugu yaraan 4 xaraf yahay.", pwMismatch: "Furayaashu isma laha.",
    needNumber: "Geli lambar Soomaali sax ah.", needCode: "Geli koodka 6-god ah.",
  },

};



// export default {
//   tabs: { home: "Guriga", transactions: "Dhaqdhaqaaq", analytics: "Falanqayn", notifications: "Ogeysiis" },
//   common: { comingSoon: "Dhowaan" },
//   auth: { loginTitle: "Ku soo dhowow", phone: "Lambarka taleefanka", numberHint: "Lambarka", password: "Furaha sirta ah", loginBtn: "Gal", errorTitle: "Khalad", logout: "Ka bax" },
// };