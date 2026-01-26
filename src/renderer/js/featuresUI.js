const { ipcRenderer } = require('electron');
const { t } = require('./translations');

let isFeaturesFullscreen = false;

// ==================== FEATURES PAGE FUNCTIONS ====================
function initFeaturesPage() {
  console.log('Initializing Features page...');

  // Setup back button
  const backBtn = document.getElementById('backBtn');
  if (backBtn) {
    console.log('Back button found');
    backBtn.addEventListener('click', () => {
      console.log('Back button clicked');
      if (isFeaturesFullscreen) {
        toggleFeaturesFullscreen(); // Exit fullscreen first
      }
      ipcRenderer.invoke('resize-window', 320, 575);
      ipcRenderer.invoke('go-back');
    });
  }

  // Setup fullscreen button
  const fullscreenBtn = document.getElementById('featuresFullscreenBtn');
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', toggleFeaturesFullscreen);
  }

  // Update UI text
  updateFeaturesUI();

  // Setup feature card clicks
  setupFeatureCards();
}

function updateFeaturesUI() {
  const featuresTitle = document.getElementById('featuresTitle');
  const featuresFooterText = document.getElementById('featuresFooterText');

  // Feature names
  const featureQuran = document.getElementById('featureQuran');
  const featureAthkar = document.getElementById('featureAthkar');
  const featureMonthly = document.getElementById('featureMonthly');
  const featureTasbih = document.getElementById('featureTasbih');
  const featureCalendar = document.getElementById('featureCalendar');
  const featureRamadhan = document.getElementById('featureRamadhan');
  const featureAsma = document.getElementById('featureAsma');
  const featureQibla = document.getElementById('featureQibla');

  // Feature descriptions
  const featureQuranDesc = document.getElementById('featureQuranDesc');
  const featureAthkarDesc = document.getElementById('featureAthkarDesc');
  const featureMonthlyDesc = document.getElementById('featureMonthlyDesc');
  const featureTasbihDesc = document.getElementById('featureTasbihDesc');
  const featureCalendarDesc = document.getElementById('featureCalendarDesc');
  const featureRamadhanDesc = document.getElementById('featureRamadhanDesc');
  const featureAsmaDesc = document.getElementById('featureAsmaDesc');
  const featureQiblaDesc = document.getElementById('featureQiblaDesc');

  // Coming soon badges
  const comingSoonBadges = document.querySelectorAll('.coming-soon-badge');

  // Fullscreen button
  const fullscreenBtn = document.getElementById('featuresFullscreenBtn');

  if (featuresTitle) featuresTitle.textContent = t('islamicFeatures');
  if (featuresFooterText) featuresFooterText.textContent = t('moreFeaturesComingSoon');

  if (featureQuran) featureQuran.textContent = t('holyQuran');
  if (featureAthkar) featureAthkar.textContent = t('athkar');
  if (featureMonthly) featureMonthly.textContent = t('prayerTimesMonthly');
  if (featureTasbih) featureTasbih.textContent = t('tasbih');
  if (featureCalendar) featureCalendar.textContent = t('hijriCalendar');
  if (featureRamadhan) featureRamadhan.textContent = t('ramadhan');
  if (featureAsma) featureAsma.textContent = t('asmaAllah');
  if (featureQibla) featureQibla.textContent = t('qiblaFinder');

  if (featureQuranDesc) featureQuranDesc.textContent = t('quranDesc');
  if (featureAthkarDesc) featureAthkarDesc.textContent = t('athkarDesc');
  if (featureMonthlyDesc) featureMonthlyDesc.textContent = t('prayerTimesMonthlyDesc');
  if (featureTasbihDesc) featureTasbihDesc.textContent = t('tasbihDesc');
  if (featureCalendarDesc) featureCalendarDesc.textContent = t('calendarDesc');
  if (featureRamadhanDesc) featureRamadhanDesc.textContent = t('ramadhanDesc');
  if (featureAsmaDesc) featureAsmaDesc.textContent = t('asmaDesc');
  if (featureQiblaDesc) featureQiblaDesc.textContent = t('qiblaDesc');

  comingSoonBadges.forEach(badge => {
    badge.textContent = t('comingSoon');
  });

  // Update fullscreen button
  if (fullscreenBtn) {
    fullscreenBtn.setAttribute('aria-label', isFeaturesFullscreen ? t('exitFullscreen') : t('enterFullscreen'));
    const icon = fullscreenBtn.querySelector('i');
    if (icon) {
      icon.className = isFeaturesFullscreen ? 'fas fa-compress' : 'fas fa-expand';
    }
  }
}

