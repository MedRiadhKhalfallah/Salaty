// src/renderer/js/prayerTrackerUI.js
const { ipcRenderer } = require('electron');
const { t } = require('./translations');
const screenSizeManager = require('./screenSize');
const analytics = require('./utils/analytics');
const { state } = require('./globalStore');

// Helper for tracker-specific translations
function tt(key) {
  return t(key, 'tracker');
}

// ===== CONSTANTS =====
const PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

const POINTS = {
  onTime: 10,
  late: 5,
  group: 5,
  mosque: 10,
  allFive: 20
};

const LEVELS = [
  { name: 'beginner', emoji: '🌱', minPoints: 0 },
  { name: 'regular', emoji: '🌿', minPoints: 500 },
  { name: 'perseverant', emoji: '🌳', minPoints: 1500 },
  { name: 'assiduous', emoji: '⭐', minPoints: 5000 },
  { name: 'exemplary', emoji: '🏆', minPoints: 10000 }
];

const ACHIEVEMENTS = [
  { id: 'first_week', icon: '🏅', condition: (d) => d.totalDays >= 7 },
  { id: 'fajr_30', icon: '🌅', condition: (d) => d.fajrCount >= 30 },
  { id: 'on_time_100', icon: '⏰', condition: (d) => d.onTimeCount >= 100 },
  { id: 'mosque_50', icon: '🕌', condition: (d) => d.mosqueCount >= 50 },
  { id: 'streak_7', icon: '🔥', condition: (d) => d.bestStreak >= 7 },
  { id: 'streak_30', icon: '💎', condition: (d) => d.bestStreak >= 30 },
  { id: 'prayers_500', icon: '📿', condition: (d) => d.totalPrayers >= 500 },
  { id: 'prayers_1000', icon: '🌟', condition: (d) => d.totalPrayers >= 1000 },
  { id: 'perfect_day_10', icon: '✨', condition: (d) => d.perfectDays >= 10 },
  { id: 'ramadan_complete', icon: '🌙', condition: (d) => d.ramadanComplete }
];

const CHALLENGES = [
  { id: 'fajr_7', target: 7, type: 'fajr_streak' },
  { id: 'group_20', target: 20, type: 'group_week' },
  { id: 'no_miss_3', target: 3, type: 'perfect_days' }
];

// Garden stages
const GARDEN_STAGES = [
  { min: 0, emoji: '🌰', label: 'seed' },
  { min: 10, emoji: '🌱', label: 'sprout' },
  { min: 50, emoji: '🌿', label: 'plant' },
  { min: 100, emoji: '🌳', label: 'tree' },
  { min: 500, emoji: '🌳🌳🌳', label: 'grove' },
  { min: 1000, emoji: '🌲🌳🌲🌳🌲', label: 'garden' },
  { min: 5000, emoji: '🌲🌳🌲🌳🌲🌲🌳🌲', label: 'forest' }
];

// ===== DATA MANAGEMENT =====
let trackerData = null;
let currentCalendarMonth = new Date();

function getToday() {
  return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
}

function getDefaultData() {
  return {
    totalPoints: 0,
    currentStreak: 0,
    bestStreak: 0,
    totalPrayers: 0,
    fajrCount: 0,
    onTimeCount: 0,
    mosqueCount: 0,
    groupCount: 0,
    perfectDays: 0,
    totalDays: 0,
    ramadanComplete: false,
    days: {} // { "2026-05-31": { prayers: { Fajr: {...}, ... }, points: 0 } }
  };
}

async function loadTrackerData() {
  try {
    const data = await ipcRenderer.invoke('get-prayer-tracker-data');
    trackerData = data || getDefaultData();
  } catch (e) {
    console.error('Error loading tracker data:', e);
    trackerData = getDefaultData();
  }
}

async function saveTrackerData() {
  try {
    await ipcRenderer.invoke('save-prayer-tracker-data', trackerData);
  } catch (e) {
    console.error('Error saving tracker data:', e);
  }
}

// ===== POINTS & LEVEL CALCULATION =====
function getCurrentLevel() {
  let level = LEVELS[0];
  for (const l of LEVELS) {
    if (trackerData.totalPoints >= l.minPoints) level = l;
  }
  return level;
}

function getNextLevel() {
  for (const l of LEVELS) {
    if (trackerData.totalPoints < l.minPoints) return l;
  }
  return null;
}

