import { getLocales } from "expo-localization";
import i18next from "i18next";
import { initReactI18next } from "react-i18next";

import { reportEn, reportJa } from "./report";
import { accountBillingEn, accountBillingJa } from "./account-billing";
import { battleMessagesEn, battleMessagesJa } from "./battle-messages";
import { kirokuEn, kirokuJa } from "./kiroku";
import { homeEn, homeJa } from "./home";
import { parentMenuEn, parentMenuJa } from "./parent-menu";
import { gohanEn, gohanJa } from "./gohan";
import { defaultLocale, resolveLocale } from "./locale";
// web と同じ辞書を相対参照で共有する（コピーしない）。
import en from "../../../web/messages/en.json";
import ja from "../../../web/messages/ja.json";

// web 辞書の Battle 名前空間に、native 専用の差分キーを足す（web の既存キーは上書きしない）。
const withBattle = <T extends { Battle: object }>(base: T, extra: object): T => ({
  ...base,
  Battle: { ...extra, ...base.Battle },
});

void i18next.use(initReactI18next).init({
  resources: {
    ja: { translation: { ...withBattle(ja, battleMessagesJa), ...accountBillingJa, ...parentMenuJa, ...gohanJa, ...kirokuJa, ...homeJa, Report: { ...ja.Report, ...reportJa } } },
    en: { translation: { ...withBattle(en, battleMessagesEn), ...accountBillingEn, ...parentMenuEn, ...gohanEn, ...kirokuEn, ...homeEn, Report: { ...en.Report, ...reportEn } } },
  },
  lng: resolveLocale(getLocales()[0]?.languageCode),
  fallbackLng: defaultLocale,
  // next-intl の単純な {name} 補間に合わせる。ICU の plural/select は未対応。
  interpolation: { prefix: "{", suffix: "}", escapeValue: false },
  initAsync: false,
});

export default i18next;