function setupFeatureCards() {
  // Quran card
  const quranCard = document.querySelector('[data-feature="quran"]');

  if (quranCard) {
    quranCard.addEventListener('click', openQuran);
  }

  // Athkar card
  const athkarCard = document.querySelector('[data-feature="athkar"]');

  if (athkarCard) {
    athkarCard.addEventListener('click', openAthkar);
  }

  // Ramadhan card
  const ramadhanCard = document.querySelector('[data-feature="ramadhan"]');
  if (ramadhanCard) {
    ramadhanCard.addEventListener('click', openRamadhan);
  }

  // Qibla card
  const qiblaCard = document.querySelector('[data-feature="qibla"]');
  if (qiblaCard) {
    qiblaCard.addEventListener('click', openQibla);
  }

  const asmaCard = document.querySelector('[data-feature="asma"]');
  if (asmaCard) {
    asmaCard.addEventListener('click', openAsma);
  }

}

function openQuran() {
  console.log('Opening Quran...');
  if (isFeaturesFullscreen) {
    toggleFeaturesFullscreen(); // Exit fullscreen first
  }
  ipcRenderer.invoke('resize-window', 850, 600);
  ipcRenderer.invoke('navigate-to', 'quran');
}

function openAthkar() {
  console.log('Opening Athkar...');
  if (isFeaturesFullscreen) {
    toggleFeaturesFullscreen(); // Exit fullscreen first
  }
  ipcRenderer.invoke('resize-window', 320, 575);
  ipcRenderer.invoke('navigate-to', 'athkar');
}

function openRamadhan() {
  console.log('Opening Ramadhan...');
  if (isFeaturesFullscreen) {
    toggleFeaturesFullscreen(); // Exit fullscreen first
  }
  ipcRenderer.invoke('resize-window', 320, 575);
  ipcRenderer.invoke('navigate-to', 'ramadan');
}

function openQibla() {
  console.log('Opening Qibla...');
  if (isFeaturesFullscreen) {
    toggleFeaturesFullscreen(); // Exit fullscreen first
  }
  ipcRenderer.invoke('resize-window', 320, 575);
  ipcRenderer.invoke('navigate-to', 'qibla');
}

function openAsma() {
  console.log('Opening Asma Allah...');
  if (isFeaturesFullscreen) {
    toggleFeaturesFullscreen(); // Exit fullscreen first
  }
  ipcRenderer.invoke('resize-window', 320, 575);
  ipcRenderer.invoke('navigate-to', 'asma');
}

function toggleFeaturesFullscreen() {
  isFeaturesFullscreen = !isFeaturesFullscreen;

  if (isFeaturesFullscreen) {
    // Enter fullscreen
    ipcRenderer.invoke('resize-window', 850, 600);
    document.body.classList.add('fullscreen');
    document.querySelector('.features-container').classList.add('fullscreen');
  } else {
    // Exit fullscreen
    ipcRenderer.invoke('resize-window', 320, 575);
    document.body.classList.remove('fullscreen');
    document.querySelector('.features-container').classList.remove('fullscreen');
  }

  updateFeaturesUI();
}

module.exports = { initFeaturesPage };