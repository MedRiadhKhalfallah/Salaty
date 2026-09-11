const { ipcRenderer } = require('electron');
const { t } = require('../js/translations');
const { state } = require('../js/globalStore');
const path = require('path');

let adhanAudio = null;
let fadeInterval = null;
let prayerTimerInterval = null;
let prayerStartTime = null;
let currentPrayerName = null;
let returnDetected = false;

// ==================== ADHAN STOP BUTTON ====================
function showAdhanStopBtn(show) {
    const btn = document.getElementById('adhanStopBtn');
    if (btn) {
        if (show) {
            btn.classList.remove('adhan-stop-btn-hidden');
        } else {
            btn.classList.add('adhan-stop-btn-hidden');
        }
    }
    setAdhanStopText();
}

// ==================== "GOING TO PRAY" BUTTON ====================
function showPrayGoBtn(show) {
    const btn = document.getElementById('prayGoBtn');
    if (btn) {
        if (show) {
            btn.classList.remove('pray-go-btn-hidden');
        } else {
            btn.classList.add('pray-go-btn-hidden');
        }
    }
    setPrayGoText();
}

function setPrayGoText() {
    const textEl = document.getElementById('prayGoText');
    if (textEl) {
        textEl.textContent = t('goingToPray', 'tracker') || 'Je vais prier';
    }
}

// ==================== PRAYER TIMER ====================
function startPrayerTimer() {
    if (!isPrayerTrackingEnabled()) return;

    // Stop the adhan
    stopAdhan();

    // Record start time
    prayerStartTime = Date.now();
    returnDetected = false;

    // Show the timer overlay
    const overlay = document.getElementById('prayerTimerOverlay');
    const welcomePanel = document.getElementById('prayerTimerWelcome');
    if (overlay) {
        overlay.classList.remove('prayer-timer-hidden');
    }
    if (welcomePanel) {
        welcomePanel.classList.add('prayer-timer-welcome-hidden');
    }

    // Update timer text
    const statusEl = document.getElementById('prayerTimerStatus');
    if (statusEl) {
        statusEl.textContent = t('praying', 'tracker') || 'En prière...';
    }
    const hintEl = document.getElementById('prayerTimerHint');
    if (hintEl) {
        hintEl.textContent = t('prayerTimerHint', 'tracker') || 'Bougez la souris ou appuyez sur une touche à votre retour';
    }

    // Start the clock
    updateTimerDisplay();
    prayerTimerInterval = setInterval(updateTimerDisplay, 1000);

    // Listen for return (after a grace period of 30s to avoid accidental triggers)
    setTimeout(() => {
        if (!returnDetected) {
            document.addEventListener('mousemove', onUserReturn, { once: true });
            document.addEventListener('keydown', onUserReturn, { once: true });
            document.addEventListener('click', onUserReturn, { once: true });
        }
    }, 30000); // 30 seconds grace period
}

