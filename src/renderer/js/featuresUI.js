const { ipcRenderer } = require('electron');
const { t } = require('./translations');

// ==================== FEATURES PAGE FUNCTIONS ====================
function initFeaturesPage() {
  console.log('Initializing Features page...');
  
  // Setup back button
  const backBtn = document.getElementById('backBtn');
  if (backBtn) {
    console.log('Back button found');
    backBtn.addEventListener('click', () => {
      console.log('Back button clicked');
      ipcRenderer.invoke('resize-window', 320, 540);
      ipcRenderer.invoke('go-back');
    });
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

}

function openQuran() {
  console.log('Opening Quran...');
  ipcRenderer.invoke('resize-window', 850, 600);
  ipcRenderer.invoke('navigate-to', 'quran');
}

function openAthkar() {
  console.log('Opening Athkar...');
  ipcRenderer.invoke('resize-window', 850, 600);
  ipcRenderer.invoke('navigate-to', 'athkar');
}

module.exports = { initFeaturesPage };