function getLevelProgress() {
  const current = getCurrentLevel();
  const next = getNextLevel();
  if (!next) return 100;
  const range = next.minPoints - current.minPoints;
  const progress = trackerData.totalPoints - current.minPoints;
  return Math.min(100, Math.round((progress / range) * 100));
}

// ===== STREAK CALCULATION =====
function recalculateStreak() {
  const days = trackerData.days;
  const sortedDates = Object.keys(days).sort().reverse();
  let streak = 0;

  const today = new Date();
  let checkDate = new Date(today);

  for (let i = 0; i < 1000; i++) {
    const dateStr = checkDate.toISOString().split('T')[0];
    const dayData = days[dateStr];

    if (dayData) {
      const prayersDone = Object.values(dayData.prayers || {}).filter(
        p => p.status === 'onTime' || p.status === 'late'
      ).length;

      // Flexible streak: at least 4 out of 5
      if (prayersDone >= 4) {
        streak++;
      } else if (i === 0) {
        // Today might not be complete yet, give benefit
        break;
      } else {
        break;
      }
    } else if (i > 0) {
      break;
    }

    checkDate.setDate(checkDate.getDate() - 1);
  }

  trackerData.currentStreak = streak;
  if (streak > trackerData.bestStreak) {
    trackerData.bestStreak = streak;
  }
}

// ===== PRAYER VALIDATION =====
function validatePrayer(prayerName, status, bonuses = []) {
  const today = getToday();

  if (!trackerData.days[today]) {
    trackerData.days[today] = { prayers: {}, points: 0 };
    trackerData.totalDays++;
  }

  const dayData = trackerData.days[today];
  const previousStatus = dayData.prayers[prayerName]?.status;

  // Remove previous points if re-validating
  if (previousStatus) {
    const prevPoints = dayData.prayers[prayerName].points || 0;
    dayData.points -= prevPoints;
    trackerData.totalPoints -= prevPoints;
    if (previousStatus === 'onTime') trackerData.onTimeCount--;
    if (previousStatus !== 'missed' && previousStatus) trackerData.totalPrayers--;
    if (prayerName === 'Fajr' && previousStatus !== 'missed') trackerData.fajrCount--;
    if (dayData.prayers[prayerName].bonuses?.includes('mosque')) trackerData.mosqueCount--;
    if (dayData.prayers[prayerName].bonuses?.includes('group')) trackerData.groupCount--;
  }

  // Calculate points
  let points = 0;
  if (status === 'onTime') {
    points += POINTS.onTime;
    trackerData.onTimeCount++;
  } else if (status === 'late') {
    points += POINTS.late;
  }

  if (status !== 'missed') {
    trackerData.totalPrayers++;
    if (prayerName === 'Fajr') trackerData.fajrCount++;
  }

  for (const bonus of bonuses) {
    if (bonus === 'group') {
      points += POINTS.group;
      trackerData.groupCount++;
    }
    if (bonus === 'mosque') {
      points += POINTS.mosque;
      trackerData.mosqueCount++;
    }
  }

  dayData.prayers[prayerName] = {
    status,
    bonuses,
    points,
    journal: dayData.prayers[prayerName]?.journal || null,
    time: new Date().toISOString()
  };

  dayData.points += points;
  trackerData.totalPoints += points;

  // Check all-five bonus
  const allPrayed = PRAYERS.every(p =>
    dayData.prayers[p] && dayData.prayers[p].status !== 'missed'
  );
  if (allPrayed && !dayData.allFiveBonus) {
    dayData.allFiveBonus = true;
    dayData.points += POINTS.allFive;
    trackerData.totalPoints += POINTS.allFive;

    // Check perfect day
    const allOnTime = PRAYERS.every(p => dayData.prayers[p]?.status === 'onTime');
    if (allOnTime) trackerData.perfectDays++;
  }

  recalculateStreak();
  saveTrackerData();
  renderTodayTab();
}

function setJournal(prayerName, quality) {
  const today = getToday();
  if (!trackerData.days[today]?.prayers[prayerName]) return;
  trackerData.days[today].prayers[prayerName].journal = quality;
  saveTrackerData();
}