function updateTimerDisplay() {
    if (!prayerStartTime) return;
    const elapsed = Math.floor((Date.now() - prayerStartTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;

    const clockEl = document.getElementById('prayerTimerClock');
    if (clockEl) {
        clockEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
}

function onUserReturn() {
    if (returnDetected) return;
    returnDetected = true;

    // Remove all listeners
    document.removeEventListener('mousemove', onUserReturn);
    document.removeEventListener('keydown', onUserReturn);
    document.removeEventListener('click', onUserReturn);

    // Stop the timer
    if (prayerTimerInterval) {
        clearInterval(prayerTimerInterval);
        prayerTimerInterval = null;
    }

    // Calculate duration
    const elapsed = Math.floor((Date.now() - prayerStartTime) / 1000);
    const minutes = Math.floor(elapsed / 60);

    // Show welcome back panel
    const welcomePanel = document.getElementById('prayerTimerWelcome');
    if (welcomePanel) {
        welcomePanel.classList.remove('prayer-timer-welcome-hidden');
    }

    const titleEl = document.getElementById('welcomeTitle');
    if (titleEl) {
        titleEl.textContent = t('taqabbalAllah', 'tracker') || 'Taqabbal Allah';
    }

    const durationEl = document.getElementById('welcomeDuration');
    if (durationEl) {
        const durationLabel = t('duration', 'tracker') || 'Durée';
        if (minutes > 0) {
            durationEl.textContent = `${durationLabel} : ${minutes} min ${elapsed % 60}s`;
        } else {
            durationEl.textContent = `${durationLabel} : ${elapsed}s`;
        }
    }

    const messageEl = document.getElementById('welcomeMessage');
    if (messageEl) {
        messageEl.textContent = t('prayerAccepted', 'tracker') || "MashaAllah, qu'Allah accepte ta prière";
    }

    const closeBtn = document.getElementById('welcomeCloseBtn');
    if (closeBtn) {
        closeBtn.textContent = t('alhamdulillah', 'tracker') || 'Alhamdulillah ✓';
    }

    // Auto-validate prayer in tracker if duration > 2 min (likely a real prayer)
    if (minutes >= 2) {
        validatePrayerFromTimer();
    }
}

async function validatePrayerFromTimer() {
    if (!isPrayerTrackingEnabled()) return;

    try {
        const data = await ipcRenderer.invoke('get-prayer-tracker-data');
        if (!data) return;

        const today = new Date().toISOString().split('T')[0];
        if (!data.days) data.days = {};
        if (!data.days[today]) {
            data.days[today] = { prayers: {}, points: 0 };
            data.totalDays = (data.totalDays || 0) + 1;
        }

        // If we know the current prayer name, validate it
        if (currentPrayerName && !data.days[today].prayers[currentPrayerName]?.status) {
            const points = 10; // On-time points
            data.days[today].prayers[currentPrayerName] = {
                status: 'onTime',
                bonuses: [],
                points: points,
                journal: null,
                time: new Date().toISOString()
            };
            data.days[today].points = (data.days[today].points || 0) + points;
            data.totalPoints = (data.totalPoints || 0) + points;
            data.totalPrayers = (data.totalPrayers || 0) + 1;
            data.onTimeCount = (data.onTimeCount || 0) + 1;

            if (currentPrayerName === 'Fajr') {
                data.fajrCount = (data.fajrCount || 0) + 1;
            }

            await ipcRenderer.invoke('save-prayer-tracker-data', data);
        }
    } catch (e) {
        console.log('Could not auto-validate prayer:', e);
    }
}

function closePrayerTimer() {
    const overlay = document.getElementById('prayerTimerOverlay');
    if (overlay) {
        overlay.classList.add('prayer-timer-hidden');
    }

    if (prayerTimerInterval) {
        clearInterval(prayerTimerInterval);
        prayerTimerInterval = null;
    }

    prayerStartTime = null;
    returnDetected = false;
    currentPrayerName = null;
}

// ==================== PRAYER TRACKER SETTING ====================
// The whole "Salaty tracking" flow (Prayer Tracker page + the "Going to
// pray" timer/auto-validation shown after each Adhan) can be disabled by
// the user from Settings. Enabled by default.
function isPrayerTrackingEnabled() {
    return state.settings.prayerTrackingEnabled !== false;
}

// ==================== ADHAN CORE ====================
function notifyPrayer(prayer, mode = true) {
    const prayerName = t(prayer.key, 'prayerNames');
    currentPrayerName = prayer.key; // Store current prayer name

    // Themed popup instead of native OS notification
    ipcRenderer.send('show-adhan-popup', {
        theme:   state.settings.theme || 'navy',
        title:   'Salaty Time · الأذان',
        content: `${t('currentPrayer')}: ${prayerName}`
    });

    // Si mode silencieux, on s'arrête là (pas de son)
    if (mode === 'silent') {
        if (isPrayerTrackingEnabled()) showPrayGoBtn(true); // Still show the pray button
        return;
    }

    if (fadeInterval) {
        clearInterval(fadeInterval);
        fadeInterval = null;
    }

    if (adhanAudio && !adhanAudio.paused) {
        adhanAudio.pause();
        adhanAudio.currentTime = 0;
    }
    const soundPath = path.join(__dirname, '../../assets/adhan.mp3');
    adhanAudio = new Audio(soundPath);
    adhanAudio.volume = 0;

    adhanAudio.play().then(() => {
        showAdhanStopBtn(true);
        if (isPrayerTrackingEnabled()) showPrayGoBtn(true);

        // Effet de fade-in sur 60 secondes
        const step = 0.0015;
        const intervalTime = 100;

        fadeInterval = setInterval(() => {
            if (!adhanAudio) {
                clearInterval(fadeInterval);
                return;
            }
            if (adhanAudio.paused) {
                clearInterval(fadeInterval);
                return;
            }

            let newVol = adhanAudio.volume + step;
            if (newVol >= 1.0) {
                newVol = 1.0;
                clearInterval(fadeInterval);
            }
            adhanAudio.volume = newVol;
        }, intervalTime);

    }).catch(error => {
        console.warn('Could not play adhan sound:', error);
    });
    if (adhanAudio) {
        adhanAudio.onended = () => {
            showAdhanStopBtn(false);
            // Keep the pray button visible for 5 more minutes after adhan ends
            setTimeout(() => {
                if (!prayerStartTime) showPrayGoBtn(false);
            }, 300000);
            if (fadeInterval) {
                clearInterval(fadeInterval);
                fadeInterval = null;
            }
        };
    }
}

function stopAdhan() {
    if (fadeInterval) {
        clearInterval(fadeInterval);
        fadeInterval = null;
    }
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

// ==================== EVENT LISTENERS ====================
// Adhan stop button
const adhanStopBtn = document.getElementById('adhanStopBtn');
if (adhanStopBtn) {
    adhanStopBtn.addEventListener('click', () => {
        stopAdhan();
    });
    showAdhanStopBtn(false);
    setAdhanStopText();
}

// "Going to pray" button
const prayGoBtn = document.getElementById('prayGoBtn');
if (prayGoBtn) {
    prayGoBtn.addEventListener('click', () => {
        showPrayGoBtn(false);
        startPrayerTimer();
    });
    showPrayGoBtn(false);
}

// Welcome close button
const welcomeCloseBtn = document.getElementById('welcomeCloseBtn');
if (welcomeCloseBtn) {
    welcomeCloseBtn.addEventListener('click', () => {
        closePrayerTimer();
    });
}

module.exports = { notifyPrayer };