const { ipcRenderer } = require('electron');
const { initSelectLocation } = require('./javascript/selectLocation');

let currentSettings = { theme: 'navy', city: '', country: '', language: 'en' };
let prayerData = null;

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
      ah: 'AH'
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
      ah: 'هـ'
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

  // Add or remove RTL class from body
  document.body.classList.toggle('rtl', isRTL);
}

async function initApp() {
  try {
    selectedTheme = 'navy';
    pendingTheme = 'navy';
    applyTheme('navy');

    try {
      const settings = await ipcRenderer.invoke('get-settings');
      if (settings) {
        currentSettings = { ...currentSettings, ...settings };
        if (currentSettings.theme) {
          selectedTheme = currentSettings.theme;
          pendingTheme = currentSettings.theme;
          applyTheme(currentSettings.theme);
        }
        // Apply language direction
        applyLanguageDirection();
      }
    } catch (error) {
      console.warn('Could not load settings, using defaults:', error);
    }

    updateSettingsInputs();
    initThemeUI();
    updateLanguageUI();

    await loadPrayerTimes();

    setInterval(updateCurrentAndNextPrayer, 1000);
    setInterval(loadPrayerTimes, 3600000);

    updateCurrentAndNextPrayer();
  } catch (error) {
    console.error('Error initializing app:', error);
    showToast(t('errorLoading'), 'error');
    const container = document.getElementById('prayerCards') || document.getElementById('prayerTimes');
    if (container) {
      container.innerHTML = `<div class="loading">${t('errorLoading')}</div>`;
    }
  }
}

