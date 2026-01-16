// src/renderer/js/renderer.js
const { ipcRenderer } = require('electron');
const { initSelectLocation } = require('../js/selectLocation');

// Global variables
let currentSettings = { theme: 'navy', city: '', country: '', language: 'en' };
let prayerData = null;
let selectedTheme = 'navy';
let pendingTheme = 'navy';
let currentActivePrayer = null;
let timeRemaining = 0;
let quranIframeLoaded = false;
let quranLoadingTimeout = null;
let isFullscreen = false;

// Translation object
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

const prayerIcons = {
  'Fajr': 'cloud-moon',
  'Dhuhr': 'sun',
  'Asr': 'cloud-sun',
  'Maghrib': 'cloud',
  'Isha': 'moon'
};

// Get current language
function getCurrentLanguage() {
  return currentSettings.language || 'en';
}

// Get translated text
function t(key, section = 'ui') {
  const lang = getCurrentLanguage();
  const parts = key.split('.');
  let value = translations[lang][section];

  for (const part of parts) {
    value = value?.[part];
  }

  return value || key;
}

// Apply RTL/LTR direction
function applyLanguageDirection() {
  const lang = getCurrentLanguage();
  const isRTL = lang === 'ar';

  document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
  document.documentElement.lang = lang;
  document.body.classList.toggle('rtl', isRTL);
}

// Apply theme
function applyTheme(theme) {
  const app = document.getElementById('app');
  if (!app) return;
  
  const themeClasses = [
    'theme-dark', 'theme-blue', 'theme-green', 'theme-brown', 
    'theme-gold', 'theme-pink', 'theme-purple', 'theme-emerald',
    'theme-ocean', 'theme-royal', 'theme-indigo', 'theme-classic', 'theme-navy'
  ];
  app.classList.remove(...themeClasses);
  app.classList.add(`theme-${theme}`);
}

// Format time helper
function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Toast notification
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const app = document.getElementById('app');
  const styles = window.getComputedStyle(app);
  
  const bgColor = styles.getPropertyValue('--accent-color') || 'rgba(76, 175, 80, 0.9)';
  toast.style.background = bgColor;
  
  let icon = 'info-circle';
  if (type === 'success') icon = 'check-circle';
  if (type === 'error') {
    icon = 'exclamation-circle';
    toast.style.background = 'rgba(244, 67, 54, 0.9)';
  }
  
  toast.innerHTML = `
    <i class="fas fa-${icon}"></i>
    <span>${message}</span>
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => toast.classList.add('show'), 10);
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// ==================== INITIALIZATION ====================
async function initializeApp() {
  try {
    // Load settings from main process
    const settings = await ipcRenderer.invoke('get-settings');
    if (settings) {
      currentSettings = { ...currentSettings, ...settings };
      selectedTheme = currentSettings.theme || 'navy';
      pendingTheme = selectedTheme;
      
      // Apply theme and language
      applyTheme(selectedTheme);
      applyLanguageDirection();
    }
    
    // Check which page we're on and initialize accordingly
    const path = window.location.pathname;
    if (path.includes('index.html') || path.endsWith('/')) {
      initMainPage();
    } else if (path.includes('settings.html')) {
      initSettingsPage();
    } else if (path.includes('quran.html')) {
      initQuranPage();
    }
    
    // Setup window controls (common to all pages)
    setupWindowControls();
    
  } catch (error) {
    console.error('Error initializing app:', error);
  }
}

// Setup window controls
function setupWindowControls() {
  const minimizeBtn = document.getElementById('minimizeBtn');
  const closeBtn = document.getElementById('closeBtn');
  
  if (minimizeBtn) {
    minimizeBtn.addEventListener('click', async () => {
      await ipcRenderer.invoke('minimize-window');
    });
  }
  
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      ipcRenderer.invoke('close-window');
    });
  }
}

// ==================== MAIN PAGE FUNCTIONS ====================
function initMainPage() {
  // Setup navigation buttons
  const settingsBtn = document.getElementById('mainSettingsBtn');
  const quranBtn = document.getElementById('mainQuranBtn');
  
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      ipcRenderer.invoke('navigate-to', 'settings');
    });
  }
  
  if (quranBtn) {
    quranBtn.addEventListener('click', () => {
      ipcRenderer.invoke('resize-window', 850, 600);
      ipcRenderer.invoke('navigate-to', 'quran');
    });
  }
  
  // Start prayer times functionality
  loadPrayerTimes();
  setInterval(updateCurrentAndNextPrayer, 1000);
  setInterval(loadPrayerTimes, 3600000);
}

async function loadPrayerTimes() {
  try {
    if (!currentSettings.city || !currentSettings.country) {
      const locationEl = document.getElementById('location');
      if (locationEl) {
        locationEl.textContent = t('locationNotSet');
      }
      return;
    }

    const url = `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(currentSettings.city)}&country=${encodeURIComponent(currentSettings.country)}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data && data.code === 200) {
      prayerData = data.data;
      updatePrayerUI();
    } else {
      throw new Error('Invalid response from server');
    }
  } catch (error) {
    console.error('Error loading prayer times:', error);
    showToast(t('errorLoading'), 'error');
  }
}

