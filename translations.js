// translations.js - Language system for the Prayer Times app

const translations = {
  en: {
    // Header
    loading: 'Loading...',
    
    // Prayer names
    prayers: {
      Fajr: 'Fajr',
      Dhuhr: 'Dhuhr',
      Asr: 'Asr',
      Maghrib: 'Maghrib',
      Isha: 'Isha'
    },
    
    // Prayer cards
    currentPrayer: 'Current Prayer',
    nextPrayer: 'Next Prayer',
    endTime: 'End time',
    now: 'Now',
    
    // Settings
    settings: 'Settings',
    city: 'City',
    country: 'Country',
    theme: 'Theme',
    language: 'Language',
    save: 'Save',
    back: 'Back to Main',
    
    // Placeholders
    cityPlaceholder: 'e.g., Tunis',
    countryPlaceholder: 'e.g., Tunisia',
    yourCity: 'Your city',
    yourCountry: 'Your country',
    
    // Themes
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
    },
    
    // Messages
    locationNotSet: 'Location not set',
    networkError: 'Network error. Please check your connection.',
    errorLoading: 'Error loading prayer times',
    retry: 'Retry',
    settingsSaved: 'Settings saved successfully',
    errorSaving: 'Error saving settings',
    enterCityCountry: 'Please enter both city and country',
    loadingPrayerTimes: 'Loading prayer times...',
    failedToLoad: 'Failed to load prayer times',
    
    // Footer
    madeWith: 'Made with ❤️ for the Muslim Ummah',
    
    // Accessibility
    minimize: 'Minimize',
    close: 'Close',
    navyTheme: 'Navy Theme',
    greenTheme: 'Green Theme',
    brownTheme: 'Brown Theme',
    goldTheme: 'Gold Theme',
    pinkTheme: 'Pink Theme',
    purpleTheme: 'Purple Theme',
    emeraldTheme: 'Emerald Theme',
    oceanTheme: 'Ocean Theme',
    royalTheme: 'Royal Theme',
    indigoTheme: 'Indigo Theme',
    classicTheme: 'Classic Theme'
  },
  
  ar: {
    // Header
    loading: 'جاري التحميل...',
    
    // Prayer names
    prayers: {
      Fajr: 'الفجر',
      Dhuhr: 'الظهر',
      Asr: 'العصر',
      Maghrib: 'المغرب',
      Isha: 'العشاء'
    },
    
    // Prayer cards
    currentPrayer: 'الصلاة الحالية',
    nextPrayer: 'الصلاة القادمة',
    endTime: 'وقت الانتهاء',
    now: 'الآن',
    
    // Settings
    settings: 'الإعدادات',
    city: 'المدينة',
    country: 'الدولة',
    theme: 'المظهر',
    language: 'اللغة',
    save: 'حفظ',
    back: 'رجوع',
    
    // Placeholders
    cityPlaceholder: 'مثال: تونس',
    countryPlaceholder: 'مثال: تونس',
    yourCity: 'مدينتك',
    yourCountry: 'دولتك',
    
    // Themes
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
    },
    
    // Messages
    locationNotSet: 'لم يتم تعيين الموقع',
    networkError: 'خطأ في الشبكة. يرجى التحقق من الاتصال.',
    errorLoading: 'خطأ في تحميل أوقات الصلاة',
    retry: 'إعادة المحاولة',
    settingsSaved: 'تم حفظ الإعدادات بنجاح',
    errorSaving: 'خطأ في حفظ الإعدادات',
    enterCityCountry: 'يرجى إدخال المدينة والدولة',
    loadingPrayerTimes: 'جاري تحميل أوقات الصلاة...',
    failedToLoad: 'فشل تحميل أوقات الصلاة',
    
    // Footer
    madeWith: 'صُنع بـ ❤️ للأمة الإسلامية',
    
    // Accessibility
    minimize: 'تصغير',
    close: 'إغلاق',
    navyTheme: 'المظهر الأزرق الداكن',
    greenTheme: 'المظهر الأخضر',
    brownTheme: 'المظهر البني',
    goldTheme: 'المظهر الذهبي',
    pinkTheme: 'المظهر الوردي',
    purpleTheme: 'المظهر البنفسجي',
    emeraldTheme: 'المظهر الزمردي',
    oceanTheme: 'المظهر المحيطي',
    royalTheme: 'المظهر الملكي',
    indigoTheme: 'المظهر النيلي',
    classicTheme: 'المظهر الكلاسيكي'
  }
};

// Get translation function
function t(key, lang = 'en') {
  const keys = key.split('.');
  let value = translations[lang];
  
  for (const k of keys) {
    value = value?.[k];
    if (value === undefined) break;
  }
  
  return value || key;
}

// Export for use in renderer
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { translations, t };
}