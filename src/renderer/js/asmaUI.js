const { ipcRenderer } = require('electron');
const { t } = require('./translations');
const screenSizeManager = require('./screenSize');

let asmaData = null;
let currentLanguage = 'en';

// Function to decode Unicode escape sequences
function decodeUnicode(str) {
  if (!str) return '';
  return str.replace(/\\u([\dA-F]{4})/gi, (match, grp) => 
    String.fromCharCode(parseInt(grp, 16))
  ).replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, '\\');
}

// ==================== ASMA PAGE FUNCTIONS ====================
function initAsmaPage() {
  console.log('Initializing Asma page...');
  
  // Get current language from HTML
  currentLanguage = document.documentElement.lang || 'en';
  console.log('Current language:', currentLanguage);
  
  // SET INITIAL SCREEN SIZE HERE
  const useBigScreen = screenSizeManager.isBigScreen();
  console.log('Initial screen size preference:', useBigScreen ? 'big' : 'small');
  
  if (useBigScreen) {
    document.body.setAttribute('data-screen-size', 'big');
    document.body.classList.add('big-screen');
    document.querySelector('.asma-container')?.classList.add('big-screen');
  } else {
    document.body.setAttribute('data-screen-size', 'small');
    document.body.classList.add('small-screen');
    document.querySelector('.asma-container')?.classList.add('small-screen');
  }
  
  // Setup back button
  const backBtn = document.getElementById('backBtn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      const currentSize = getCurrentWindowSize();
      ipcRenderer.invoke('resize-window', currentSize.width, currentSize.height);
      ipcRenderer.invoke('navigate-to', 'features');
    });
  }

  // Setup screen size toggle button
  const screenSizeBtn = document.getElementById('asmaFullscreenBtn');
  if (screenSizeBtn) {
    screenSizeBtn.addEventListener('click', toggleScreenSize);
  }

  // Update UI text
  updateAsmaUI();

  // Load asma data
  loadAsmaData();
}

function getCurrentWindowSize() {
  const isBigScreen = document.body.getAttribute('data-screen-size') === 'big';
  return isBigScreen ? { width: 850, height: 600 } : { width: 320, height: 575 };
}

function updateAsmaUI() {
  const asmaTitle = document.getElementById('asmaTitle');
  const asmaFooterText = document.getElementById('asmaFooterText');
  const loadingText = document.getElementById('loadingTextAsma');
  const screenSizeBtn = document.getElementById('asmaFullscreenBtn');

  if (asmaTitle) asmaTitle.textContent = t('asmaAllah');
  if (asmaFooterText) asmaFooterText.textContent = t('beautifulNames');
  if (loadingText) loadingText.textContent = t('loadingAsma');

  // Update screen size toggle button
  if (screenSizeBtn) {
    const isBigScreen = document.body.getAttribute('data-screen-size') === 'big';
    console.log('updateAsmaUI: Current screen size is', isBigScreen ? 'BIG' : 'SMALL');
    
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

function loadAsmaData() {
  try {
    const rawData = require('../data/99_Names_Of_Allah.json');
    asmaData = rawData.data;
    console.log('Asma data loaded:', asmaData.length, 'names');
    
    renderAsmaList();
    
    const loadingEl = document.getElementById('asmaLoading');
    if (loadingEl) {
      loadingEl.style.opacity = '0';
      setTimeout(() => {
        loadingEl.style.display = 'none';
      }, 300);
    }
  } catch (error) {
    console.error('Error loading Asma data:', error);
    showError();
  }
}

function renderAsmaList() {
  const list = document.getElementById('asmaList');
  if (!list) return;
  
  list.innerHTML = '';
  
  const isArabic = currentLanguage === 'ar';
  
  asmaData.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'asma-card';
    
    if (isArabic) {
      card.innerHTML = `
        <button class="asma-copy-btn" aria-label="${t('copy')}">
          <i class="fas fa-copy"></i>
        </button>
        <div class="asma-name">${item.name}</div>
        <div class="asma-number">${item.number}</div>
      `;
      
      const copyBtn = card.querySelector('.asma-copy-btn');
      copyBtn.addEventListener('click', () => copyAsmaArabic(item.name));
    } else {
      const langData = item[currentLanguage] || item.en;
      const meaning = decodeUnicode(langData.meaning);
      const desc = decodeUnicode(langData.desc);
      
      card.innerHTML = `
        <div class="asma-number">${item.number}</div>
        <div class="asma-name">${item.name}</div>
        <div class="asma-translit">${item.transliteration}</div>
        <div class="asma-meaning">${meaning}</div>
        <div class="asma-desc">${desc}</div>
        <button class="asma-copy-btn" aria-label="${t('copy')}">
          <i class="fas fa-copy"></i>
        </button>
      `;
      
      const copyBtn = card.querySelector('.asma-copy-btn');
      copyBtn.addEventListener('click', () => copyAsma(item, meaning, desc));
    }
    
    list.appendChild(card);
  });
}

