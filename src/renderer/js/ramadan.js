const { ipcRenderer } = require('electron');
const { t } = require('./translations');
const { state } = require('./globalStore');

let ramadanDateCache = null;
let isRamadanModeActive = false;
let manualOverride = null; // null = auto, true = show, false = hide
let lastHijriInfo = null;

/**
 * Toggle Ramadan Mode manually
 */
function toggleRamadanMode() {
    if (isRamadanModeActive) {
        disableRamadanMode();
        manualOverride = false;
    } else {
        manualOverride = true;

        // Use last cached info if available, otherwise default to current date approximation
        // (This might be inaccurate if updateRamadanCountdown hasn't run yet)
        if (lastHijriInfo) {
             enableRamadanMode(lastHijriInfo.year, lastHijriInfo.day);
        } else {
            console.log("No Hijri info available yet, trying with defaults");
            // Fallback (won't happen usually as updateRamadanCountdown runs on load)
            const date = new Date();
            // Approximative Hijri year (Gregorian - 579)
            enableRamadanMode(date.getFullYear() - 579, 1);
        }
    }
}

/**
 * Met à jour le compte à rebours pour le Ramadan
 * Affiche le compteur seulement s'il reste 60 jours ou moins
 * @param {object} prayerData Données de prière contenant la date Hijri
 */
async function updateRamadanCountdown(prayerData) {
    const countdownEl = document.getElementById('ramadanCountdown');
    if (!countdownEl || !prayerData) return;

    // Clear content by default (hidden if > 60 days)
    countdownEl.textContent = '';

    const hijriDate = prayerData.date.hijri;
    const currentHijriMonth = hijriDate.month.number; // 1-12
    const currentHijriYear = parseInt(hijriDate.year);
    const currentHijriDay = parseInt(hijriDate.day);

    // Update cache
    lastHijriInfo = { year: currentHijriYear, day: currentHijriDay };

    const isRamadanMonth = currentHijriMonth === 9;

    // Gestion de l'affichage du Panel
    let shouldShowPanel = isRamadanMonth;

    if (manualOverride !== null) {
        shouldShowPanel = manualOverride;
    }

    if (shouldShowPanel) {
        if (!isRamadanModeActive) {
            enableRamadanMode(currentHijriYear, currentHijriDay);
        } else {
             // Mise à jour de la ligne active du calendrier si le mode est déjà actif
            highlightCurrentDay(currentHijriDay);
        }
    } else {
        if (isRamadanModeActive) {
            disableRamadanMode();
        }
    }

    // Si c'est le Ramadan (Mois 9)
    if (isRamadanMonth) {
        countdownEl.textContent = t('ramadanMubarak');
        return;
    }

    // Reste de la logique countdown...
    let targetYear = currentHijriYear;
    // Si on a dépassé Ramadan, on vise l'année prochaine
    if (currentHijriMonth > 9) {
        targetYear++;
    }

    // Vérifier le cache pour éviter les appels API inutiles
    if (!ramadanDateCache || ramadanDateCache.year !== targetYear) {
         try {
             // Récupérer la date grégorienne pour le 1er Ramadan de l'année cible
             const response = await fetch(`https://api.aladhan.com/v1/hToG?date=01-09-${targetYear}`);
             const data = await response.json();
             if (data && data.code === 200 && data.data && data.data.gregorian) {
                 ramadanDateCache = {
                     year: targetYear,
                     gregorian: data.data.gregorian
                 };
             } else {
                 return;
             }
         } catch (e) {
             console.error("Error fetching Ramadan date", e);
             return;
         }
    }

    if (ramadanDateCache) {
        const goalDateStr = ramadanDateCache.gregorian.date; // DD-MM-YYYY
        // Parse DD-MM-YYYY
        const [d, m, y] = goalDateStr.split('-');
        // Créer la date à minuit pour une comparaison correcte des jours
        const goalDate = new Date(y, m - 1, d);

        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const diffTime = goalDate - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Afficher seulement si diffDays <= 60
        if (diffDays > 0 && diffDays <= 60) {
            countdownEl.textContent = t('daysUntilRamadan').replace('{days}', diffDays);
        } else if (diffDays === 0) {
             countdownEl.textContent = t('ramadanMubarak');
        }
    }
}