// ===== MOTIVATIONAL MESSAGES =====
function getMotivationalMessage() {
  const streak = trackerData.currentStreak;
  const totalPrayers = trackerData.totalPrayers;
  const today = getToday();
  const dayData = trackerData.days[today];
  const prayersDoneToday = dayData
    ? Object.values(dayData.prayers).filter(p => p.status !== 'missed').length
    : 0;

  // Returning user
  const lastDates = Object.keys(trackerData.days).sort().reverse();
  if (lastDates.length > 0) {
    const lastDate = lastDates[0];
    const daysSinceLastEntry = Math.floor(
      (new Date(today) - new Date(lastDate)) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceLastEntry > 3) {
      return tt('motivationWelcomeBack') || "Content de te revoir. Chaque prière est une nouvelle opportunité. 🤲";
    }
  }

  // Progress messages
  if (streak >= 7) {
    return (tt('motivationStreak') || "Tu as accompli {count} jours consécutifs. Continue ainsi ! 🔥")
      .replace('{count}', streak);
  }

  if (prayersDoneToday >= 3) {
    return tt('motivationKeepGoing') || "Excellent progrès aujourd'hui ! Continue ainsi. 💪";
  }

  if (totalPrayers > 0 && totalPrayers % 100 < 5) {
    return (tt('motivationMilestone') || "Tu as dépassé {count} prières ! MashaAllah. ✨")
      .replace('{count}', Math.floor(totalPrayers / 100) * 100);
  }

  return null;
}

// ===== STATISTICS =====
function getMonthRate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = now.getDate();

  let totalPossible = today * 5;
  let totalDone = 0;

  for (let d = 1; d <= today; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayData = trackerData.days[dateStr];
    if (dayData) {
      totalDone += Object.values(dayData.prayers).filter(
        p => p.status === 'onTime' || p.status === 'late'
      ).length;
    }
  }

  return totalPossible > 0 ? Math.round((totalDone / totalPossible) * 100) : 0;
}

// ===== RENDER FUNCTIONS =====
function renderTodayTab() {
  // Level
  const level = getCurrentLevel();
  const next = getNextLevel();
  const progress = getLevelProgress();

  const levelBadge = document.getElementById('levelBadge');
  const pointsDisplay = document.getElementById('pointsDisplay');
  const levelProgressBar = document.getElementById('levelProgressBar');
  const levelNext = document.getElementById('levelNext');

  if (levelBadge) levelBadge.textContent = `${level.emoji} ${tt('level_' + level.name) || level.name}`;
  if (pointsDisplay) pointsDisplay.textContent = `${trackerData.totalPoints} pts`;
  if (levelProgressBar) levelProgressBar.style.width = `${progress}%`;
  if (levelNext && next) {
    levelNext.textContent = `${tt('nextLevel') || 'Prochain'}: ${tt('level_' + next.name) || next.name} (${next.minPoints} pts)`;
  } else if (levelNext) {
    levelNext.textContent = tt('maxLevel') || 'Niveau maximum atteint ! 🏆';
  }

  // Streak
  const streakText = document.getElementById('streakText');
  if (streakText) {
    streakText.textContent = `${tt('streak') || 'Série'} : ${trackerData.currentStreak} ${tt('days') || 'jours'}`;
  }

  // Motivation
  const motivMsg = getMotivationalMessage();
  const motivEl = document.getElementById('motivationMessage');
  if (motivEl) {
    if (motivMsg) {
      motivEl.textContent = motivMsg;
      motivEl.style.display = 'block';
    } else {
      motivEl.style.display = 'none';
    }
  }

  // Prayers checklist
  renderPrayersChecklist();

  // Daily bonus
  const today = getToday();
  const dayData = trackerData.days[today];
  const dailyBonus = document.getElementById('dailyBonus');
  if (dailyBonus) {
    if (dayData?.allFiveBonus) {
      dailyBonus.style.display = 'block';
      const bonusText = document.getElementById('dailyBonusText');
      if (bonusText) bonusText.textContent = `+${POINTS.allFive} bonus: ${tt('allFive') || '5 prières accomplies !'} 🎉`;
    } else {
      dailyBonus.style.display = 'none';
    }
  }
}

