const { ipcMain, app } = require('electron');
const fs = require('fs');
const path = require('path');

let settingsData = {
  city: 'Tunis',
  country: 'Tunisia',
  theme: 'navy',
  language: 'en',
  position: { x: 100, y: 100 },
  bigScreen: true
};

function getSettingsPath() {
  return path.join(app.getPath('userData'), 'settings.json');
}

function loadSettings() {
  try {
    const settingsPath = getSettingsPath();
    // Try loading from userData first (User preferences)
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf8');
      settingsData = { ...settingsData, ...JSON.parse(data) };
    } else {
      // If not found in userData, try loading bundled default settings
      // This handles the first run or migration
      const bundledPath = path.join(__dirname, '../../settings.json');
      if (fs.existsSync(bundledPath)) {
         const data = fs.readFileSync(bundledPath, 'utf8');
         settingsData = { ...settingsData, ...JSON.parse(data) };
      }
      // Save to userData immediately to ensure persistence for next time
      saveSettings();
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

function saveSettings() {
  try {
    const settingsPath = getSettingsPath();
    fs.writeFileSync(settingsPath, JSON.stringify(settingsData, null, 2));
  } catch (error) {
    console.error('Error saving settings:', error);
  }
}

// Get settings data
function getSettingsData() {
  return settingsData;
}

// Save position specifically
function savePosition(x, y) {
  settingsData.position = { x, y };
  saveSettings();
}

function setupHandlers(mainWindow) {
  // IPC handlers
  ipcMain.handle('get-settings', () => {
    return settingsData;
  });

  ipcMain.handle('save-settings', (event, newSettings) => {
    settingsData = { ...settingsData, ...newSettings };
    saveSettings();
    return settingsData;
  });

  ipcMain.handle('minimize-window', () => {
    if (mainWindow) {
      mainWindow.minimize();
    }
  });

  ipcMain.handle('close-window', () => {
    if (mainWindow) {
      mainWindow.hide();
    }
  });

  ipcMain.handle('resize-window', (event, width, height) => {
    if (mainWindow) {
      mainWindow.setSize(width, height, true);
      // mainWindow.center(); // Removed to keep window position
      return { width, height };
    }
    return { width: 320, height: 575 };
  });

  ipcMain.handle('get-window-size', () => {
    if (mainWindow) {
      const size = mainWindow.getSize();
      return { width: size[0], height: size[1] };
    }
    return { width: 320, height: 575 };
  });

  ipcMain.handle('navigate-to', (event, page) => {
    if (mainWindow) {
      mainWindow.loadFile(path.join(__dirname, `../renderer/pages/${page}.html`));
    }
    return true;
  });

  ipcMain.handle('go-back', () => {
    if (mainWindow) {
      mainWindow.loadFile(path.join(__dirname, '../renderer/pages/index.html'));
    }
    return true;
  });
}

module.exports = {
  settingsData,
  loadSettings,
  saveSettings,
  getSettingsData,
  savePosition,
  setupHandlers
};