async function loadPrayerTimes() {
  const prayerTimesContainer = document.getElementById('prayerList');

  try {
    if (!currentSettings.city || !currentSettings.country) {
      throw new Error(t('locationNotSet'));
    }

    if (prayerTimesContainer) {
      prayerTimesContainer.innerHTML = `<div class="loading">${t('loadingPrayerTimes')}</div>`;
    }

    const url = `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(currentSettings.city)}&country=${encodeURIComponent(currentSettings.country)}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data && data.code === 200) {
      prayerData = data.data;
      updateUI();
      return true;
    } else {
      const errorMsg = data?.data?.message || 'Invalid response from server';
      throw new Error(errorMsg);
    }
  } catch (error) {
    console.error('Error loading prayer times:', error);
    const errorMessage = error.message.includes('Failed to fetch')
      ? t('networkError')
      : `${t('errorLoading')}: ${error.message}`;

    showToast(t('errorLoading'), 'error');

    if (prayerTimesContainer) {
      prayerTimesContainer.innerHTML = `
        <div class="error-message">
          <i class="fas fa-exclamation-triangle"></i>
          <div>${errorMessage}</div>
          <button id="retryButton" class="retry-button">
            <i class="fas fa-sync-alt"></i> ${t('retry')}
          </button>
        </div>
      `;

      const retryButton = document.getElementById('retryButton');
      if (retryButton) {
        retryButton.addEventListener('click', loadPrayerTimes);
      }
    }

    return false;
  }
}

function updateUI() {
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
    // Format date properly for RTL
    if (lang === 'ar') {
      // Keep the date in LTR format even in Arabic mode
      gregorianDateEl.style.direction = 'ltr';
      gregorianDateEl.style.textAlign = 'center';
    } else {
      gregorianDateEl.style.direction = 'ltr';
      gregorianDateEl.style.textAlign = 'center';
    }
    gregorianDateEl.textContent = prayerData.date.readable;
  }
  if (hijriDateEl) {
    const hijriMonth = lang === 'ar' ? prayerData.date.hijri.month.ar : prayerData.date.hijri.month.en;
    hijriDateEl.textContent = `${prayerData.date.hijri.day} ${hijriMonth} ${prayerData.date.hijri.year} ${t('ah')}`;
  }

  const now = new Date();
  const currentSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  let currentPrayerKey = '';

  const prayerTimes = [];

  for (const key of Object.keys(translations[lang].prayerNames)) {
    const time = prayerData.timings[key];
    if (!time) continue;

    const [hours, minutes] = time.split(':').map(Number);
    let prayerSeconds = hours * 3600 + minutes * 60;

    prayerTimes.push({
      key: key,
      seconds: prayerSeconds
    });
  }

  prayerTimes.sort((a, b) => a.seconds - b.seconds);

  for (let i = 0; i < prayerTimes.length; i++) {
    if (prayerTimes[i].seconds <= currentSeconds) {
      currentPrayerKey = prayerTimes[i].key;
    } else {
      break;
    }
  }

  if (!currentPrayerKey && prayerTimes.length > 0) {
    currentPrayerKey = prayerTimes[prayerTimes.length - 1].key;
  }

  const prayerTimesHTML = Object.keys(translations[lang].prayerNames).map((key) => {
    const name = t(key, 'prayerNames');
    const time = prayerData.timings[key];
    const icon = prayerIcons[key] || 'clock';
    const isCurrent = key === currentPrayerKey;
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

  const countdownElement = document.getElementById('countdown');
  if (countdownElement && typeof timeRemaining !== 'undefined') {
    const remaining = timeRemaining > 0 ? timeRemaining : 0;
    countdownElement.textContent = formatTime(remaining);
  }
}

function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

let currentActivePrayer = null;
let timeRemaining = 0;

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
      updateUI();
    }
  } catch (error) {
    console.error('Error in updateCurrentAndNextPrayer:', error);
  }
}

let selectedTheme = 'navy';
let pendingTheme = 'navy';

function initThemeUI() {
  document.querySelectorAll('.theme-option').forEach(opt => {
    opt.classList.toggle('selected', opt.dataset.theme === selectedTheme);
  });
  updateSaveButtonTheme(selectedTheme);
}

function updateLanguageUI() {
  const lang = getCurrentLanguage();

  // Update settings panel text
  const settingsTitle = document.getElementById('settingsTitle');
  const cityLabel = document.getElementById('cityLabel');
  const countryLabel = document.getElementById('countryLabel');
  const themeLabel = document.getElementById('themeLabel');
  const languageLabel = document.getElementById('languageLabel');
  const cityInput = document.getElementById('cityInput');
  const countryInput = document.getElementById('countryInput');
  const cityHint = document.getElementById('cityHint');
  const countryHint = document.getElementById('countryHint');
  const saveBtn = document.getElementById('saveBtn');
  const footerText = document.getElementById('footerText');

  if (settingsTitle) settingsTitle.textContent = t('settings');
  if (cityLabel) cityLabel.textContent = t('city');
  if (countryLabel) countryLabel.textContent = t('country');
  if (themeLabel) themeLabel.textContent = t('theme');
  if (languageLabel) languageLabel.textContent = t('language');
  if (cityInput) cityInput.placeholder = t('cityPlaceholder');
  if (countryInput) countryInput.placeholder = t('countryPlaceholder');
  if (cityHint) cityHint.textContent = t('cityHint');
  if (countryHint) countryHint.textContent = t('countryHint');
  if (saveBtn) saveBtn.textContent = t('save');
  if (footerText) footerText.innerHTML = t('madeWith');

  // Update theme option labels
  document.querySelectorAll('.theme-option').forEach(opt => {
    const theme = opt.dataset.theme;
    opt.textContent = t(theme, 'themes');
  });

  // Update language selector
  document.querySelectorAll('.language-option').forEach(opt => {
    opt.classList.toggle('selected', opt.dataset.lang === lang);
  });
}

function applyTheme(theme) {
  const app = document.getElementById('app');
  const themeClasses = [
    'theme-dark', 'theme-blue', 'theme-green', 'theme-brown',
    'theme-gold', 'theme-pink', 'theme-purple', 'theme-emerald',
    'theme-ocean', 'theme-royal', 'theme-indigo', 'theme-classic', 'theme-navy'
  ];
  app.classList.remove(...themeClasses);
  app.classList.add(`theme-${theme}`);

  updateSaveButtonTheme(theme);
}

function updateSaveButtonTheme(theme) {
  const saveBtn = document.querySelector('.save-btn');
  if (saveBtn) {
    const gradients = {
      'navy': 'linear-gradient(90deg, #0a1128, #1a237e)',
      'green': 'linear-gradient(90deg, #1b5e20, #2e7d32)',
      'brown': 'linear-gradient(90deg, #4e342e, #6d4c41)',
      'gold': 'linear-gradient(90deg, #8e6e19, #b5982c)',
      'pink': 'linear-gradient(90deg, #7a1a4a, #b51a5c)'
    };
    saveBtn.style.setProperty('--accent-gradient', gradients[theme] || gradients['navy']);
  }
}

document.addEventListener('click', (e) => {
  if (e.target.classList.contains('theme-option')) {
    const newTheme = e.target.dataset.theme;
    pendingTheme = newTheme;

    document.querySelectorAll('.theme-option').forEach(opt => {
      opt.classList.toggle('selected', opt.dataset.theme === newTheme);
    });

    updateSaveButtonTheme(newTheme);
  }

  if (e.target.classList.contains('language-option') || e.target.closest('.language-option')) {
    const langOption = e.target.classList.contains('language-option') ? e.target : e.target.closest('.language-option');
    const newLang = langOption.dataset.lang;
    currentSettings.language = newLang;

    applyLanguageDirection();
    updateLanguageUI();
    updateUI();
    updateCurrentAndNextPrayer();

    document.querySelectorAll('.language-option').forEach(opt => {
      opt.classList.toggle('selected', opt.dataset.lang === newLang);
    });
  }
});

function toggleSettings() {
  const settingsPanel = document.getElementById('settingsPanel');
  const isActive = settingsPanel.classList.contains('active');

  if (isActive) {
    document.body.classList.remove('settings-open');
    settingsPanel.classList.remove('active');
    setTimeout(() => {
      if (!settingsPanel.classList.contains('active')) {
        settingsPanel.style.display = 'none';
      }
    }, 300);
  } else {
    document.body.classList.add('settings-open');
    settingsPanel.style.display = 'flex';
    void settingsPanel.offsetWidth;
    settingsPanel.classList.add('active');

    updateSettingsInputs();
    settingsPanel.scrollTop = 0;
  }

  if (event) event.stopPropagation();
  document.body.style.overflow = settingsPanel.classList.contains('active') ? 'hidden' : '';
}

function updateSettingsInputs() {
  const cityInput = document.getElementById('cityInput');
  const countryInput = document.getElementById('countryInput');

  if (cityInput) cityInput.value = currentSettings.city || '';
  if (countryInput) countryInput.value = currentSettings.country || '';
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
    applyTheme(selectedTheme);

    currentSettings.city = city;
    currentSettings.country = country;
    currentSettings.theme = selectedTheme;

    await ipcRenderer.invoke('save-settings', currentSettings);

    const prayerListEl = document.getElementById('prayerList');
    if (prayerListEl) {
      prayerListEl.innerHTML = `<div class="loading">${t('loadingPrayerTimes')}</div>`;
    }

    await loadPrayerTimes();

    toggleSettings();
    showToast(t('settingsSaved'), 'success');
  } catch (error) {
    console.error('Error saving settings:', error);
    showToast(t('errorSaving'), 'error');
  }
}

async function minimizeWindow() {
  await ipcRenderer.invoke('minimize-window');
}

function closeWindow() {
  ipcRenderer.invoke('close-window');
}

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

document.addEventListener('DOMContentLoaded', () => {
  initApp();

  const settingsBtn = document.getElementById('mainSettingsBtn');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', toggleSettings);
  }

  const style = document.createElement('style');
  style.textContent = `
    .settings-btn {
      transition: opacity 0.2s ease, transform 0.2s ease;
    }
  `;
  document.head.appendChild(style);

  initSelectLocation();
});