function updatePrayerUI() {
  if (!prayerData) return;

  const lang = getCurrentLanguage();

  const locationEl = document.getElementById('location');
  const gregorianDateEl = document.getElementById('gregorianDate');
  const hijriDateEl = document.getElementById('hijriDate');
  const prayerListEl = document.getElementById('prayerList');

  if (locationEl) {
    locationEl.textContent = `${currentSettings.city}, ${currentSettings.country}`;
  }
  if (gregorianDateEl) {
    gregorianDateEl.textContent = prayerData.date.readable;
  }
  if (hijriDateEl) {
    const hijriMonth = lang === 'ar' ? prayerData.date.hijri.month.ar : prayerData.date.hijri.month.en;
    hijriDateEl.textContent = `${prayerData.date.hijri.day} ${hijriMonth} ${prayerData.date.hijri.year} ${t('ah')}`;
  }

  const prayerTimesHTML = Object.keys(translations[lang].prayerNames).map((key) => {
    const name = t(key, 'prayerNames');
    const time = prayerData.timings[key];
    const icon = prayerIcons[key] || 'clock';
    const isCurrent = key === currentActivePrayer;
    return `
      <div class="prayer-item ${isCurrent ? 'current-prayer' : ''}" data-prayer="${key}">
        <i class="fas fa-${icon}"></i>
        <span class="prayer-name">${name}</span>
        <span class="prayer-time">${time} ${isCurrent ? `<span class="current-indicator">${t('now')}</span>` : ''}</span>
      </div>
    `;
  }).join('');

  if (prayerListEl) {
    prayerListEl.innerHTML = prayerTimesHTML;
  }
}

function updateCurrentAndNextPrayer() {
  try {
    if (!prayerData || !prayerData.timings) return;

    const lang = getCurrentLanguage();
    const now = new Date();
    const currentSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    let currentPrayer = null;
    let nextPrayer = null;
    timeRemaining = 0;

    const prayers = Object.keys(translations[lang].prayerNames)
      .filter((key) => prayerData.timings[key])
      .map((key) => {
        const name = t(key, 'prayerNames');
        const time = prayerData.timings[key];
        if (!time) return null;

        const [hours, minutes] = time.split(':').map(Number);
        let prayerSeconds = hours * 3600 + minutes * 60;
        if (prayerSeconds < currentSeconds) {
          prayerSeconds += 86400;
        }

        return {
          key: key,
          name: name,
          time: time,
          seconds: prayerSeconds,
          timeUntil: prayerSeconds - currentSeconds
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.seconds - b.seconds);

    if (prayers.length === 0) return;

    const currentPrayerIndex = prayers.findIndex(p => p.seconds > currentSeconds) - 1;
    currentPrayer = currentPrayerIndex >= 0 ? prayers[currentPrayerIndex] : prayers[prayers.length - 1];
    nextPrayer = prayers[(currentPrayerIndex + 1) % prayers.length] || prayers[0];

    if (!nextPrayer) return;

    timeRemaining = nextPrayer.seconds - currentSeconds;
    if (timeRemaining < 0) timeRemaining = 0;

    const prayerChanged = currentActivePrayer !== currentPrayer.key;
    currentActivePrayer = currentPrayer.key;

    const prayerCardsContainer = document.getElementById('prayerCards');
    if (prayerCardsContainer) {
      prayerCardsContainer.innerHTML = `
        <div class="prayer-card current">
          <div class="prayer-label">${t('currentPrayer')}</div>
          <div class="prayer-name">${currentPrayer?.name || '--'}</div>
          <div class="prayer-time">${currentPrayer?.time || '--:--'}</div>
          <div class="time-remaining">${t('endTime')} - ${nextPrayer?.time || '--:--'}</div>
        </div>
        <div class="prayer-card next">
          <div class="prayer-label">${t('nextPrayer')}</div>
          <div class="prayer-name">${nextPrayer?.name || '--'}</div>
          <div class="prayer-time">${nextPrayer?.time || '--:--'}</div>
          <div class="countdown" id="countdown">${formatTime(timeRemaining)}</div>
        </div>
      `;
    }

    if (prayerChanged) {
      updatePrayerUI();
    }
  } catch (error) {
    console.error('Error in updateCurrentAndNextPrayer:', error);
  }
}

// ==================== SETTINGS PAGE FUNCTIONS ====================
function initSettingsPage() {

  initSelectLocation();

  // Setup back button
  const backBtn = document.getElementById('backBtn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      ipcRenderer.invoke('go-back');
    });
  }
  
  // Setup save button
  const saveBtn = document.getElementById('saveBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', saveSettings);
  }
  
  // Initialize UI
  updateSettingsUI();
  initThemeOptions();
  initLanguageOptions();
}

