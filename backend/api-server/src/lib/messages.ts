// The single source of truth for every user-facing string, en + so. 
// One language is emitted per response


export type Lang = "en" | "so";

type Entry = { en: string; so: string };

export const MESSAGES: Record<string, Entry> = {
  // ── Generic ──
  ERROR:                { en: "Something went wrong.", so: "Wax baa qaldamay." },
  INTERNAL_ERROR:       { en: "Something went wrong. Please try again.", so: "Wax baa qaldamay. Fadlan isku day mar kale." },
  VALIDATION_ERROR:     { en: "Some of the information you sent is invalid.", so: "Qaar ka mid ah xogta aad soo dirtay waa qaldan yihiin." },
  UNAUTHORIZED:         { en: "You are not authorized.", so: "Ma haysatid ogolaansho." },
  INVALID_TOKEN_TYPE:   { en: "Invalid token type.", so: "Nooca calaamadda waa qaldan yahay." },

  // ── OTP ──
  OTP_NOT_REQUESTED:    { en: "No code was requested for this number.", so: "Lambarkan llooma codsan koodh." },
  OTP_TOO_MANY_ATTEMPTS:{ en: "Too many attempts. Please request a new code.", so: "Isku-day badan. Fadlan codso koodh cusub." },
  OTP_EXPIRED:          { en: "The code has expired. Please request a new one.", so: "Koodhku wuu dhacay. Fadlan codso mid cusub." },
  OTP_INVALID:          { en: "The code you entered is incorrect.", so: "Koodhka aad gelisay waa khalad." },
  OTP_WRONG_ACCOUNT:    { en: "This code was not issued for your account.", so: "Koodhkan llooma dirin akoonkaaga." },

  // ── Phone / provider ──
  PHONE_PREFIX_UNRECOGNISED: { en: "Phone number prefix not recognised. Only Hormuud (25261, 25277) and Somtel (25262) are supported.", so: "Horgalaha lambarka lama aqoonsan. Waxaa kaliya la taageeraa Hormuud (25261, 25277) iyo Somtel (25262)." },
  PHONE_ALREADY_REGISTERED:  { en: "This number is already registered. If it's yours, use reclaim.", so: "Lambarkan horey ayaa loo diiwaan geliyay. Haddii uu kuu yahay, isticmaal dib-u-qaadasho." },
  NUMBER_OWNED_BY_OTHER:     { en: "This number is registered to another account. Use reclaim if it's yours.", so: "Lambarkan waxaa leh akoon kale. Isticmaal dib-u-qaadasho haddii uu kuu yahay." },
  ALREADY_ADDED_NUMBER:      { en: "You have already added this number.", so: "Horey ayaad ugu dartay lambarkan." },
  ALREADY_OWN_NUMBER:        { en: "You already own this number.", so: "Horey ayaad u leedahay lambarkan." },
  NUMBER_NOT_ACTIVE:         { en: "This number is not active on any account.", so: "Lambarkan kuma firfircoona akoon kasta." },
  NUMBER_NOT_REGISTERED_REGISTER: { en: "This number isn't registered to anyone. Please register instead.", so: "Lambarkan cidna kuma diiwaan gashana. Fadlan halkii is-diiwaan geli." },
  NUMBER_NOT_REGISTERED_ADD: { en: "This number isn't registered to anyone — add it normally instead.", so: "Lambarkan cidna kuma diiwaan gashana — halkii si caadi ah ugu dar." },
  NUMBER_JUST_TAKEN:         { en: "This number was just taken. Use reclaim.", so: "Lambarkan ayaa hadda la qaatay. Isticmaal dib-u-qaadasho." },
  NO_PENDING_RECLAIM:        { en: "No pending reclaim found. Please start again.", so: "Dib-u-qaadasho sugaysa lama helin. Fadlan dib u bilow." },
  PHONE_NOT_FOUND:           { en: "Phone number not found.", so: "Lambarka lama helin." },

  // ── Auth ──
  INVALID_CREDENTIALS:  { en: "Invalid phone number or password.", so: "Lambarka ama furaha sirta waa khalad." },
  ACCOUNT_NOT_FOUND:    { en: "Account not found.", so: "Akoonka lama helin." },
  ACCOUNT_DISABLED:     { en: "This account is disabled.", so: "Akoonkan waa la xannibay." },
  ACCOUNT_CREATION_FAILED: { en: "Account creation failed. Please try again.", so: "Abuurista akoonka way fashilantay. Fadlan isku day mar kale." },
  RESET_SESSION_NOT_FOUND: { en: "Reset session not found.", so: "Habka dib-u-dejinta lama helin." },
  REFRESH_INVALID:      { en: "Invalid refresh token.", so: "Calaamadda cusboonaysiinta waa khalad." },
  REFRESH_REVOKED:      { en: "This session has been revoked.", so: "Fadhigan waa la joojiyay." },
  REFRESH_EXPIRED:      { en: "Your session has expired. Please log in again.", so: "Fadhigaagu wuu dhacay. Fadlan dib u soo gal." },
  SESSION_MAX_LIFETIME: { en: "Session has exceeded its maximum lifetime. Please log in again.", so: "Fadhigu wuxuu dhaafay muddadiisii ugu badnayd. Fadlan dib u soo gal." },

  // ── Success messages ──
  LOGGED_OUT:           { en: "Logged out successfully.", so: "Si guul leh ayaad uga baxday." },
  FORGOT_PASSWORD_SENT: { en: "If this number is registered, a code has been sent.", so: "Haddii lambarkan diiwaan gashan yahay, koodh ayaa la diray." },
  OTP_SENT:             { en: "A verification code was sent to your number.", so: "Koodh xaqiijin ayaa loo diray lambarkaaga." },
  OTP_SENT_RECLAIM:     { en: "A code was sent to the number you are reclaiming.", so: "Koodh ayaa loo diray lambarka aad dib u qaadanayso." },
  PHONE_UPDATED:        { en: "Updated successfully.", so: "Si guul leh ayaa loo cusboonaysiiyay." },
  PHONE_REMOVED:        { en: "Number removed.", so: "Lambarka waa la saaray." },
  PHONE_REMOVED_ACCOUNT_DELETED: { en: "Number removed and account deleted.", so: "Lambarka waa la saaray, akoonkana waa la tirtiray." },

  // ── Transactions (used in Part 3) ──
  TRANSACTION_NOT_FOUND:   { en: "Transaction not found.", so: "Dhaqdhaqaaqa lama helin." },
  CATEGORY_NOT_FOUND:      { en: "Category not found.", so: "Qaybta lama helin." },
  RECOVERY_PERIOD_EXPIRED: { en: "The 30-day recovery period has expired.", so: "Muddada 30-cisho ee soo-celinta way dhacday." },
  SEARCH_QUERY_REQUIRED:   { en: "A search term is required.", so: "Erey raadin ah ayaa loo baahan yahay." },
  TRANSACTION_DELETED:     { en: "Transaction deleted.", so: "Dhaqdhaqaaqa waa la tirtiray." },
  TRANSACTION_RESTORED:    { en: "Transaction restored.", so: "Dhaqdhaqaaqa waa la soo celiyay." },
  TRANSACTION_UPDATED:     { en: "Transaction updated.", so: "Dhaqdhaqaaqa waa la cusboonaysiiyay." },

  UNCATEGORIZED: { en: "Uncategorized", so: "Aan la kala saarin" },


    // ── Report insights ──
  INSIGHT_NO_DATA:       { en: "No transactions this month yet.", so: "Weli ma jiraan wax-ku-dhaqaaq bishaan." },
  INSIGHT_NET_SAVED:     { en: "You came out ahead by {amount} {currency} this month.", so: "Bishaan waxaad faa'iido u heshay {amount} {currency}." },
  INSIGHT_NET_DEFICIT:   { en: "You spent {amount} {currency} more than you received this month.", so: "Bishaan waxaad bixisay {amount} {currency} oo ka badan intaad heshay." },
  INSIGHT_TOP_CATEGORY:  { en: "Most of your spending went to {category} ({amount} {currency}).", so: "Intooda badan kharashkaagu wuxuu galay {category} ({amount} {currency})." },
  INSIGHT_SPENDING_UP:   { en: "You spent {pct}% more than last month.", so: "Waxaad bixisay {pct}% ka badan bishii hore." },
  INSIGHT_SPENDING_DOWN: { en: "You spent {pct}% less than last month.", so: "Waxaad bixisay {pct}% ka yar bishii hore." },

  CONTACT_UNKNOWN:       { en: "a contact", so: "qof" },
  INSIGHT_TOP_SPEND:     { en: "You spent {amount} {currency} on {category} ({pct}%).", so: "Waxaad {category} ku bixisay {amount} {currency} ({pct}%)." },
  INSIGHT_TOP_SENDER:    { en: "{name} sent you {amount} {currency} ({count}x).", so: "{name} wuxuu kuu soo diray {amount} {currency} ({count} jeer)." },
  INSIGHT_TOP_RECIPIENT: { en: "You sent {name} {amount} {currency} ({count}x).", so: "Waxaad u dirtay {name} {amount} {currency} ({count} jeer)." },
  INSIGHT_LARGEST_OUT:   { en: "Biggest payment: {amount} {currency} to {name}.", so: "Lacagta ugu badan ee aad bixisay: {amount} {currency} oo aad u dirtay {name}." },
  INSIGHT_LARGEST_IN:    { en: "Biggest receipt: {amount} {currency} from {name}.", so: "Lacagta ugu badan ee aad heshay: {amount} {currency} oo ka timid {name}." },
  INSIGHT_BUSIEST_DAY:   { en: "Your busiest day was {day} with {count} transactions.", so: "Maalintaada ugu firfircoonayd waxay ahayd {day} oo leh {count} dhaqdhaqaaq." },
  INSIGHT_TREND_UP:      { en: "Your spending has been trending up lately.", so: "Kharashkaagu dhawaanahan wuu kordhayaa." },
  INSIGHT_TREND_DOWN:    { en: "Your spending has been trending down lately.", so: "Kharashkaagu dhawaanahan wuu yaraanayaa." },
  
};

/** Pick one language for a code, interpolating {name}-style params. */
export function t(code: string, lang: Lang, params?: Record<string, string | number>): string {
  const entry = MESSAGES[code] ?? MESSAGES.INTERNAL_ERROR;
  let msg = entry[lang] ?? entry.en;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      msg = msg.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
  }
  return msg;
}