function renderPrayersChecklist() {
  const container = document.getElementById('prayersChecklist');
  if (!container) return;

  const today = getToday();
  const dayData = trackerData.days[today];

  container.innerHTML = PRAYERS.map(prayer => {
    const pData = dayData?.prayers[prayer];
    const status = pData?.status || '';
    const bonuses = pData?.bonuses || [];
    const journal = pData?.journal || '';
    const isValidated = status && status !== '';
    const points = pData?.points || 0;

    return `
      <div class="prayer-item ${isValidated ? 'validated' : ''}" data-prayer="${prayer}">
        <div class="prayer-item-header">
          <span class="prayer-name">
            <i class="fas fa-${getPrayerIcon(prayer)}"></i>
            ${t(prayer, 'prayerNames') || prayer}
          </span>
          ${points > 0 ? `<span class="prayer-points">+${points}</span>` : ''}
        </div>
        <div class="prayer-options">
          <button class="prayer-option ${status === 'onTime' ? 'selected' : ''}"
            data-prayer="${prayer}" data-status="onTime">
            ✅ ${tt('onTime') || "À l'heure"}
          </button>
          <button class="prayer-option ${status === 'late' ? 'selected-late' : ''}"
            data-prayer="${prayer}" data-status="late">
            🕒 ${tt('late') || 'En retard'}
          </button>
          <button class="prayer-option ${status === 'missed' ? 'selected-missed' : ''}"
            data-prayer="${prayer}" data-status="missed">
            ❌ ${tt('missed') || 'Non effectuée'}
          </button>
          <button class="prayer-option bonus ${bonuses.includes('group') ? 'selected' : ''}"
            data-prayer="${prayer}" data-bonus="group" ${!status || status === 'missed' ? 'disabled' : ''}>
            🤲 ${tt('group') || 'En groupe'}
          </button>
          <button class="prayer-option bonus ${bonuses.includes('mosque') ? 'selected' : ''}"
            data-prayer="${prayer}" data-bonus="mosque" ${!status || status === 'missed' ? 'disabled' : ''}>
            🕌 ${tt('mosque') || 'Mosquée'}
          </button>
        </div>
        <div class="prayer-journal">
          <span class="journal-option ${journal === 'focused' ? 'selected' : ''}"
            data-prayer="${prayer}" data-journal="focused" title="${tt('focused') || 'Concentré'}">😊</span>
          <span class="journal-option ${journal === 'average' ? 'selected' : ''}"
            data-prayer="${prayer}" data-journal="average" title="${tt('average') || 'Moyen'}">😐</span>
          <span class="journal-option ${journal === 'distracted' ? 'selected' : ''}"
            data-prayer="${prayer}" data-journal="distracted" title="${tt('distracted') || 'Distrait'}">😔</span>
        </div>
      </div>
    `;
  }).join('');

  // Attach event listeners
  container.querySelectorAll('.prayer-option[data-status]').forEach(btn => {
    btn.addEventListener('click', () => {
      const prayer = btn.dataset.prayer;
      const status = btn.dataset.status;
      const dayData = trackerData.days[getToday()];
      const currentBonuses = dayData?.prayers[prayer]?.bonuses || [];
      validatePrayer(prayer, status, status === 'missed' ? [] : currentBonuses);
    });
  });

  container.querySelectorAll('.prayer-option[data-bonus]').forEach(btn => {
    btn.addEventListener('click', () => {
      const prayer = btn.dataset.prayer;
      const bonus = btn.dataset.bonus;
      const dayData = trackerData.days[getToday()];
      const pData = dayData?.prayers[prayer];
      if (!pData || pData.status === 'missed') return;

      let bonuses = [...(pData.bonuses || [])];
      if (bonuses.includes(bonus)) {
        bonuses = bonuses.filter(b => b !== bonus);
      } else {
        bonuses.push(bonus);
      }
      validatePrayer(prayer, pData.status, bonuses);
    });
  });

  container.querySelectorAll('.journal-option').forEach(el => {
    el.addEventListener('click', () => {
      const prayer = el.dataset.prayer;
      const journal = el.dataset.journal;
      setJournal(prayer, journal);
      // Update UI
      const parent = el.closest('.prayer-journal');
      parent.querySelectorAll('.journal-option').forEach(j => j.classList.remove('selected'));
      el.classList.add('selected');
    });
  });
}

function getPrayerIcon(prayer) {
  const icons = { Fajr: 'cloud-moon', Dhuhr: 'sun', Asr: 'cloud-sun', Maghrib: 'cloud', Isha: 'moon' };
  return icons[prayer] || 'circle';
}

function renderStatsTab() {
  const statMonthRate = document.getElementById('statMonthRate');
  const statBestStreak = document.getElementById('statBestStreak');
  const statTotalPrayers = document.getElementById('statTotalPrayers');
  const statFajrCount = document.getElementById('statFajrCount');
  const statOnTimeCount = document.getElementById('statOnTimeCount');
  const statMosqueCount = document.getElementById('statMosqueCount');

  if (statMonthRate) statMonthRate.textContent = `${getMonthRate()}%`;
  if (statBestStreak) statBestStreak.textContent = trackerData.bestStreak;
  if (statTotalPrayers) statTotalPrayers.textContent = trackerData.totalPrayers;
  if (statFajrCount) statFajrCount.textContent = trackerData.fajrCount;
  if (statOnTimeCount) statOnTimeCount.textContent = trackerData.onTimeCount;
  if (statMosqueCount) statMosqueCount.textContent = trackerData.mosqueCount;

  renderCalendar();
  renderChallenges();
}

