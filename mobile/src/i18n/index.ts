// Initializes i18next with both dictionaries. The app DEFAULTS TO SOMALI regardless of the
// phone's locale (target users are Somali). Language still changes via the Register picker
// (pre-login) or the account's language after login (Profile / session hydrate).

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en";
import so from "./locales/so";

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, so: { translation: so } },
  lng: "so",
  fallbackLng: "so",
  interpolation: { escapeValue: false },
});

export default i18n;


// -----------------

//  initializes i18next with both dictionaries, picks the initial language from the phone's locale, and falls back to Somali.



// import i18n from "i18next";
// import { initReactI18next } from "react-i18next";
// import { getLocales } from "expo-localization";
// import en from "./locales/en";
// import so from "./locales/so";

// const deviceLang = getLocales()[0]?.languageCode === "en" ? "en" : "so";

// i18n.use(initReactI18next).init({
//   resources: { en: { translation: en }, so: { translation: so } },
//   lng: deviceLang,
//   fallbackLng: "so",
//   interpolation: { escapeValue: false },
// });

// export default i18n;