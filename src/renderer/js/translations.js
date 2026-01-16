const translations = {
  en: {
    prayerNames: {
      'Fajr': 'Fajr',
      'Dhuhr': 'Dhuhr',
      'Asr': 'Asr',
      'Maghrib': 'Maghrib',
      'Isha': 'Isha'
    },
    ui: {
      loading: 'Loading...',
      loadingPrayerTimes: 'Loading prayer times...',
      currentPrayer: 'Current Prayer',
      nextPrayer: 'Next Prayer',
      endTime: 'End time',
      now: 'Now',
      settings: 'Settings',
      quran: 'Quran',
      city: 'City',
      country: 'Country',
      theme: 'Theme',
      language: 'Language',
      save: 'Save',
      backToMain: 'Back to Main',
      cityPlaceholder: 'e.g., Tunis',
      countryPlaceholder: 'e.g., Tunisia',
      cityHint: 'Your city',
      countryHint: 'Your country',
      madeWith: 'Made with ❤️ for the Muslim Ummah',
      errorLoading: 'Error loading prayer times',
      networkError: 'Network error. Please check your connection.',
      retry: 'Retry',
      settingsSaved: 'Settings saved successfully',
      errorSaving: 'Error saving settings',
      enterBothCityCountry: 'Please enter both city and country',
      locationNotSet: 'Location not set',
      ah: 'AH',
      holyQuran: 'Holy Quran',
      loadingQuran: 'Loading Quran...',
      listenReadQuran: 'Listen, read and reflect on the Holy Quran',
      enterFullscreen: 'Enter Fullscreen',
      exitFullscreen: 'Exit Fullscreen',
      quranError: 'Error loading Quran. Please check your connection.',
      refreshQuran: 'Refresh Quran'
    },
    themes: {
      navy: 'Navy',
      green: 'Green',
      brown: 'Brown',
      gold: 'Gold',
      pink: 'Pink',
      purple: 'Purple',
      emerald: 'Emerald',
      ocean: 'Ocean',
      royal: 'Royal',
      indigo: 'Indigo',
      classic: 'Classic'
    }
  },
  ar: {
    prayerNames: {
      'Fajr': 'الفجر',
      'Dhuhr': 'الظهر',
      'Asr': 'العصر',
      'Maghrib': 'المغرب',
      'Isha': 'العشاء'
    },
    ui: {
      loading: 'جاري التحميل...',
      loadingPrayerTimes: 'جاري تحميل أوقات الصلاة...',
      currentPrayer: 'الصلاة الحالية',
      nextPrayer: 'الصلاة القادمة',
      endTime: 'وقت الانتهاء',
      now: 'الآن',
      settings: 'الإعدادات',
      quran: 'القرآن',
      city: 'المدينة',
      country: 'البلد',
      theme: 'المظهر',
      language: 'اللغة',
      save: 'حفظ',
      backToMain: 'العودة للرئيسية',
      cityPlaceholder: 'مثال: تونس',
      countryPlaceholder: 'مثال: تونس',
      cityHint: 'مدينتك',
      countryHint: 'بلدك',
      madeWith: 'صُنع بـ ❤️ للأمة الإسلامية',
      errorLoading: 'خطأ في تحميل أوقات الصلاة',
      networkError: 'خطأ في الاتصال. يرجى التحقق من الإنترنت.',
      retry: 'إعادة المحاولة',
      settingsSaved: 'تم حفظ الإعدادات بنجاح',
      errorSaving: 'خطأ في حفظ الإعدادات',
      enterBothCityCountry: 'يرجى إدخال المدينة والبلد',
      locationNotSet: 'الموقع غير محدد',
      ah: 'هـ',
      holyQuran: 'القرآن الكريم',
      loadingQuran: 'جاري تحميل القرآن...',
      listenReadQuran: 'استمع، اقرأ وتفكر في القرآن الكريم',
      enterFullscreen: 'شاشة كاملة',
      exitFullscreen: 'خروج من الشاشة الكاملة',
      quranError: 'خطأ في تحميل القرآن. يرجى التحقق من اتصالك بالإنترنت.',
      refreshQuran: 'تحديث القرآن'
    },
    themes: {
      navy: 'أزرق داكن',
      green: 'أخضر',
      brown: 'بني',
      gold: 'ذهبي',
      pink: 'وردي',
      purple: 'بنفسجي',
      emerald: 'زمردي',
      ocean: 'محيطي',
      royal: 'ملكي',
      indigo: 'نيلي',
      classic: 'كلاسيكي'
    }
  }
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