function updateSettingsUI() {
  // Update all text elements
  const elements = {
    'settingsTitle': 'settings',
    'cityLabel': 'city',
    'countryLabel': 'country',
    'themeLabel': 'theme',
    'languageLabel': 'language',
    'cityHint': 'cityHint',
    'countryHint': 'countryHint',
    'footerText': 'madeWith'
  };
  
  for (const [id, key] of Object.entries(elements)) {
    const element = document.getElementById(id);
    if (element) {
      if (id === 'footerText') {
        element.innerHTML = t(key);
      } else {
        element.textContent = t(key);
      }
    }
  }
  
  // Update placeholders
  const cityInput = document.getElementById('cityInput');
  const countryInput = document.getElementById('countryInput');
  const saveBtn = document.getElementById('saveBtn');
  
  if (cityInput) {
    cityInput.placeholder = t('cityPlaceholder');
    cityInput.value = currentSettings.city || '';
  }
  if (countryInput) {
    countryInput.placeholder = t('countryPlaceholder');
    countryInput.value = currentSettings.country || '';
  }
  if (saveBtn) {
    saveBtn.textContent = t('save');
  }
}

function initThemeOptions() {
  const themeOptionsContainer = document.getElementById('themeOptions');
  if (!themeOptionsContainer) return;
  
  const themeOptions = themeOptionsContainer.querySelectorAll('.theme-option');
  themeOptions.forEach(opt => {
    const theme = opt.dataset.theme;
    opt.textContent = t(theme, 'themes');
    
    // Mark selected theme
    if (theme === selectedTheme) {
      opt.classList.add('selected');
    } else {
      opt.classList.remove('selected');
    }
    
    // Add click handler
    opt.addEventListener('click', () => {
      pendingTheme = theme;
      
      // Update visual selection
      themeOptions.forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      
      // Apply theme preview
      applyTheme(pendingTheme);
    });
  });
}

function initLanguageOptions() {
  const languageOptionsContainer = document.getElementById('languageOptions');
  if (!languageOptionsContainer) return;
  
  const languageOptions = languageOptionsContainer.querySelectorAll('.language-option');
  languageOptions.forEach(opt => {
    // Mark selected language
    if (opt.dataset.lang === currentSettings.language) {
      opt.classList.add('selected');
    } else {
      opt.classList.remove('selected');
    }
    
    // Add click handler
    opt.addEventListener('click', () => {
      const newLang = opt.dataset.lang;
      currentSettings.language = newLang;
      
      // Update visual selection
      languageOptions.forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      
      // Apply language direction and update UI
      applyLanguageDirection();
      updateSettingsUI();
      initThemeOptions(); // Update theme labels in new language
    });
  });
}

async function saveSettings() {
  const cityInput = document.getElementById('cityInput');
  const countryInput = document.getElementById('countryInput');

  const city = cityInput ? cityInput.value.trim() : '';
  const country = countryInput ? countryInput.value.trim() : '';

  if (!city || !country) {
    showToast(t('enterBothCityCountry'), 'error');
    return;
  }

  try {
    selectedTheme = pendingTheme;
    
    currentSettings.city = city;
    currentSettings.country = country;
    currentSettings.theme = selectedTheme;

    await ipcRenderer.invoke('save-settings', currentSettings);
    
    showToast(t('settingsSaved'), 'success');
    
    // Go back to main screen after a short delay
    setTimeout(() => {
      ipcRenderer.invoke('go-back');
    }, 1500);
  } catch (error) {
    console.error('Error saving settings:', error);
    showToast(t('errorSaving'), 'error');
  }
}

// ==================== QURAN PAGE FUNCTIONS ====================
function initQuranPage() {
  // Setup back button
  const backBtn = document.getElementById('backBtn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      ipcRenderer.invoke('resize-window', 320, 540);
      ipcRenderer.invoke('go-back');
    });
  }
  
  // Update UI text
  updateQuranUI();
  
  // Setup controls
  setupQuranControls();
  
  // Load Quran iframe
  loadQuranIframe();
}

