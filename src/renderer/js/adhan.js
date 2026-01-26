const { t } = require('../js/translations');

const path = require('path');

let adhanAudio = null;

function showAdhanStopBtn(show) {
    const btn = document.getElementById('adhanStopBtn');
    if (btn) {
        if (show) {
            btn.classList.remove('adhan-stop-btn-hidden');
        } else {
            btn.classList.add('adhan-stop-btn-hidden');
        }
    }
}

function notifyPrayer(prayer, mode = true) {
    const prayerName = t(prayer.key, 'prayerNames');
    new Notification('Salaty', {
        body: `${t('currentPrayer')}: ${prayerName}`,
        icon: path.join(__dirname, '../../assets/icons/app_icon.png'), // Correction du chemin
        silent: true
    });

    // Si mode silencieux, on s'arrête là (pas de son)
    if (mode === 'silent') {
        return;
    }

    if (adhanAudio && !adhanAudio.paused) {
        adhanAudio.pause();
        adhanAudio.currentTime = 0;
    }
    const soundPath = path.join(__dirname, '../../assets/adhan.mp3'); // Correction du chemin
    adhanAudio = new Audio(soundPath);
    adhanAudio.play().then(() => {
        showAdhanStopBtn(true);
    }).catch(error => {
        console.warn('Could not play adhan sound:', error);
    });
    if (adhanAudio) {
        adhanAudio.onended = () => {
            showAdhanStopBtn(false);
        };
    }
}

function stopAdhan() {
    if (adhanAudio) {
        adhanAudio.pause();
        adhanAudio.currentTime = 0;
        showAdhanStopBtn(false);
    }
}

function setAdhanStopText() {
    const textEl = document.getElementById('adhanStopText');
    if (textEl) {
        textEl.textContent = t('stopAdhan');
    }
}

// Gestion du bouton d'arrêt de l'Adhan
const adhanStopBtn = document.getElementById('adhanStopBtn');
if (adhanStopBtn) {
    adhanStopBtn.addEventListener('click', () => {
        stopAdhan();
    });
    showAdhanStopBtn(false);
    setAdhanStopText();
}

module.exports = { notifyPrayer };