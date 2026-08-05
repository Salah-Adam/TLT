//  Every user-facing string lives here keyed by name (tabs.home), and we grow them as we build each screen.


export default {
  tabs: { home: "Guriga", transactions: "Dhaqdhaqaaq", analytics: "Falanqayn", notifications: "Ogeysiis" },
  common: { comingSoon: "Dhowaan la soco",

     loadFailed: "Lama heli karin", retry: "Isku day mar kale",

   },
  auth: {
    loginTitle: "Soo Laabasho Wacan", tagline: "La soco shilin kasta, luqaddaada.",
    createAccount: "Samee Akoon Cusub", haveAccount: "Akoon Ayaan Leeyahay",
    registerTitle: "Samee Akoon Cusub", fullName: "Magaca oo dhameystiran", phone: "Lambarka taleefanka",
    numberHint: "Lambarka", password: "Furaha sirta ah", language: "Luqadda", registerBtn: "Sii wad",
    otpTitle: "Geli koodhka", otpSent: "Waxaan dirnay koodh 6-god ah", otp: "Koodhka xaqiijinta", verifyBtn: "Xaqiiji",
    loginBtn: "Gal", errorTitle: "Khalad", logout: "Ka bax",
    invalidCredentials: "Lambarka ama furaha sirta ah waa khalad.",
    genericError: "Wax baa qaldamay. Fadlan isku day mar kale.",
    rateLimited: "Isku-day badan. Fadlan wax yar sug oo isku day mar kale.",

    resendCode: "Dib u dir koodhka",
    resendIn: "Dib u dir koodhka {{time}} gudahood",
    codeResent: "Koodh cusub ayaa la diray.",

    forgotLink: "Furaha sirta ma illowday?",
    forgotTitle: "Badel furahaaga sirta",
    forgotSub: "Hadii lambarkaaga uu diiwaangashan yahay, waxaan kuu soo diri doonnaa koodh.",
    sendCodeBtn: "Dir koodhka",
    resetTitle: "Furaha sirta cusub",
    resetSub: "Geli koodhka aan kuu soo dirnay iyo furahaaga sirta ee cusub.",
    newPassword: "Furaha sirta cusub",
    resetBtn: "Badel furaha sirta",

    reclaimBtn: "Dib u qaado lambarkan",

    notRegistered: "Lambarkani lama diiwaan gelin."
  },  
  validation: {
    name: "Magaca waa inuu ugu yaraan laba xaraf ka koobnaado.",
    phone: "Lambarka taleefanku waa khalad.",
    password: "Furaha sirta ah waa inuu ugu yaraan afar xaraf ahaado.",
    otp: "Geli koodhka 6-da god ah.",
  },

  offline: { banner: "Xogta la keydiyay baad arkeysaa · markii ugu dambeysay ee la cusbooneysiiyey xogta" },

  home: {
    greeting: "Salaan", balance: "Haraagaaga la qiyaasay waa",
    todayReceived: "Lacagta Maanta kusoo gashey", todaySpent: "Lacagta Maanta aad bixisey",
    monthTitle: "Bishaan", kept: "Waxaa kuu hartay", moneyIn: "Lacagta ku soo gashey", moneyOut: "Lacagta aad bixisey",
    // question: "Su'aasha", questionSub: "Meesha ugu badan lacagtaada ku baxday",
    question: "Meelaha ugu badan lacagtaada ku bixisey bishan",

    recent: "Dhaqdhaqaaqii ugu dambeeyey", seeAll: "Arag Dhammaan", empty: "Wax dhaqdhaqaaq ah weli ma jiraan", lastSynced: "La cusbooneysiiyay",

    weekTitle: "Isbuucan", weekSpent: "Isbuucaan waxaad bixisey {{amount}} ",
    weekUp: "{{pct}}% In kabadan isbuucii hore", weekDown: "{{pct}}% in ka yar isbuucii hore", weekSame: "in la mid ah isbuucii hore",


    menuTitle: "Menu", menuAlerts: "Digniinaha kharashka",

    balanceBreakdown:   "Haraaga la qiyaasey",
    numberRemoved:   "Mar dambe lama diiwaangelin",
    total:  "Wadarta"
  },


  tx: {
    detailTitle: "Dhaqdhaqaaq",
    searchPlaceholder: "Ku raadi magac ama lambar",
    all: "Dhammaan", in: "Heshey", out: "Dirtey",
    date: "Taariikh", date_all: "Waqti kasta", date_today: "Maanta", date_week: "7-dii maalmood u dambeysey", date_month: "Bishaan",
    today: "Maanta", yesterday: "Shalay",
    empty: "Wax dhaqdhaqaaq ah lama helin",
    received: "Lacagta soo gashay", spent: "Lacagta la direy",
    receivedFrom: "Ka heshay", sentTo: "U wareejisay", notAvailable: "Not available",
    // counterparty: "Cidda lacagta aad u dirtey ama ka heshey", notAvailable: "Lama helin",
    category: "Nooca", uncategorized: "Aan la kala saarin", autoTag: "Otomaatig", pickCategory: "Dooro nooca",
    note: "Faalo", addNote: "Ku dar faalo",
    type: "Nooca", provider: "Adeega", balanceAfter: "Haraaga", charge: "Khidmada adeega",
    dateTime: "Taariikh & waqti", reference: "Tixraac",
    changeCategory: "Nooca", editNote: "Faalo", delete: "Tirtir",
    deleteConfirmTitle: "Tirtir dhaqdhaqaaqa?",
    deleteConfirmBody: "Waxaa laga qarin doonaa qyebta dhaqdhaqaaqaaga. Tani ma beddesho haraagaaga ama xogtaada.",
    cancel: "Jooji", save: "Keydi",
    offlineAction: "internetka furo si aad tan u samayso.",

    colTransaction: "Dhaqdhaqaaq", colCategory: "Nooca", colAmount: "Qiimaha", colBalance: "Haraaga",
    net: "saafi", allSims: "Dhammaan SIM-yada", sims: "SIM", filterSim: "Dooro Lambar",
    pickDates: "Ama dooro taariikho gaar ah", apply: "Raadi",

    unknownParty: "qof aan la aqoonsan",
    msgIn: "{amount} ayaad ka heshay {who}, haraagaaga waa {balance}",
    msgInNoBal: "{amount} ayaad ka heshay {who}",
    msgOut: "{amount} ayaad wareejisay {who}, haraagaaga waa {balance}",
    msgOutNoBal: "{amount} ayaad wareejisay {who}",

    yourNumber: "Nambarkaaga",

    emptyHint: "Dhaqdhaqaaqaaga halkan ayuu ka muuqan doonaa marka fariimaha la soo cusboonaysiiyo.",


  },


  notif: {
    all: "Dhammaan", unread: "Aan la akhrin", markAll: "Calaamadee dhammaan",
    empty: "Weli ogeysiis ma jiro", emptyUnread: "Ma jiro ogeysiis aan la akhrin",
    delete: "Tirtir", deleteTitle: "Tirtir ogeysiiska?", deleteBody: "Waxaad ogeysiiskan ka tirtireysaa liiskaaga.",
    offlineDelete: "Internetka furo si aad u tirtirto.",

    group_transactions: "Dhaqdhaqaaq", group_alerts: "Digniino", group_summaries: "Soo koobid", group_reports: "Warbixino", group_account: "Akoonka",

    emptyHint: "Halkan waxaad ku arki doontaa ogeysiisyada dhaqdhaqaaqa, digniino, iyo warbixino.",
    
  },

  analytics: {
    daily: "Maalinle", monthly: "Bille",
    received: "Lacagta kusoo gashey", spent: "Lacagta aad bixisey", kept: "Waxaa kuu hartay", overspent: "Lacagaha aad dirtey waxey ka badan yihiin lacagaha laguu soo direy qiyaastii",
    txns: "dhaqdhaqaaq",
    whereTitle: "Meelaha lacagtaadu ku bixisey", noSpending: "Wax lacag ah ma aadan Kharash-gareyn muddadan",
    trendTitle: "Kharashka maalinlaha ah", highlights: "Waxyaabaha muhiimka ah",
    largestIn: "Lacagta ugu badan ee laguu soo direy: {{amount}}", largestOut: "Lacagta ugu badan ee dirtey: {{amount}}",
    busiestDay: "Maalinta ugu mashquulka badneyd : {{date}}", busiestHour: "Saacadda ugu firfircoon: {{hour}}:00",
    empty: "Wax Dhaqdhaqaaq ah lama helin muddadan",
    spendDiary: "{month} {day}, waxaad bixisey {amount}",
    viewReport: "Arag warbixinta oo dhimeystiran",

    weekly: "Usbuucle",
    
    legendIn:  "Heshey",
    legendOut:       "Dirtey" ,
    amountAxis:      "Lacagta" ,
    trendTitleWeek: "Isbeddelka usbuuca" ,
    trendTitleMonth: "Isbeddelka bisha",   
    leadDaily:       "Maanta",    
    leadWeekly:      "Usbuucan" ,
    leadMonthly:     "Bishaan",          
    sumSentencePos:  "{lead} wadarta lacagaha aad heshey waa {in}, waxaana dirtey {out}, waxaa kuu hartey {net}, waxaad sameysey {count} dhaqdhaqaaq.",
    sumSentenceNeg:  "{lead} wadarta lacagta aad dirtey way ka badan tahay tii laguu soo diray {deficit}; waxaad dirtey {out}, waxaana laguu soo diray {in}, waxaad sameysey {count} dhaqdhaqaaq.",
    trendLine:      "{label}, waxaad heshey {in}, waxaadna dirtey {out}.",    
    
  },

  report: {
    title: "Warbixin",
    daily: "Warbixinta maalinlaha", weekly: "Warbixinta usbuuclaha", monthly: "Warbixinta bilaha",
    kept: "Waxaa kuu hartay", overspent: "Lacagta aad dirtey waxey ka badatey lacagta laguu soo direy qiyaastii ", received: "Lacagta kusoo gashey", spent: "Lacagta aad bixisey",
    insightsTitle: "Waxa dhacay", whereTitle: "Meelaha lacagtaadu ku bixisey",
    txns: "dhaqdhaqaaq", empty: "Xog lama hayo muddadan",

    whatHappened: "Waxa dhacay",
    grpCategory: "Meelaha lacagtaadu ku bixisey", grpSenders: "Dadka lacag kuu soo direy", grpRecipients: "Dadka aad lacag u dirtay",
    grpBiggestIn: "Lacagaha ugu badan ee aad heshey", grpBiggestOut: "Lacagaha ugu badan ee aad dirtey", grpDaily: "Kharashka maalinlaha",
    catLine: "Waxaad {category} ku bixisey {amount} ({pct}% kharashaadkaaga) ",
    senderLine: "{amount} ka heshey {who} ({count} jeer)",
    recipientLine: "{amount} ayaad u dirtay {who} ({count} jeer)",
    biggestIn: "Lacagta ugu badan ee aad heshey waa {amount} oo ka heshey {who}",
    biggestOut: "Lacagta ugu badan ee aad dirtey waa {amount} oo aad u dirtey {who}",


    highlights: "Waxyaabaha muhiimka ah",
    hlAhead: "Waxaad kaydsatay {{amount}}",
    hlBehind: "Waxaad dhaaftay {{amount}}",
    // hlSpendUp: "Waxaad bixisay {{pct}}% ka badan xilligii hore",
    // hlSpendDown: "Waxaad bixisay {{pct}}% ka yar xilligii hore",
    hlBusiest: "Maalinta ugu mashquulka badneyd waxay ahayd {{date}} oo leh {{count}} dhaqdhaqaaq",
    hlBusiestNoCount: "Maalinta ugu mashquulka badneyd waxay ahayd {{date}}",
    hlBusiestHour: "Saacadda ugu mashquulka badneyd waxay ahayd {{hour}}:00",

    trend_daily: "Kharashka — 6-dii maalmood ee la soo dhaafay", trend_weekly: "Kharashka — 4-tii usbuuc ee la soo dhaafay", trend_monthly: "Kharashka — 6-dii bilood ee la soo dhaafay",
    prev_daily: "shalay", prev_weekly: "usbuucii hore", prev_monthly: "bishii hore",
    
    // hlSpendUp: "Waxaad bixisay {{pct}}% ka badan {{prev}}",
    // hlSpendDown: "Waxaad bixisay {{pct}}% ka yar {{prev}}",

    uncatLine: "{amount} oo kharashkaaga ah lama kala saarin meealah ay ku baxeen ({pct}%).",


    hlSpendMore: "Waxaad kharash-gareysey {delta} ka badan kharashkii {when}, oo ahaa {prev}.",
    hlSpendLess: "Waxaad kharash-gareysey {delta} ka yar kharashkii {when}, oo ahaa {prev}.",
    hlSpendSame: "Kharashkaaga wuxuu la mid noqdey {when}, oo ahaa {prev}.",

    seeMore:  "Arag dheeraad",
    cappedNote:  "Waxaa la muujinayaa 100-ka ugu badan oo keliya.",
    hlSavingRate:  "Waxaad kaydisay {{pct}}% lacagta aad heshay.",
    dailyInOutTitle: "Wadarta Lacaga Aad Dirtey ama Heshey",
    totalSpent:  "Wadarta la bixiyay",
    totalReceived: "Wadarta la helay",


    budgetsTitle:  "Mizaaniyadaha",
    trackedTitle:  "Dadka aad raacdo",
    budgetOver:   "{{amount}} dhaaf" ,
    budgetPlainOver: "{category}: waxaad bixisay {spent}, oo {over} ka badan mizaaniyaddaada {limit}.",
    budgetPlainOk:  "{category}: waxaad bixisay {spent} oo ka mid ah mizaaniyaddaada {limit}.",
    trackedPlain:  "{who}: waxaad dirtay {sent}, waxaadna heshay {received} ({count} jeer).",

  },

  contacts: {
    title: "Dadka la raadraaco", detailTitle: "Qofka", addTitle: "Ku dar qof", editTitle: "Wax ka beddel",
    empty: "Weli ma aaadan abuurin qof aad raadraacdo", emptyHint: "Raadraac qof si aad u aragto xisaabta lacagaha aad u dirtey ama kuu soo direy.",
    addContact: "Ku dar qof", edit: "Wax ka beddel",
    label: "Magac / summad", labelPlaceholder: "tusaale: Ganacsade Axmed",
    direction: "Waxa la raadraacayo", dir_both: "Labadaba", dir_sent: "Lacagaha aad dirto", dir_received: "Lacagha laguu so diro",
    numbers: "Lambarrada", addNumber: "Ku dar lambar", numberPlaceholder: "Lambar", removeNumber: "Tirtir", removeNumberTitle: "Tirtir lambarkan?",
    net: "Saafi", txnShort: "Dhaqdhaqaaq", timeline: "Taariikh",
    summary: "Wadarta Lacagta aad dirtey {{sent}} · Wadarta Lacagta laguu soo direy {{received}} · {{count}} dhaqdhaqaaq",
    lastActivity: "Dhaqdhaqaaqii u dambeeyay {{date}}", noActivity: "Weli wax dhaqdhaqaaq ah ma jiro",
    save: "Keydi", cancel: "Jooji",
    delete: "Tirtir qofka", deleteConfirmTitle: "Tirtir qofka?",
    deleteConfirmBody: "Tani way joojinaysaa kaliya raadraaca.",
    offlineAction: "Internet ku xariiri si aad tan u samayso.",
    invalidNumber: "Geli lambar Soomaali sax ah.", needNumber: "Ugu yaraan hal lambar ku dar.", needLabel: "Geli magac ama summad.",

    allNumbers: "Dhammaan lambarrada",

    filterNumber: "ku kala saar lambar", numbersWord: "lambar",
  },


  alerts: {
    title: "Digniinaha kharashka", addTitle: "Digniin cusub", editTitle: "Wax ka beddel digniinta",
    empty: "Weli digniin kharash ma aadan sameysan", emptyHint: "U samayso digniin kharashaadkaaga ku baxa sida cuntada ama khadka, IWM oo hel fariin digniin ka hor intaadan dhaafin xadka aad ugu talo gashey",
    addAlert: "Sameey Digniin cusub",
    category: "Nooca", pickCategory: "Dooro nooca",
    limit: "Xadka qadarka", period: "Muddada", weekly: "Toddobaadle", monthly: "Bishii",
    threshold: "Iga digo marka aan garaaro ($)", sim: "SIM (ikhtiyaari)", allSims: "Dhammaan SIM-yada",
    progress: "Waxaad kharash-gareysey {{spent}} oo ka mid ah {{limit}} {{period}}", periodWeek: "todobaadkan", periodMonth: "bishaan",
    percentUsed: "{{percent}}% la isticmaalay", over: "Waxaad ka gudubtay {{amount}}",
    save: "Keydi", create: "Abuur digniin", cancel: "Jooji",
    delete: "Tirtir digniinta", deleteTitle: "Tirtir digniinta?", deleteBody: "Waad joojin doontaa digniinaha qadarkan.",
    offlineAction: "Internet ku xariirso si aad tan u samayso.",
    needCategory: "Dooro nooca.", needLimit: "Geli xad ka weyn 0.", badThreshold: "Boqolkiiba waa inuu u dhexeeyaa 1 iyo 100.",
    duplicate: "Horey ayaad u sameysey digniin noocan ah iyo muddadan.",
    lockedHint: "Nooca, muddada iyo SIM lama beddeli karo. Tirtir oo abuur mid cusub si aad u beddesho.",
  },


  settings: {
    title: "Mawduuca", account: "Akoonka", preferences: "Doorbidyada", about: "Ku saabsan",
    profile: "Astaanta", changePassword: "Beddel furaha sirta", language: "Luqadda",
    fullName: "Magaca oo dhameystiran", email: "Iimaylka", emailOptional: "Iimaylka (ikhtiyaari)",
    age: "Da'da", city: "Magaalada", cityOptional: "Magaalada (ikhtiyaari)",
    sex: "Jinsiga", male: "Lab", female: "Dhedig", sexNone: "—",
    phone: "Lambarka taleefanka aasaasiga ah", memberSince: "Xubin ilaa", save: "Keydi",
    nameShort: "Magacu waa inuu ugu yaraan 2 xaraf ka kooban yahay.", ageBad: "Da'du waa inay u dhaxaysaa 10 iyo 100.", emailTaken: "Iimaylkaas horey ayaa loo isticmaalay.",
    currentPassword: "Furaha sirta hadda", newPassword: "Furaha sirta cusub", confirmPassword: "Xaqiiji furaha sirta cusub",
    pwShort: "Furaha sirta waa inuu ugu yaraan 4 xaraf yahay.", pwMismatch: "Furayaasha cusub ee sirta isma laha.",
    pwSame: "Furaha sirta cusub waa inuu ka duwan yahay kii hore.", pwWrong: "Furahaaga sirta hadda ah waa qalad.",
    pwChangedTitle: "Furaha sirta waa la beddelay", pwChangedBody: "Furahaaga sirta waa la cusboonaysiiyay.",
    logout: "Ka bax", logoutTitle: "Ka bax?", logoutBody: "Waxaad u baahan doontaa inaad mar kale soo gasho si aad u isticmaasho app-ka.", cancel: "Jooji",
  },


  phones: {
    title: "Lambarrada", manage: "Maamul", empty: "Weli lambar ma jiro", primary: "Aasaasi", addedOn: "La abuurey {{date}}",
    addTitle: "Ku dar lambar",
    displayName: "Magac (ikhtiyaari)", classification: "Nooca", individual: "Shakhsi", business: "Ganacsi",
    sendCode: "Dir koodka", verify: "Xaqiiji", code: "Koodka xaqiijinta", codeSentTo: "Waxaan koodh 6-god ah u dirnay", changeNumber: "Beddel lambarka",
    delete: "Tirtir", deleteTitle: "Tirtir lambarkan?", deleteBody: "Waad joojin doontaa ogeysiisyada lambarkan.",
    deleteLastTitle: "Tirtir lambarka kaliya kuu diiwaangashan?", deleteLastBody: "Kani waa lambarkaaga u dambeeya — Hadii aad  tirtirto waxay tirtiraysaa akoonkaaga iyo dhammaan xogtiisa. Dibna looma soo celin karo.",
    accountDeletedTitle: "Akoonka waa la tirtiray", accountDeletedBody: "Akoonkaaga waa la tirtiray.",
    ownedTitle: "Lambar la isticmaalayo", ownedBody: "Lambarkan waxaa ku diiwaangashan akoon kale. hadii adiga leedahay lambarkan, dib u hel?", reclaim: "Dib u qaado",
    alreadyAdded: "Horey ayaad u diiwaangashatey lambarkan.", unsupported: "Horgalaha lambarkaas lama ogola.",
    offlineAction: "Internet ku xariirso si aad tan u samayso.", needNumber: "Geli lambar Soomaali sax ah.", needCode: "Geli koodka 6-god ah.",

    continue: "Sii wad",
    deleteAccountTitle: "Tirtir akoonkaaga?",
    deleteAccountBody: "Ma hubtaa? Akoonkaaga iyo dhammaan xogtaada si joogto ah ayaa loo tirtiri doonaa, dib looma soo celin karo.",
    deleteAccount: "Tirtir akoonka",
  },

  recover: {
    link: "Dib U Hel Akoonkaaga Lumey", title: "Dib U Hel Akoonkaaga Lumey",
    subtitle: "Geli lambarkaaga, waxaan kuu soo diri doonaa koodh si aad u soo celiso akoonkaaga iyo xogtiisa.",
    number: "Lambarka taleefanka", sendCode: "Dir koodka",
    code: "Koodka xaqiijinta", newPassword: "Furaha sirta cusub", confirmPassword: "Xaqiiji furaha sirta cusub",
    recoverBtn: "Soo celi akoonka", changeNumber: "Beddel lambarka",
    codeSentTo: "Waxaan koodh 6-god ah u dirnay",
    noAccount: "Ma jiro akoon dib loo soo celin karo oo ku diiwaangashan lambarkan. Waa diiwaangelin kartaa.",
    pwShort: "Furaha sirta waa inuu ugu yaraan 4 xaraf ka kooban yahay.", pwMismatch: "Furayaashu sirta isma laha.",
    needNumber: "Geli lambar Soomaali sax ah.", needCode: "Geli koodka 6-god ah.",
  },

  onboarding: {
    skip: "Ka bood", next: "sii wad", start: "Bilow", gotIt: "Waan fahmay",
    s1Title: "Diiwaankaaga Lacagaha",
    s1Body: "Lacag kasta oo aad dirto ama hesho waxay halkan u noqonaysaa diiwaan cad adiga oo qoraal badan sameynin.",
    s2Title: "Fahan lacagtaada",
    s2Body: "Ogoow halka lacagtaada kaa soo gasho kuna baxdo adigoo heli doono warbixino maalinle, usbuucle, iyo bille.",
    s3Title: "Xakameeyso lacagtaada",
    s3Body: "Deji digniino kharash oo la soco dadka aad badanaa wax u dirto — Af-Soomaali ama Ingiriisi.",

    s4Title: "Dhammaan shirkadaha Dalka",
    s4Body:  "Waxaad isticmaali kartaa lambarada aad ku leedahay dhammaan shirkadaha dalka",

    tipHome: "Halkan riix Dejinta, Digniinaha kharashka, iyo Xiriiriyeyaasha la raacayo.",
    tipTx: "Riix dhaqdhaqaaq kasta si aad u kala saarto ama qoraal ugu darto.",
    tipAnalytics: "Halkan ka beddel maalinle, toddobaadle, iyo bille — kadibna fur warbixin buuxda oo faahfaahsan.",

    tipAnalyticsCycle: "Riix calaamadda wareegga (↻) ee midigta si aad u beddesho sida warbixinta loo muujiyo — jaantus ama qoraal."

  },

  deleted: {
    title: "Dhaqdhaqaaqyada dhawaan la tirtiray",
    empty: "Waxba lama tirtirin",
    emptyHint: "Dhaqdhaqaaqa la tirtiray waxaa lagu soo celin karaa mudow 30 maalmood gudahood.",
    restore: "Soo celi",
    autoDeletes: "{{days}} maalin ka dib waa la tirtiriyaa oo dib uma heli doontid dhaqdhaqaaqan",
    offlineTitle: "Internet Kuuma xariirsana",
    offlineHint: "Ku xiriirso internet si aad u aragto oo u soo celiso dhaqdhaqaaqa la tirtiray.",
  },

  alertDetail: {
    transactions: "Dhaqdhaqaaqa",
    fullPeriod: "Muddada oo dhan",
    empty: "Dhaqdhaqaaq lama helin muddadan.",
  },

    about:{
    tagline: "Fahan meesha lacagtaadu ku baxdo." ,
    p1: "TLT wuxuu si otomaatig ah farriimahaaga lacagta ugu beddelaa diiwaan cad oo dhaqdhaqaaq kasta ah dhammaan SIM-yadaada.",
    p2: "Arag warbixino, dejiso digniino kharash, oo la soco xiriiriyayaal — online ama offline.",
    p3:  "Xogtaadu waa la sireeyay taleefankaaga iyo server-yadayada.",
  },

};