function copyAsma(item, meaning, desc) {
  const text = `${item.name} - ${item.transliteration} - ${meaning}\n${desc}`;
  
  navigator.clipboard.writeText(text)
    .then(() => {
      showSuccessToast(t('copiedToClipboard'));
    })
    .catch(err => {
      console.error('Failed to copy:', err);
      showSuccessToast(t('failedToCopy'), true);
    });
}

function copyAsmaArabic(name) {
  navigator.clipboard.writeText(name)
    .then(() => {
      showSuccessToast(t('copiedToClipboard'));
    })
    .catch(err => {
      console.error('Failed to copy:', err);
      showSuccessToast(t('failedToCopy'), true);
    });
}

function showSuccessToast(message, isError = false) {
  document.querySelectorAll('.success-toast').forEach(toast => toast.remove());
  
  const toast = document.createElement('div');
  toast.className = `success-toast ${isError ? 'error' : ''}`;
  toast.innerHTML = `
    <i class="fas fa-${isError ? 'exclamation-circle' : 'check-circle'}"></i>
    <span>${message}</span>
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 500);
  }, 3000);
}

function showError() {
  const content = document.getElementById('asmaContent');
  if (content) {
    content.innerHTML = `
      <div class="error-message">
        <i class="fas fa-exclamation-circle"></i>
        <div>${t('errorLoading')}</div>
        <button class="retry-button" id="retryAsma">
          <i class="fas fa-redo"></i> ${t('retry')}
        </button>
      </div>
    `;
    document.getElementById('retryAsma').addEventListener('click', loadAsmaData);
  }
}

function toggleScreenSize() {
  const isCurrentlyBig = document.body.getAttribute('data-screen-size') === 'big';
  console.log('toggleScreenSize: Switching FROM', isCurrentlyBig ? 'BIG to SMALL' : 'SMALL to BIG');
  
  if (isCurrentlyBig) {
    // Switch FROM big TO small screen
    ipcRenderer.invoke('resize-window', 320, 575);
    document.body.setAttribute('data-screen-size', 'small');
    document.body.classList.remove('big-screen');
    document.body.classList.add('small-screen');
    document.querySelector('.asma-container')?.classList.remove('big-screen');
    document.querySelector('.asma-container')?.classList.add('small-screen');
    
  } else {
    // Switch FROM small TO big screen
    ipcRenderer.invoke('resize-window', 850, 600);
    document.body.setAttribute('data-screen-size', 'big');
    document.body.classList.remove('small-screen');
    document.body.classList.add('big-screen');
    document.querySelector('.asma-container')?.classList.remove('small-screen');
    document.querySelector('.asma-container')?.classList.add('big-screen');
    
  }

  updateAsmaUI();
  setTimeout(() => renderAsmaList(), 150);
}

// Listen for language changes only
document.addEventListener('DOMContentLoaded', () => {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.attributeName === 'lang') {
        currentLanguage = document.documentElement.lang;
        updateAsmaUI();
        renderAsmaList();
      }
    });
  });
  
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['lang']
  });
});

module.exports = { initAsmaPage };