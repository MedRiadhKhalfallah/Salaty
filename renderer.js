const { ipcRenderer } = require('electron');

let currentSettings = { theme: 'navy', city: '', country: '' };
let prayerData = null;

const prayerNames = {
  'Fajr': 'Fajr',
  'Dhuhr': 'Dhuhr',
  'Asr': 'Asr',
  'Maghrib': 'Maghrib',
  'Isha': 'Isha'
};

const prayerIcons = {
  'Fajr': 'cloud-moon',
  'Dhuhr': 'sun',
  'Asr': 'cloud-sun',
  'Maghrib': 'cloud',
  'Isha': 'moon'
};

async function initApp() {
  try {
    // Initialize with default settings first
    selectedTheme = 'navy';
    pendingTheme = 'navy';
    applyTheme('navy');
    
    try {
      const settings = await ipcRenderer.invoke('get-settings');
      if (settings) {
        currentSettings = { ...currentSettings, ...settings };
        if (currentSettings.theme) {
          selectedTheme = currentSettings.theme;
          pendingTheme = currentSettings.theme;
          applyTheme(currentSettings.theme);
        }
      }
    } catch (error) {
      console.warn('Could not load settings, using defaults:', error);
    }
    
    updateSettingsInputs();
    initThemeUI();
    
    // Initial load
    await loadPrayerTimes();
    
    // Set up intervals
    setInterval(updateCurrentAndNextPrayer, 1000);
    setInterval(loadPrayerTimes, 3600000); // Refresh prayer times every hour
    
    // Initial update
    updateCurrentAndNextPrayer();
  } catch (error) {
    console.error('Error initializing app:', error);
    showToast('Error initializing app', 'error');
    const container = document.getElementById('prayerCards') || document.getElementById('prayerTimes');
    if (container) {
      container.innerHTML = '<div class="loading">Error loading prayer times</div>';
    }
  }
}

