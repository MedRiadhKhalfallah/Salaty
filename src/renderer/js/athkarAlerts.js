const { ipcRenderer } = require('electron');
const { state } = require('./globalStore');
const { getAdkar } = require('./config-api/api');
let adkarData = require('../data/adkar.json');

let alertIntervalId = null;

/** Flat list of all athkar entries from every category */
let allAthkarList = [];
/** Shuffled queue used to cycle through every athkar before repeating */
let athkarQueue = [];

/**
 * Fisher-Yates shuffle — returns a new shuffled array copy.
 * @param {Array} arr
 * @returns {Array}
 */
function shuffleArray(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

/**
 * Build / rebuild the flat list from all categories in adkarData
 * and reset the shuffled queue.
 */
function buildAthkarList() {
    allAthkarList = Object.values(adkarData).flat();
    athkarQueue   = shuffleArray(allAthkarList);
    console.log(`Athkar list built: ${allAthkarList.length} entries across all categories.`);
}

function initAthkarAlertsSystem() {
    // Update data from API
    getAdkar().then(data => {
        adkarData = data;
        buildAthkarList();
    }).catch(err => console.error(err));

    // Build list from local data immediately (API call may be slow / fail)
    buildAthkarList();

    // Clear any existing interval
    if (alertIntervalId) {
        clearInterval(alertIntervalId);
        alertIntervalId = null;
    }

    if (state.settings.athkarAlertEnabled) {
        initAlertTimer();
    }
}

function initAlertTimer() {
    const minutes = state.settings.athkarAlertInterval || 30;
    const intervalMs = minutes * 60 * 1000;

    console.log(`Athkar alerts initialized. Interval: ${minutes} min.`);

    alertIntervalId = setInterval(() => {
        showAthkarAlert();
    }, intervalMs);
}

function showAthkarAlert() {
    if (allAthkarList.length === 0) return;

    // Refill the queue once all entries have been shown
    if (athkarQueue.length === 0) {
        athkarQueue = shuffleArray(allAthkarList);
    }

    // Pick the next entry from the queue (ensures full coverage before repeating)
    const nextAthkar = athkarQueue.pop();

    // Send to the main process to open a themed BrowserWindow popup
    ipcRenderer.send('show-athkar-popup', {
        theme:   state.settings.theme || 'navy',
        content: nextAthkar.content,
        title:   nextAthkar.category ? `Salaty · ${nextAthkar.category}` : 'Salaty Time · أذكار'
    });
}

module.exports = {
    initAthkarAlertsSystem
};
