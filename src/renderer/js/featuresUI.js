const { ipcRenderer } = require('electron');
const { t } = require('./translations');
const screenSizeManager = require('./screenSize'); 

function initFeaturesPage() {
  console.log('Initializing Features page...');

  // SET INITIAL SCREEN SIZE
  const useBigScreen = screenSizeManager.isBigScreen();
  console.log('Initial screen size preference:', useBigScreen ? 'big' : 'small');
  
  if (useBigScreen) {
    document.body.setAttribute('data-screen-size', 'big');
    document.body.classList.add('big-screen');
    document.querySelector('.features-container')?.classList.add('big-screen');
  } else {
    document.body.setAttribute('data-screen-size', 'small');
    document.body.classList.add('small-screen');
    document.querySelector('.features-container')?.classList.add('small-screen');
  }

  // Setup back button
  const backBtn = document.getElementById('backBtn');
  if (backBtn) {
    console.log('Back button found');
    backBtn.addEventListener('click', () => {
      console.log('Back button clicked');
      const currentSize = getCurrentWindowSize();
      ipcRenderer.invoke('resize-window', currentSize.width, currentSize.height);
      ipcRenderer.invoke('go-back');
    });
  }

  // Setup screen size toggle button (formerly fullscreen button)
  const screenSizeBtn = document.getElementById('featuresFullscreenBtn');
  if (screenSizeBtn) {
    screenSizeBtn.addEventListener('click', toggleFeaturesScreenSize);
  }

  // Update UI text
  updateFeaturesUI();

  // Setup feature card clicks
  setupFeatureCards();
}

function getCurrentWindowSize() {
  const isBigScreen = document.body.getAttribute('data-screen-size') === 'big';
  return isBigScreen ? { width: 850, height: 600 } : { width: 320, height: 575 };
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

  // Screen size button
  const screenSizeBtn = document.getElementById('featuresFullscreenBtn');

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

  // Update screen size button
  if (screenSizeBtn) {
    const isBigScreen = document.body.getAttribute('data-screen-size') === 'big';
    
    if (isBigScreen) {
      // Currently big → button should say "Small Screen"
      screenSizeBtn.setAttribute('aria-label', t('switchToSmallScreen') || 'Switch to Small Screen');
      const icon = screenSizeBtn.querySelector('i');
      if (icon) {
        icon.className = 'fas fa-compress';
      }
    } else {
      // Currently small → button should say "Big Screen"
      screenSizeBtn.setAttribute('aria-label', t('switchToBigScreen') || 'Switch to Big Screen');
      const icon = screenSizeBtn.querySelector('i');
      if (icon) {
        icon.className = 'fas fa-expand';
      }
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
  ipcRenderer.invoke('resize-window', 850, 600);
  ipcRenderer.invoke('navigate-to', 'quran');
}

function openAthkar() {
  console.log('Opening Athkar...');
  const size = screenSizeManager.getWindowSize();
  ipcRenderer.invoke('resize-window', size.width, size.height);
  ipcRenderer.invoke('navigate-to', 'athkar');
}

function openRamadhan() {
  console.log('Opening Ramadhan...');
  const size = screenSizeManager.getWindowSize();
  ipcRenderer.invoke('resize-window', size.width, size.height);
  ipcRenderer.invoke('navigate-to', 'ramadan');
}

function openQibla() {
  console.log('Opening Qibla...');
  const size = screenSizeManager.getWindowSize();
  ipcRenderer.invoke('resize-window', size.width, size.height);
  ipcRenderer.invoke('navigate-to', 'qibla');
}

function openAsma() {
  console.log('Opening Asma Allah...');
  const size = screenSizeManager.getWindowSize();
  ipcRenderer.invoke('resize-window', size.width, size.height);
  ipcRenderer.invoke('navigate-to', 'asma');
}

function toggleFeaturesScreenSize() {
  const isCurrentlyBig = document.body.getAttribute('data-screen-size') === 'big';
  console.log('toggleFeaturesScreenSize: Switching FROM', isCurrentlyBig ? 'BIG to SMALL' : 'SMALL to BIG');
  
  if (isCurrentlyBig) {
    // Switch FROM big TO small screen
    ipcRenderer.invoke('resize-window', 320, 575);
    document.body.setAttribute('data-screen-size', 'small');
    document.body.classList.remove('big-screen');
    document.body.classList.add('small-screen');
    document.querySelector('.features-container')?.classList.remove('big-screen');
    document.querySelector('.features-container')?.classList.add('small-screen');
  } else {
    // Switch FROM small TO big screen
    ipcRenderer.invoke('resize-window', 850, 600);
    document.body.setAttribute('data-screen-size', 'big');
    document.body.classList.remove('small-screen');
    document.body.classList.add('big-screen');
    document.querySelector('.features-container')?.classList.remove('small-screen');
    document.querySelector('.features-container')?.classList.add('big-screen');
  }

  updateFeaturesUI();
}

module.exports = { initFeaturesPage };