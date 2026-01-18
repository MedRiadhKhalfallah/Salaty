// src/renderer/js/renderer.js
const { ipcRenderer } = require('electron');
const { setLanguage, t, applyLanguageDirection } = require('../js/translations');
const { initQuranPage } = require('../js/quranUI');
const { initAthkarPage } = require('../js/athkarUI');
const { loadPrayerTimes, updateCurrentAndNextPrayer } = require('../js/prayer');
const { state } = require('../js/globalStore');
const { initSettingsPage } = require('../js/settingsUI');
const { applyTheme } = require('../js/theme');

// ==================== INITIALIZATION ====================
async function initializeApp() {
  try {
    // Load settings from main process
    const settings = await ipcRenderer.invoke('get-settings');
    if (settings) {
      state.settings = { ...state.settings, ...settings };
      const theme = state.settings.theme || 'navy';

      setLanguage(state.settings.language || 'en');

      // Apply theme and language
      applyTheme(theme);
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
    }else if (path.includes('athkar.html')) {
      initAthkarPage();
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
  const athkarBtn = document.getElementById('mainAthkarBtn');

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

  if (athkarBtn) {
    athkarBtn.addEventListener('click', () => {
      ipcRenderer.invoke('resize-window', 850, 600);
      ipcRenderer.invoke('navigate-to', 'athkar');
    });
  }

  // Initialize loading text
  const loadingEl = document.getElementById('loadingText');
  if (loadingEl) {
    loadingEl.textContent = t('loadingPrayerTimes');
  }

  // Start prayer times functionality
  loadPrayerTimes();
  setInterval(updateCurrentAndNextPrayer, 1000);
  setInterval(loadPrayerTimes, 3600000);
}


// ==================== START THE APP ====================
document.addEventListener('DOMContentLoaded', initializeApp);