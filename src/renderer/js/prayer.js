// src/renderer/js/prayer.js
// Utilitaires pour la gestion de la date de prière (calcul, formatage, etc.)
const { translations, getLanguage, t } = require('../js/translations');
const {   showToast, } = require('../js/toast');
const { getSecondsFromTime, formatTime, getGregorianDate, getHijriDate } = require('../js/dateUtils');
const { state, prayerIcons } = require('../js/globalStore');

let prayerData = null;
let currentActivePrayer = null;

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
        }
    } catch (error) {
        console.error('Error in updateCurrentAndNextPrayer:', error);
    }
}

module.exports = {
    getCurrentAndNextPrayer,
    getSecondsFromTime,
    formatTime,
    loadPrayerTimes,
    updateCurrentAndNextPrayer,
};