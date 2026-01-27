// src/renderer/js/settings.js
const { ipcRenderer } = require('electron');
const { initSelectLocation } = require('./selectLocation');
const { setLanguage, t, applyLanguageDirection } = require('./translations');
const { state } = require('./globalStore');
const { showToast } = require('./toast');
const { applyTheme } = require('./theme');

let pendingTheme = 'navy';

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
    // Sync pendingTheme with current theme
    pendingTheme = state.settings.theme || 'navy';

    updateSettings();
    initThemeOptions();
    initLanguageOptions();
    initAthkarAlerts();
    initPreAdhanNotification();
}

function initPreAdhanNotification() {
    const toggle = document.getElementById('preAdhanNotificationToggle');
    const minutesInput = document.getElementById('preAdhanMinutesInput');
    const container = document.getElementById('preAdhanMinutesContainer');

    if (toggle && minutesInput) {
        // Init values from state
        toggle.checked = state.settings.preAdhanNotificationEnabled !== false; // Default true
        minutesInput.value = state.settings.preAdhanMinutes || 5;

        // Function to update UI state
        const updateUI = () => {
            if (toggle.checked) {
                container.style.opacity = '1';
                container.style.pointerEvents = 'auto';
                minutesInput.disabled = false;
            } else {
                container.style.opacity = '0.5';
                container.style.pointerEvents = 'none';
                minutesInput.disabled = true;
            }
        };

        // Initial update
        updateUI();

        // Listen for changes
        toggle.addEventListener('change', updateUI);
    }
}

function updateSettings() {
    // Update all text elements
    const elements = {
        'settingsTitle': 'settings',
        'cityLabel': 'city',
        'countryLabel': 'country',
        'themeLabel': 'theme',
        'languageLabel': 'language',
        'cityHint': 'cityHint',
        'countryHint': 'countryHint',
        'footerText': 'madeWith',
        'detectLocationLabel': 'detectLocation',
        'athkarAlertsLabel': 'athkarAlerts',
        'enableAthkarAlertsLabel': 'enableAthkarAlerts',
        'athkarIntervalLabel': 'athkarInterval',
        'minutesLabel': 'minutes',
        'minutesLabel2': 'minutes',
        'preAdhanNotificationLabel': 'preAdhanNotification',
        'enablePreAdhanNotificationLabel': 'enablePreAdhanNotification',
        'preAdhanMinutesLabel': 'minutesBeforeAdhan'
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
        cityInput.value = state.settings.city || '';
    }
    if (countryInput) {
        countryInput.placeholder = t('countryPlaceholder');
        countryInput.value = state.settings.country || '';
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

        // Mark selected theme using state.settings.theme for initial view,
        // but in settings page we interact with pendingTheme somewhat.
        // Actually renderer.js code logic was:
        // Mark selected theme based on `selectedTheme` which was state.settings.theme.
        // When clicking, we update `pendingTheme` and update visual selection.

        // Let's use state.settings.theme as the initial "selected" one.
        // But wait, if I click an option, it becomes "selected" in UI.

        // In renderer.js:
        // if (theme === selectedTheme) { opt.classList.add('selected'); }
        // selectedTheme was a global variable.

        // Here we should probably check against pendingTheme if we want to reflect current selection in settings page
        // or state.settings.theme if we want to reflect saved settings.
        // Usually settings page reflects saved settings until you click, then it reflects pending.

        // Since initThemeOptions is called on init, pendingTheme is set to state.settings.theme.

        if (theme === pendingTheme) {
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
        if (opt.dataset.lang === state.settings.language) {
            opt.classList.add('selected');
        } else {
            opt.classList.remove('selected');
        }

        // Add click handler
        opt.addEventListener('click', () => {
            const newLang = opt.dataset.lang;
            state.settings.language = newLang;
            setLanguage(newLang);

            // Update visual selection
            languageOptions.forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');

            // Apply language direction and update UI
            applyLanguageDirection();
            updateSettings();
            initThemeOptions(); // Update theme labels in new language
        });
    });
}

function initAthkarAlerts() {
    const toggle = document.getElementById('athkarAlertsToggle');
    const intervalInput = document.getElementById('athkarIntervalInput');
    const intervalContainer = document.getElementById('athkarIntervalContainer');

    if (toggle && intervalInput) {
        toggle.checked = state.settings.athkarAlertEnabled || false;
        intervalInput.value = state.settings.athkarAlertInterval || 30;

        const updateState = () => {
            if (toggle.checked) {
                intervalContainer.style.opacity = '1';
                intervalContainer.style.pointerEvents = 'auto';
                intervalInput.disabled = false;
            } else {
                intervalContainer.style.opacity = '0.5';
                intervalContainer.style.pointerEvents = 'none';
                intervalInput.disabled = true;
            }
        };

        // Initial state
        updateState();

        toggle.addEventListener('change', updateState);
    }
}

async function saveSettings() {
    const cityInput = document.getElementById('cityInput');
    const countryInput = document.getElementById('countryInput');
    const athkarAlertsToggle = document.getElementById('athkarAlertsToggle');
    const athkarIntervalInput = document.getElementById('athkarIntervalInput');

    const city = cityInput ? cityInput.value.trim() : '';
    const country = countryInput ? countryInput.value.trim() : '';

    if (!city || !country) {
        showToast(t('enterBothCityCountry'), 'error');
        return;
    }

    try {
        const selectedTheme = pendingTheme; // This was using global variable selectedTheme in renderer.js

        state.settings.city = city;
        state.settings.country = country;
        state.settings.theme = selectedTheme;

        if (athkarAlertsToggle) {
            state.settings.athkarAlertEnabled = athkarAlertsToggle.checked;
        }

        if (athkarIntervalInput) {
            let interval = parseInt(athkarIntervalInput.value);
            if (isNaN(interval) || interval < 1) interval = 30;
            state.settings.athkarAlertInterval = interval;
        }

        const preAdhanToggle = document.getElementById('preAdhanNotificationToggle');
        const preAdhanInput = document.getElementById('preAdhanMinutesInput');

        if (preAdhanToggle) {
            state.settings.preAdhanNotificationEnabled = preAdhanToggle.checked;
        }

        if (preAdhanInput) {
            let minutes = parseInt(preAdhanInput.value);
            if (isNaN(minutes) || minutes < 1) minutes = 5;
            state.settings.preAdhanMinutes = minutes;
        }

        await ipcRenderer.invoke('save-settings', state.settings);

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

module.exports = {
    initSettingsPage
};