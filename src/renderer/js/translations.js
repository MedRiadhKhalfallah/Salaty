const translations = {
  en: require('./locales/en.json'),
  ar: require('./locales/ar.json'),
  fr: require('./locales/fr.json')
};

let currentLanguage = 'en';

function setLanguage(lang) {
  currentLanguage = lang;
}

function getLanguage() {
  return currentLanguage;
}

// Get translated text
function t(key, section = 'ui') {
  const lang = currentLanguage;
  const parts = key.split('.');
  let value = translations[lang][section];

  for (const part of parts) {
    value = value?.[part];
  }

  return value || key;
}

// Apply RTL/LTR direction
function applyLanguageDirection() {
  const lang = currentLanguage;
  const isRTL = lang === 'ar';

  document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
  document.documentElement.lang = lang;
  document.body.classList.toggle('rtl', isRTL);
}

module.exports = {
  translations,
  setLanguage,
  getLanguage,
  t,
  applyLanguageDirection
};
