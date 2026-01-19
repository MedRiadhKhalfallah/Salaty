// src/renderer/js/prayer.js
// Utilitaires pour la gestion de la date de prière (calcul, formatage, etc.)
const { ipcRenderer } = require('electron');
const { translations, getLanguage, t } = require('../js/translations');
const {   showToast, } = require('../js/toast');
const { getSecondsFromTime, formatTime, getGregorianDate, getHijriDate } = require('../js/dateUtils');
const { state, prayerIcons } = require('../js/globalStore');
const { notifyPrayer } = require('../js/adhan');

let prayerData = null;
let currentActivePrayer = null;
let isFirstLoad = true;
let adhanEnabled = true;
let adhanEnabledByPrayer = {};

/**
 * Retourne la prière courante et la suivante, ainsi que le temps restant
 * @param {object} prayerData
 * @param {object} translations
 * @param {string} lang
 * @param {number} nowSeconds
 * @returns {object} { currentPrayer, nextPrayer, timeRemaining }
 */
function getCurrentAndNextPrayer(prayerData, translations, lang, nowSeconds) {
    if (!prayerData || !prayerData.timings) return {};
    const prayers = Object.keys(translations[lang].prayerNames)
        .filter((key) => prayerData.timings[key])
        .map((key) => {
            const name = translations[lang].prayerNames[key];
            const time = prayerData.timings[key];
            if (!time) return null;
            let prayerSeconds = getSecondsFromTime(time);
            if (prayerSeconds < nowSeconds) prayerSeconds += 86400;
            return {
                key,
                name,
                time,
                seconds: prayerSeconds,
                timeUntil: prayerSeconds - nowSeconds
            };
        })
        .filter(Boolean)
        .sort((a, b) => a.seconds - b.seconds);
    if (prayers.length === 0) return {};
    const currentPrayerIndex = prayers.findIndex(p => p.seconds > nowSeconds) - 1;
    const currentPrayer = currentPrayerIndex >= 0 ? prayers[currentPrayerIndex] : prayers[prayers.length - 1];
    const nextPrayer = prayers[(currentPrayerIndex + 1) % prayers.length] || prayers[0];
    let timeRemaining = nextPrayer.seconds - nowSeconds;
    if (timeRemaining < 0) timeRemaining = 0;
    return { currentPrayer, nextPrayer, timeRemaining };
}

/**
 * Charge les horaires de prière depuis l'API et met à jour l'UI
 */
async function loadPrayerTimes() {
    try {
        const locationEl = document.getElementById('location');
        if (!state.settings.city || !state.settings.country) {
            if (locationEl) {
                locationEl.textContent = t('locationNotSet');
            }
            const loadingEl = document.getElementById('loadingText');
            if (loadingEl) {
                loadingEl.textContent = t('loadingPrayerTimes');
            }
            return;
        }
        if (locationEl) {
            locationEl.textContent = t('loading');
        }
        const url = `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(state.settings.city)}&country=${encodeURIComponent(state.settings.country)}`;
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
        const locationEl = document.getElementById('location');
        if (locationEl) {
            locationEl.textContent = t('errorLoading');
        }
        showToast(t('errorLoading'), 'error');
    }
}

/**
 * Met à jour l'UI avec les horaires de prière
 */