function updateQuranUI() {
  const quranTitle = document.getElementById('quranTitle');
  const quranFooterText = document.getElementById('quranFooterText');
  const loadingText = document.getElementById('loadingText');
  const quranFullscreenBtn = document.getElementById('quranFullscreenBtn');
  const quranRefreshBtn = document.getElementById('quranRefreshBtn');
  
  if (quranTitle) quranTitle.textContent = t('holyQuran');
  if (quranFooterText) quranFooterText.textContent = t('listenReadQuran');
  if (loadingText) loadingText.textContent = t('loadingQuran');
  
  if (quranFullscreenBtn) {
    quranFullscreenBtn.setAttribute('aria-label', isFullscreen ? t('exitFullscreen') : t('enterFullscreen'));
    const icon = quranFullscreenBtn.querySelector('i');
    if (icon) {
      icon.className = isFullscreen ? 'fas fa-compress' : 'fas fa-expand';
    }
  }
  
  if (quranRefreshBtn) {
    quranRefreshBtn.setAttribute('aria-label', t('refreshQuran'));
  }
}

function setupQuranControls() {
  const quranFullscreenBtn = document.getElementById('quranFullscreenBtn');
  const quranRefreshBtn = document.getElementById('quranRefreshBtn');
  
  if (quranFullscreenBtn) {
    quranFullscreenBtn.addEventListener('click', toggleQuranFullscreen);
  }
  
  if (quranRefreshBtn) {
    quranRefreshBtn.addEventListener('click', forceReloadQuran);
  }
}

function loadQuranIframe() {
  const quranIframe = document.getElementById('quranIframe');
  const quranLoading = document.getElementById('quranLoading');
  
  if (!quranIframe || quranIframeLoaded) return;
  
  console.log('Loading Tanzil Quran...');
  
  // Clear any existing timeout
  if (quranLoadingTimeout) {
    clearTimeout(quranLoadingTimeout);
  }
  
  // Load with cache-busting parameter
  const timestamp = new Date().getTime();
  const quranUrl = `https://tanzil.net/?embed=true&nohead=true&cache=${timestamp}`;
  
  quranIframe.src = quranUrl;
  quranIframeLoaded = true;
  
  // Set timeout for loading failure
  quranLoadingTimeout = setTimeout(() => {
    if (quranLoading && quranLoading.style.display !== 'none') {
      showQuranError();
    }
  }, 10000);
  
  // Setup iframe event listeners
  quranIframe.onload = function() {
    console.log('Quran iframe loaded successfully');
    
    if (quranLoadingTimeout) {
      clearTimeout(quranLoadingTimeout);
      quranLoadingTimeout = null;
    }
    
    if (quranLoading) {
      quranLoading.style.display = 'none';
    }
    quranIframe.style.display = 'block';
  };
  
  quranIframe.onerror = function() {
    console.error('Quran iframe failed to load');
    
    if (quranLoadingTimeout) {
      clearTimeout(quranLoadingTimeout);
    }
    
    showQuranError();
  };
}

function showQuranError() {
  const quranLoading = document.getElementById('quranLoading');
  if (!quranLoading) return;
  
  quranLoading.innerHTML = `
    <div class="quran-loading-content">
      <i class="fas fa-exclamation-triangle"></i>
      <span>${t('quranError')}</span>
      <button class="retry-button" id="retryQuranBtn">
        <i class="fas fa-sync-alt"></i> ${t('retry')}
      </button>
    </div>
  `;
  
  const retryBtn = document.getElementById('retryQuranBtn');
  if (retryBtn) {
    retryBtn.addEventListener('click', forceReloadQuran);
  }
}

function forceReloadQuran() {
  const quranIframe = document.getElementById('quranIframe');
  const quranLoading = document.getElementById('quranLoading');
  
  if (quranLoading) {
    quranLoading.style.display = 'flex';
    quranLoading.innerHTML = `
      <div class="quran-loading-content">
        <i class="fas fa-book-quran fa-spin"></i>
        <span>${t('loadingQuran')}</span>
      </div>
    `;
  }
  
  if (quranIframe) {
    quranIframe.style.display = 'none';
    quranIframe.src = 'about:blank';
    quranIframeLoaded = false;
    
    setTimeout(() => {
      loadQuranIframe();
    }, 100);
  }
}

function toggleQuranFullscreen() {
  isFullscreen = !isFullscreen;
  
  if (isFullscreen) {
    ipcRenderer.invoke('resize-window', 1024, 768);
    document.body.classList.add('fullscreen');
  } else {
    ipcRenderer.invoke('resize-window', 850, 600);
    document.body.classList.remove('fullscreen');
  }
  
  updateQuranUI();
}

// ==================== START THE APP ====================
document.addEventListener('DOMContentLoaded', initializeApp);