async function loadPrayerTimes() {
  const prayerTimesContainer = document.getElementById('prayerTimes');
  
  try {
    if (!currentSettings.city || !currentSettings.country) {
      throw new Error('Location not set');
    }

    // Show loading state
    if (prayerTimesContainer) {
      prayerTimesContainer.innerHTML = '<div class="loading">Loading prayer times...</div>';
    }

    const url = `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(currentSettings.city)}&country=${encodeURIComponent(currentSettings.country)}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data && data.code === 200) {
      prayerData = data.data;
      updateUI();
      return true;
    } else {
      const errorMsg = data?.data?.message || 'Invalid response from server';
      throw new Error(errorMsg);
    }
  } catch (error) {
    console.error('Error loading prayer times:', error);
    const errorMessage = error.message.includes('Failed to fetch') 
      ? 'Network error. Please check your connection.'
      : `Error: ${error.message}`;
      
    showToast('Failed to load prayer times', 'error');
    
    if (prayerTimesContainer) {
      prayerTimesContainer.innerHTML = `
        <div class="error-message">
          <i class="fas fa-exclamation-triangle"></i>
          <div>${errorMessage}</div>
          <button id="retryButton" class="retry-button">
            <i class="fas fa-sync-alt"></i> Retry
          </button>
        </div>
      `;
      
      // Add retry button event listener
      const retryButton = document.getElementById('retryButton');
      if (retryButton) {
        retryButton.addEventListener('click', loadPrayerTimes);
      }
    }
    
    return false;
  }
}

function updateUI() {
  if (!prayerData) return;

  document.getElementById('location').textContent = `${currentSettings.city}, ${currentSettings.country}`;
  document.getElementById('gregorianDate').textContent = prayerData.date.readable;
  document.getElementById('hijriDate').textContent = `${prayerData.date.hijri.day} ${prayerData.date.hijri.month.en} ${prayerData.date.hijri.year} AH`;

  // Get current prayer key from the currentActivePrayer variable
  const now = new Date();
  const currentSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  let currentPrayerKey = '';
  
  // Find the current prayer by checking which prayer time we're currently between
  const prayerTimes = [];
  
  // First, collect all prayer times
  for (const [key] of Object.entries(prayerNames)) {
    const time = prayerData.timings[key];
    if (!time) continue;
    
    const [hours, minutes] = time.split(':').map(Number);
    let prayerSeconds = hours * 3600 + minutes * 60;
    
    prayerTimes.push({
      key: key,
      seconds: prayerSeconds
    });
  }
  
  // Sort by time
  prayerTimes.sort((a, b) => a.seconds - b.seconds);
  
  // Find the last prayer that has passed
  for (let i = 0; i < prayerTimes.length; i++) {
    if (prayerTimes[i].seconds <= currentSeconds) {
      currentPrayerKey = prayerTimes[i].key;
    } else {
      break;
    }
  }
  
  // If no prayer has passed yet, use the last prayer from previous day
  if (!currentPrayerKey && prayerTimes.length > 0) {
    currentPrayerKey = prayerTimes[prayerTimes.length - 1].key;
  }

  const prayerTimesHTML = Object.entries(prayerNames).map(([key, name]) => {
    const time = prayerData.timings[key];
    const icon = prayerIcons[key] || 'clock';
    const isCurrent = key === currentPrayerKey;
    return `
      <div class="prayer-item ${isCurrent ? 'current-prayer' : ''}" data-prayer="${key}">
        <i class="fas fa-${icon}"></i>
        <span class="prayer-name">${name}</span>
        <span class="prayer-time">${time} ${isCurrent ? '<span class="current-indicator">Now</span>' : ''}</span>
      </div>
    `;
  }).join('');

  document.getElementById('prayerList').innerHTML = prayerTimesHTML;
  // Update countdown for next prayer
  const countdownElement = document.getElementById('countdown');
  if (countdownElement) {
    // Ensure timeRemaining is positive
    const remaining = timeRemaining > 0 ? timeRemaining : 0;
    countdownElement.textContent = formatTime(remaining);
  }
}

function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Track the current prayer to detect changes
let currentActivePrayer = null;

function updateCurrentAndNextPrayer() {
  try {
    if (!prayerData || !prayerData.timings) return;

    const now = new Date();
    const currentSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    let currentPrayer = null;
    let nextPrayer = null;
    let timeRemaining = 0;

    const prayers = Object.entries(prayerNames)
      .filter(([key]) => prayerData.timings[key]) // Filter out undefined timings
      .map(([key, name]) => {
        const time = prayerData.timings[key];
        if (!time) return null;
        
        const [hours, minutes] = time.split(':').map(Number);
        let prayerSeconds = hours * 3600 + minutes * 60;
        if (prayerSeconds < currentSeconds) {
          prayerSeconds += 86400; // Add 24 hours if prayer is for next day
        }
        
        return {
          key: key,
          name: name,
          time: time,
          seconds: prayerSeconds,
          timeUntil: prayerSeconds - currentSeconds
        };
      })
      .filter(Boolean) // Remove any null entries
      .sort((a, b) => a.seconds - b.seconds);

    if (prayers.length === 0) return;

    // Find current and next prayer
    const currentPrayerIndex = prayers.findIndex(p => p.seconds > currentSeconds) - 1;
    currentPrayer = currentPrayerIndex >= 0 ? prayers[currentPrayerIndex] : prayers[prayers.length - 1];
    nextPrayer = prayers[(currentPrayerIndex + 1) % prayers.length] || prayers[0];
    
    if (!nextPrayer) return;
    
    // Calculate time remaining until next prayer
    timeRemaining = nextPrayer.seconds - currentSeconds;
    if (timeRemaining < 0) timeRemaining = 0;
    
    // Check if current prayer has changed
    const prayerChanged = currentActivePrayer !== currentPrayer.key;
    currentActivePrayer = currentPrayer.key;
    
    // Update prayer cards
    const prayerCardsContainer = document.getElementById('prayerCards');
    if (prayerCardsContainer) {
      prayerCardsContainer.innerHTML = `
        <div class="prayer-card current">
          <div class="prayer-label">Current Prayer</div>
          <div class="prayer-name">${currentPrayer?.name || '--'}</div>
          <div class="prayer-time">${currentPrayer?.time || '--:--'}</div>
          <div class="time-remaining">End time - ${nextPrayer?.time || '--:--'}</div>
        </div>
        <div class="prayer-card next">
          <div class="prayer-label">Next Prayer</div>
          <div class="prayer-name">${nextPrayer?.name || '--'}</div>
          <div class="prayer-time">${nextPrayer?.time || '--:--'}</div>
          <div class="countdown" id="countdown">${formatTime(timeRemaining)}</div>
        </div>
      `;
    }
    
    // If prayer changed, update the UI to highlight the current prayer
    if (prayerChanged) {
      updateUI();
    }
  } catch (error) {
    console.error('Error in updateCurrentAndNextPrayer:', error);
  }
}

let selectedTheme = 'navy';
let pendingTheme = 'navy';

function initThemeUI() {
  document.querySelectorAll('.theme-option').forEach(opt => {
    opt.classList.toggle('selected', opt.dataset.theme === selectedTheme);
  });
  updateSaveButtonTheme(selectedTheme);
}

function applyTheme(theme) {
  const app = document.getElementById('app');
  // Remove all theme classes
  const themeClasses = [
    'theme-dark', 'theme-blue', 'theme-green', 'theme-brown', 
    'theme-gold', 'theme-pink', 'theme-purple', 'theme-emerald',
    'theme-ocean', 'theme-royal', 'theme-indigo', 'theme-classic'
  ];
  app.classList.remove(...themeClasses);
  // Add the new theme class
  app.classList.add(`theme-${theme}`);
  
  // Update the save button theme as well
  updateSaveButtonTheme(theme);
}

function updateSaveButtonTheme(theme) {
  const saveBtn = document.querySelector('.save-btn');
  if (saveBtn) {
    const gradients = {
      'navy': 'linear-gradient(90deg, #0a1128, #1a237e)',
      'green': 'linear-gradient(90deg, #1b5e20, #2e7d32)',
      'brown': 'linear-gradient(90deg, #4e342e, #6d4c41)',
      'gold': 'linear-gradient(90deg, #8e6e19, #b5982c)',
      'pink': 'linear-gradient(90deg, #7a1a4a, #b51a5c)'
    };
    saveBtn.style.setProperty('--accent-gradient', gradients[theme] || gradients['navy']);
  }
}

document.addEventListener('click', (e) => {
  if (e.target.classList.contains('theme-option')) {
    const newTheme = e.target.dataset.theme;
    pendingTheme = newTheme;
    
    document.querySelectorAll('.theme-option').forEach(opt => {
      opt.classList.toggle('selected', opt.dataset.theme === newTheme);
    });
    
    updateSaveButtonTheme(newTheme);
  }
});

function toggleSettings() {
  const settingsPanel = document.getElementById('settingsPanel');
  const isActive = settingsPanel.classList.contains('active');
  
  // Toggle body class for settings open state
  if (isActive) {
    document.body.classList.remove('settings-open');
    // Closing the panel
    settingsPanel.classList.remove('active');
    // Wait for the animation to complete before hiding
    setTimeout(() => {
      if (!settingsPanel.classList.contains('active')) {
        settingsPanel.style.display = 'none';
      }
    }, 300);
  } else {
    // Opening the panel
    document.body.classList.add('settings-open');
    settingsPanel.style.display = 'flex';
    // Force reflow to ensure the element is rendered before adding the active class
    void settingsPanel.offsetWidth;
    settingsPanel.classList.add('active');
    
    // Load current settings into the form
    updateSettingsInputs();
    
    // Ensure the panel is scrolled to the top when opened
    settingsPanel.scrollTop = 0;
  }
  
  // Prevent event bubbling
  if (event) event.stopPropagation();
  // Prevent scrolling when settings are open
  document.body.style.overflow = settingsPanel.classList.contains('active') ? 'hidden' : '';
}

function updateSettingsInputs() {
  document.getElementById('cityInput').value = currentSettings.city || '';
  document.getElementById('countryInput').value = currentSettings.country || '';
}

async function saveSettings() {
  const city = document.getElementById('cityInput').value.trim();
  const country = document.getElementById('countryInput').value.trim();
  
  if (!city || !country) {
    showToast('Please enter both city and country', 'error');
    return;
  }

  try {
    // Update the theme first
    selectedTheme = pendingTheme;
    applyTheme(selectedTheme);
    
    // Update current settings
    currentSettings.city = city;
    currentSettings.country = country;
    currentSettings.theme = selectedTheme;
    
    // Save settings to persistent storage
    await ipcRenderer.invoke('save-settings', currentSettings);
    
    // Show loading state
    const prayerTimesContainer = document.getElementById('prayerTimes');
    if (prayerTimesContainer) {
      prayerTimesContainer.innerHTML = '<div class="loading">Loading prayer times...</div>';
    }
    
    // Load new prayer times
    await loadPrayerTimes();
    
    // Close settings panel after successful update
    toggleSettings();
    showToast('Settings saved successfully', 'success');
  } catch (error) {
    console.error('Error saving settings:', error);
    showToast('Error saving settings', 'error');
  }
}

async function minimizeWindow() {
  await ipcRenderer.invoke('minimize-window');
}

function closeWindow() {
  ipcRenderer.invoke('close-window');
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  // Get the computed style from the app container to access CSS variables
  const app = document.getElementById('app');
  const styles = window.getComputedStyle(app);
  
  // Set the toast background to use the theme's accent color with some transparency
  const bgColor = styles.getPropertyValue('--accent-color') || 'rgba(76, 175, 80, 0.9)';
  toast.style.background = bgColor;
  
  let icon = 'info-circle';
  if (type === 'success') icon = 'check-circle';
  if (type === 'error') {
    icon = 'exclamation-circle';
    // Override for error to keep it red
    toast.style.background = 'rgba(244, 67, 54, 0.9)';
  }
  
  toast.innerHTML = `
    <i class="fas fa-${icon}"></i>
    <span>${message}</span>
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => toast.classList.add('show'), 10);
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}


// Add click event listener for settings button
document.addEventListener('DOMContentLoaded', () => {
  initApp();
  
  // Add click event listener for settings button
  const settingsBtn = document.getElementById('mainSettingsBtn');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', toggleSettings);
  }
  
  // Add transition for smooth appearance
  const style = document.createElement('style');
  style.textContent = `
    .settings-btn {
      transition: opacity 0.2s ease, transform 0.2s ease;
    }
  `;
  document.head.appendChild(style);
});