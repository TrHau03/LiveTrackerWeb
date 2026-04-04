"use client";

import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import enTranslations from "./locales/en/translation.json";
import viTranslations from "./locales/vi/translation.json";

const resources = {
  en: {
    translation: enTranslations,
  },
  vi: {
    translation: viTranslations,
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: "vi", // default language
  fallbackLng: "vi",
  interpolation: {
    escapeValue: false, // react already safes from xss
  },
});

export default i18n;
