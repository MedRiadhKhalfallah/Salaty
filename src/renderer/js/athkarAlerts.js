const { state } = require('./globalStore');
const { t } = require('./translations');
const adkarData = require('../data/adkar.json');

let alertIntervalId = null;

function initAthkarAlertsSystem() {
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
    const tasbih = adkarData['تسابيح'];
    if (!tasbih || tasbih.length === 0) return;

    const randomAthkar = tasbih[Math.floor(Math.random() * tasbih.length)];

    // Notification Logic
    const notificationOptions = {
        body: randomAthkar.content,
        icon: '../../assets/icons/app_icon.png',
        requireInteraction: true // Keep open so we can control duration manually
    };

    const spawnNotification = () => {
        const notif = new Notification('Salaty - Athkar', notificationOptions);
        // Auto close after 10 seconds
        setTimeout(() => notif.close(), 10000);
    };

    if (Notification.permission === 'granted') {
         spawnNotification();
    } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                spawnNotification();
            }
        });
    }
}

module.exports = {
    initAthkarAlertsSystem
};
