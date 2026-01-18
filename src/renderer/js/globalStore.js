// src/renderer/js/globalStore.js

const prayerIcons = {
    'Fajr': 'cloud-moon',
    'Dhuhr': 'sun',
    'Asr': 'cloud-sun',
    'Maghrib': 'cloud',
    'Isha': 'moon'
};

const state = {
    settings: { theme: 'navy', city: '', country: '', language: 'en' }
};

module.exports = {
    prayerIcons,
    state
};