function renderCalendar() {
  const grid = document.getElementById('calendarGrid');
  const monthLabel = document.getElementById('calMonth');
  if (!grid) return;

  const year = currentCalendarMonth.getFullYear();
  const month = currentCalendarMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const todayStr = getToday();

  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];
  if (monthLabel) monthLabel.textContent = `${monthNames[month]} ${year}`;

  let html = '';
  // Day headers
  const dayNames = ['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa'];
  html += dayNames.map(d => `<div class="calendar-day" style="font-weight:600;opacity:0.6">${d}</div>`).join('');

  // Empty cells
  for (let i = 0; i < firstDay; i++) {
    html += '<div class="calendar-day"></div>';
  }

  // Days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayData = trackerData.days[dateStr];
    let colorClass = '';
    const isToday = dateStr === todayStr;

    if (dayData) {
      const count = Object.values(dayData.prayers).filter(
        p => p.status === 'onTime' || p.status === 'late'
      ).length;
      if (count === 5) colorClass = 'green';
      else if (count >= 1) colorClass = 'yellow';
      else colorClass = 'red';
    } else if (new Date(dateStr) < new Date(todayStr)) {
      // Past day with no data
      colorClass = '';
    }

    html += `<div class="calendar-day ${colorClass} ${isToday ? 'today' : ''}">${d}</div>`;
  }

  grid.innerHTML = html;
}

function renderChallenges() {
  const container = document.getElementById('challengesList');
  if (!container) return;

  const challenges = [
    {
      name: tt('challengeFajr7') || '🎯 Fajr à l\'heure pendant 7 jours',
      progress: Math.min(trackerData.currentStreak, 7),
      target: 7,
      reward: '+50 pts'
    },
    {
      name: tt('challengeGroup20') || '🎯 20 prières en groupe',
      progress: Math.min(trackerData.groupCount, 20),
      target: 20,
      reward: '+100 pts'
    },
    {
      name: tt('challengeNoMiss3') || '🎯 3 jours sans manquer',
      progress: Math.min(trackerData.currentStreak, 3),
      target: 3,
      reward: '+30 pts'
    }
  ];

  container.innerHTML = challenges.map(ch => {
    const pct = Math.round((ch.progress / ch.target) * 100);
    const completed = ch.progress >= ch.target;
    return `
      <div class="challenge-item ${completed ? 'completed' : ''}">
        <div class="challenge-header">
          <span class="challenge-name">${ch.name}</span>
          <span class="challenge-reward">${ch.reward}</span>
        </div>
        <div class="challenge-progress">
          <div class="challenge-progress-bar" style="width: ${pct}%"></div>
        </div>
      </div>
    `;
  }).join('');
}

function renderGardenTab() {
  const stage = document.getElementById('gardenStage');
  const progressBar = document.getElementById('gardenProgressBar');
  const seedsEl = document.getElementById('gardenSeeds');
  const treesEl = document.getElementById('gardenTrees');

  const totalPrayers = trackerData.totalPrayers;
  const trees = Math.floor(totalPrayers / 100);
  const seedsInProgress = totalPrayers % 100;

  // Find current garden stage
  let currentStage = GARDEN_STAGES[0];
  for (const s of GARDEN_STAGES) {
    if (totalPrayers >= s.min) currentStage = s;
  }

  if (stage) {
    // Build garden visualization
    let gardenHtml = '';
    const displayCount = Math.min(trees, 12);
    for (let i = 0; i < displayCount; i++) {
      gardenHtml += `<span class="garden-emoji">🌳</span>`;
    }
    if (seedsInProgress > 0) {
      if (seedsInProgress < 25) gardenHtml += `<span class="garden-emoji">🌱</span>`;
      else if (seedsInProgress < 50) gardenHtml += `<span class="garden-emoji">🌿</span>`;
      else gardenHtml += `<span class="garden-emoji">🪴</span>`;
    }
    if (!gardenHtml) gardenHtml = `<span class="garden-emoji">${currentStage.emoji}</span>`;
    stage.innerHTML = gardenHtml;
  }

  if (progressBar) {
    progressBar.style.width = `${seedsInProgress}%`;
  }

  if (seedsEl) seedsEl.textContent = `🌱 ${seedsInProgress} ${tt('seeds') || 'graines'}`;
  if (treesEl) treesEl.textContent = `🌳 ${trees} ${tt('trees') || 'arbres'}`;
}

