// src/renderer/js/renderer.js
const { ipcRenderer } = require('electron');
const { setLanguage, t, applyLanguageDirection } = require('../js/translations');
const { initQuranPage } = require('../js/quranUI');
const { initAthkarPage } = require('../js/athkarUI');
const { initFeaturesPage } = require('../js/featuresUI');
const { initRamadanPage } = require('../js/ramadanUI');
const { loadPrayerTimes, updateCurrentAndNextPrayer } = require('../js/prayer');
const { state } = require('../js/globalStore');
const { initSettingsPage } = require('../js/settings');
const { initQiblaPage } = require('../js/qibla');
const { initAsmaPage } = require('../js/asmaUI');
const { applyTheme } = require('../js/theme');
const { initAthkarAlertsSystem } = require('../js/athkarAlerts');

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

      // Initialize Athkar Alerts System
      initAthkarAlertsSystem();
    }

    // Check which page we're on and initialize accordingly
    const path = window.location.pathname;
    if (path.includes('index.html') || path.endsWith('/')) {
      initMainPage();
    } else if (path.includes('settings.html')) {
      initSettingsPage();
    } else if (path.includes('quran.html')) {
      initQuranPage();
    } else if (path.includes('athkar.html')) {
      console.log('Initializing Athkar page from renderer.js');
      initAthkarPage();
    } else if (path.includes('features.html')) {
      console.log('Initializing Features page from renderer.js');
      initFeaturesPage();
    } else if (path.includes('ramadan.html')) {
      console.log('Initializing Ramadan page from renderer.js');
      initRamadanPage();
    } else if (path.includes('qibla.html')) {
      console.log('Initializing Qibla page from renderer.js');
      initQiblaPage();
    } else if (path.includes('asma.html')) {
      console.log('Initializing Asmallah page from renderer.js');
      initAsmaPage();
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

  // Setup update handlers
  setupUpdateHandlers();
}

function setupUpdateHandlers() {
    const modal = document.getElementById('updateModal');
    if (!modal) return; // Only if modal exists on this page

    const titleCtx = document.getElementById('updateTitle');
    const messageCtx = document.getElementById('updateMessage');
    const updateBtn = document.getElementById('updateActionBtn');
    const cancelBtn = document.getElementById('updateCancelBtn');
    const progressBar = document.getElementById('updateProgress');
    const progressBarFill = document.getElementById('updateProgressBar');
    const progressText = document.getElementById('updateProgressText');

    let updateInfo = null;
    let isUpdateDownloaded = false;

    // Reset UI state
    function resetUI() {
        modal.classList.remove('show');
        progressBar.classList.add('hidden');
        if (updateBtn) {
            updateBtn.textContent = t('download');
            updateBtn.disabled = false;
        }
        if (cancelBtn) cancelBtn.style.display = 'block';
    }

    // Close modal action
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            modal.classList.remove('show');
        });
    }

    // Main update action
    if (updateBtn) {
        updateBtn.addEventListener('click', () => {
            if (!isUpdateDownloaded) {
                // Start download
                ipcRenderer.send('start-download');
                updateBtn.disabled = true;
                if (cancelBtn) cancelBtn.style.display = 'none'; // Prevent cancelling during download
                progressBar.classList.remove('hidden');
            } else {
                // Install and restart
                ipcRenderer.send('install-update');
            }
        });
    }

    // Listeners from Main Process
    ipcRenderer.on('update-available', (event, info) => {
        isUpdateDownloaded = false;
        updateInfo = info;
        if (titleCtx) titleCtx.textContent = t('updateAvailable');
        if (messageCtx) messageCtx.textContent = t('newVersionAvailable').replace('{version}', info.version);
        if (updateBtn) updateBtn.textContent = t('download');
        if (cancelBtn) {
          cancelBtn.style.display = 'block';
          cancelBtn.textContent = t('later');
        }
        if (progressBar) progressBar.classList.add('hidden');

        modal.classList.add('show');
    });

    ipcRenderer.on('download-progress', (event, progressObj) => {
        if (progressBar) progressBar.classList.remove('hidden');
        const percentage = Math.round(progressObj.percent);
        if (progressBarFill) progressBarFill.style.width = percentage + '%';
        if (progressText) progressText.textContent = percentage + '%';
    });

    ipcRenderer.on('update-downloaded', (event, info) => {
        isUpdateDownloaded = true;
        if (titleCtx) titleCtx.textContent = t('updateReady');
        if (messageCtx) messageCtx.textContent = t('updateDownloaded');
        if (updateBtn) {
            updateBtn.textContent = t('install');
            updateBtn.disabled = false;
        }
        if (progressBar) progressBar.classList.add('hidden');

        modal.classList.add('show');
    });
}

// ==================== MAIN PAGE FUNCTIONS ====================
function initMainPage() {
  // Setup navigation buttons
  const settingsBtn = document.getElementById('mainSettingsBtn');
  const featuresBtn = document.getElementById('mainFeaturesBtn');

  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      ipcRenderer.invoke('navigate-to', 'settings');
    });
  }

  if (featuresBtn) {
    featuresBtn.addEventListener('click', () => {
      ipcRenderer.invoke('resize-window', 320, 575);
      ipcRenderer.invoke('navigate-to', 'features');
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