function updatePrayerUI() {
    if (!prayerData) return;
    const lang = getLanguage();
    const locationEl = document.getElementById('location');
    const gregorianDateEl = document.getElementById('gregorianDate');
    const hijriDateEl = document.getElementById('hijriDate');
    const prayerListEl = document.getElementById('prayerList');
    if (locationEl) {
        locationEl.textContent = `${state.settings.city}, ${state.settings.country}`;
    }
    if (gregorianDateEl && hijriDateEl) {
        gregorianDateEl.textContent = getGregorianDate(prayerData);
        hijriDateEl.textContent = getHijriDate(prayerData, lang, t);
    }
    const loadingEl = document.getElementById('loadingText');
    if (loadingEl) {
        loadingEl.textContent = t('loadingPrayerTimes');
    }

    const adhanBtnLabel = adhanEnabled ? t('disableAdhan') : t('enableAdhan');
    const adhanBtnIcon = adhanEnabled ? 'volume-up' : 'volume-mute';
    const adhanToggleBtn = `<button class="adhan-toggle-btn" id="adhanToggleBtn" title="${adhanBtnLabel}"><i class="fas fa-${adhanBtnIcon}"></i> ${adhanBtnLabel}</button>`;


    // Correction : charger l'état adhanEnabled depuis les settings
    adhanEnabled = typeof state.settings.adhanEnabled === 'boolean' ? state.settings.adhanEnabled : true;

    // Charger l'état adhanEnabledByPrayer depuis les settings ou initialiser à true
    if (state.settings.adhanEnabledByPrayer) {
        adhanEnabledByPrayer = { ...state.settings.adhanEnabledByPrayer };
    } else {
        adhanEnabledByPrayer = {};
        Object.keys(translations[getLanguage()].prayerNames).forEach(key => {
            adhanEnabledByPrayer[key] = true;
        });
    }

    const prayerTimesHTML = Object.keys(translations[lang].prayerNames).map((key) => {
        const name = t(key, 'prayerNames');
        const time = prayerData.timings[key];
        const icon = prayerIcons[key] || 'clock';
        const isCurrent = key === currentActivePrayer;
        const adhanOn = adhanEnabledByPrayer[key] !== false;
        const adhanBtnIcon = adhanOn ? 'volume-up' : 'volume-mute';
        const adhanBtnLabel = adhanOn ? t('disableAdhan') : t('enableAdhan');

        return `
      <div class="prayer-item ${isCurrent ? 'current-prayer' : ''}" data-prayer="${key}">
        <i class="fas fa-${icon}"></i>
        <span class="prayer-name">${name}</span>
        <span class="prayer-time">${time} ${isCurrent ? `<span class="current-indicator">${t('now')}</span>` : ''}</span>
        <button class="adhan-toggle-btn" data-prayer="${key}" title="${adhanBtnLabel}"><i class="fas fa-${adhanBtnIcon} adhan-toggle-icon"></i></button>
      </div>
    `;
    }).join('');
    if (prayerListEl) {
        prayerListEl.innerHTML = prayerTimesHTML;
        // Ajouter les listeners sur chaque bouton
        prayerListEl.querySelectorAll('.adhan-toggle-btn').forEach(btn => {
            btn.onclick = (e) => {
                const key = btn.getAttribute('data-prayer');
                toggleAdhanForPrayer(key);
            };
        });
    }
}

/**
 * Met à jour la prière courante et la suivante, et l'UI associée
 */
function updateCurrentAndNextPrayer() {
    try {
        if (!prayerData || !prayerData.timings) return;
        const lang = getLanguage();
        const now = new Date();
        const currentSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
        const { currentPrayer, nextPrayer, timeRemaining: remaining } = getCurrentAndNextPrayer(prayerData, translations, lang, currentSeconds);
        if (!nextPrayer || !currentPrayer) return;
        let timeRemaining = remaining;
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
            if (!isFirstLoad) {
                notifyPrayer(currentPrayer);
            }
            isFirstLoad = false;
        }
    } catch (error) {
        console.error('Error in updateCurrentAndNextPrayer:', error);
    }
}

function toggleAdhanForPrayer(prayerKey) {
    adhanEnabledByPrayer[prayerKey] = !adhanEnabledByPrayer[prayerKey];
    state.settings.adhanEnabledByPrayer = adhanEnabledByPrayer;
    ipcRenderer.invoke('save-settings', state.settings);
    updatePrayerUI();
}

module.exports = {
    getCurrentAndNextPrayer,
    getSecondsFromTime,
    formatTime,
    loadPrayerTimes,
    updateCurrentAndNextPrayer,
};