function renderAchievementsTab() {
  const grid = document.getElementById('achievementsGrid');
  if (!grid) return;

  grid.innerHTML = ACHIEVEMENTS.map(ach => {
    const unlocked = ach.condition(trackerData);
    return `
      <div class="achievement-card ${unlocked ? 'unlocked' : ''}">
        <div class="achievement-icon">${ach.icon}</div>
        <div class="achievement-name">${tt('ach_' + ach.id) || ach.id}</div>
        <div class="achievement-desc">${unlocked ? (tt('unlocked') || '✓ Débloqué') : (tt('locked') || '🔒 Verrouillé')}</div>
      </div>
    `;
  }).join('');
}

// ===== TAB NAVIGATION =====
function setupTabs() {
  const tabs = document.querySelectorAll('.tracker-tab');
  const panels = document.querySelectorAll('.tab-panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;

      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      const panel = document.getElementById(`panel${target.charAt(0).toUpperCase() + target.slice(1)}`);
      if (panel) panel.classList.add('active');

      // Render the active tab
      if (target === 'today') renderTodayTab();
      else if (target === 'stats') renderStatsTab();
      else if (target === 'garden') renderGardenTab();
      else if (target === 'achievements') renderAchievementsTab();
    });
  });
}

// ===== CALENDAR NAVIGATION =====
function setupCalendarNav() {
  const prevBtn = document.getElementById('calPrev');
  const nextBtn = document.getElementById('calNext');

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      currentCalendarMonth.setMonth(currentCalendarMonth.getMonth() - 1);
      renderCalendar();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      currentCalendarMonth.setMonth(currentCalendarMonth.getMonth() + 1);
      renderCalendar();
    });
  }
}

// ===== UI TEXT UPDATES =====
function updateUITexts() {
  const el = (id, key, fallback) => {
    const element = document.getElementById(id);
    if (element) element.textContent = tt(key) || fallback;
  };

  el('trackerTitle', 'trackerTitle', 'Suivi de Prière');
  el('tabTodayLabel', 'tabToday', "Aujourd'hui");
  el('tabStatsLabel', 'tabStats', 'Statistiques');
  el('tabGardenLabel', 'tabGarden', 'Jardin');
  el('tabAchievementsLabel', 'tabAchievements', 'Succès');
  el('statMonthRateLabel', 'statMonthRate', 'Taux ce mois');
  el('statBestStreakLabel', 'statBestStreak', 'Meilleure série');
  el('statTotalPrayersLabel', 'statTotal', 'Prières totales');
  el('statFajrCountLabel', 'statFajr', 'Fajr accomplis');
  el('statOnTimeCountLabel', 'statOnTime', "À l'heure");
  el('statMosqueCountLabel', 'statMosque', 'À la mosquée');
  el('challengesTitle', 'challengesTitle', '🎯 Défis personnels');
  el('gardenTitle', 'gardenTitle', '🌱 Jardin de Hassanat');
  el('gardenDescription', 'gardenDesc', 'Chaque prière validée fait pousser votre jardin');
  el('legendComplete', 'legendComplete', 'Complète');
  el('legendPartial', 'legendPartial', 'Partielle');
  el('legendNone', 'legendNone', 'Aucune');
}

// ===== INIT =====
async function initPrayerTrackerPage() {
  console.log('Initializing Prayer Tracker page...');

  // Defense-in-depth: if the user disabled Prayer Tracking from Settings,
  // bounce back to the Features page instead of showing this feature.
  if (state.settings.prayerTrackingEnabled === false) {
    ipcRenderer.invoke('navigate-to', 'features');
    return;
  }

  // Back button
  const backBtn = document.getElementById('backBtn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      const currentSize = screenSizeManager.getWindowSize();
      ipcRenderer.invoke('resize-window', currentSize.width, currentSize.height);
      ipcRenderer.invoke('navigate-to', 'features');
    });
  }

  await loadTrackerData();
  updateUITexts();
  setupTabs();
  setupCalendarNav();
  renderTodayTab();
}

module.exports = { initPrayerTrackerPage };