async function enableRamadanMode(hijriYear, currentHijriDay) {
    if (isRamadanModeActive) return;

    isRamadanModeActive = true;

    // Resize window
    // 320 for left panel + 400 for calendar = 720 approx
    await ipcRenderer.invoke('resize-window', 750, 540);

    const appContainer = document.querySelector('.app-container');
    const ramadanPanel = document.getElementById('ramadanPanel');

    if (appContainer) appContainer.classList.add('ramadan-mode');
    if (ramadanPanel) ramadanPanel.style.display = 'flex';

    // Fetch and render calendar
    await fetchAndRenderRamadanCalendar(hijriYear, currentHijriDay);
}

function disableRamadanMode() {
    if (!isRamadanModeActive) return;

    isRamadanModeActive = false;

    const appContainer = document.querySelector('.app-container');
    const ramadanPanel = document.getElementById('ramadanPanel');

    if (appContainer) appContainer.classList.remove('ramadan-mode');
    if (ramadanPanel) ramadanPanel.style.display = 'none';

    // Resize window back to default
    ipcRenderer.invoke('resize-window', 320, 540);
}

async function fetchAndRenderRamadanCalendar(hijriYear, currentHijriDay) {
    const tableBody = document.getElementById('ramadanTableBody');
    const tableHead = document.getElementById('ramadanTableHead');
    const title = document.getElementById('ramadanTitle');

    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="4">Loading...</td></tr>';

    if (title) title.textContent = t('ramadanCalendar') || 'Ramadan Calendar';

    if (tableHead) {
        tableHead.innerHTML = `
            <th>${t('day') || 'Day'}</th>
            <th>${t('date') || 'Date'}</th>
            <th>${t('imsak') || 'Imsak'}</th>
            <th>${t('iftar') || 'Iftar'}</th>
        `;
    }

    try {
        const { city, country, method } = state.settings;
        if (!city || !country) {
            tableBody.innerHTML = '<tr><td colspan="4">Location not set</td></tr>';
            return;
        }

        // Fetch Hijri Calendar for Ramadan (Month 9)
        const response = await fetch(`https://api.aladhan.com/v1/hijriCalendarByCity?city=${city}&country=${country}&method=${method}&month=09&year=${hijriYear}`);
        const data = await response.json();
        console.log("datadatadatadatadata")
        console.log(data)

        if (data.code === 200 && data.data) {
            tableBody.innerHTML = '';
            data.data.forEach(dayData => {
                const hijriDay = parseInt(dayData.date.hijri.day);
                const gregorianDate = dayData.date.gregorian.date;
                const timings = dayData.timings;

                const tr = document.createElement('tr');
                tr.id = `ramadan-day-${hijriDay}`;

                if (hijriDay === currentHijriDay) {
                    tr.classList.add('current-day');
                }

                tr.innerHTML = `
                    <td>${hijriDay}</td>
                    <td>${formatDate(gregorianDate)}</td>
                    <td>${timings.Imsak.split(' ')[0]}</td>
                    <td>${timings.Maghrib.split(' ')[0]}</td>
                `;
                tableBody.appendChild(tr);
            });

            // Scroll to current day
            setTimeout(() => {
                const current = document.getElementById(`ramadan-day-${currentHijriDay}`);
                if (current) {
                    current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 500);
        } else {
             tableBody.innerHTML = '<tr><td colspan="4">Error loading data</td></tr>';
        }
    } catch (e) {
        console.error("Error fetching Ramadan calendar", e);
        tableBody.innerHTML = '<tr><td colspan="4">Network error</td></tr>';
    }
}

function highlightCurrentDay(day) {
   const current = document.querySelector('.current-day');
   if (current) current.classList.remove('current-day');

   const newCurrent = document.getElementById(`ramadan-day-${day}`);
   if (newCurrent) newCurrent.classList.add('current-day');
}

function formatDate(dateStr) {
    // DD-MM-YYYY to DD MMM
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return `${parts[0]}/${parts[1]}`;
    }
    return dateStr;
}

module.exports = {
    updateRamadanCountdown,
    toggleRamadanMode
};
