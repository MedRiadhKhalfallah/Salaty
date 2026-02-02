const { ipcMain, app } = require('electron');
const fs = require('fs');
const path = require('path');

let settingsData = {
  city: 'Tunis',
  country: 'Tunisia',
  theme: 'navy',
  language: 'en',
  position: { x: 100, y: 100 },
  bigScreen: true,
  locations: [],
  travelMode: {
    enabled: false,
    autoSwitch: true,
    lastDetected: null
  }
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

    // Migrate old single location to new multi-location structure
    migrateToMultiLocation();
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

/**
 * Migrate old single location format to new multi-location structure
 */
function migrateToMultiLocation() {
  // Check if migration is needed (no locations array or empty)
  if (!settingsData.locations || settingsData.locations.length === 0) {
    const hasOldLocation = settingsData.city && settingsData.country;

    if (hasOldLocation) {
      // Create first location from existing city/country
      const firstLocation = {
        id: generateLocationId(),
        name: 'Home',
        city: settingsData.city,
        country: settingsData.country,
        isActive: true,
        isFavorite: true,
        createdAt: new Date().toISOString()
      };

      settingsData.locations = [firstLocation];
      saveSettings();
      console.log('Migrated old location to multi-location structure');
    } else {
      // No existing location, create default
      const defaultLocation = {
        id: generateLocationId(),
        name: 'Home',
        city: 'Tunis',
        country: 'Tunisia',
        isActive: true,
        isFavorite: true,
        createdAt: new Date().toISOString()
      };

      settingsData.locations = [defaultLocation];
      settingsData.city = 'Tunis';
      settingsData.country = 'Tunisia';
      saveSettings();
    }
  }

  // Ensure travelMode structure exists
  if (!settingsData.travelMode) {
    settingsData.travelMode = {
      enabled: false,
      autoSwitch: true,
      lastDetected: null
    };
  }

  // Sync active location with city/country for backward compatibility
  syncActiveLocation();
}

/**
 * Sync active location with city/country fields for backward compatibility
 */
function syncActiveLocation() {
  if (settingsData.locations && settingsData.locations.length > 0) {
    const activeLocation = settingsData.locations.find(loc => loc.isActive);
    if (activeLocation) {
      settingsData.city = activeLocation.city;
      settingsData.country = activeLocation.country;
    }
  }
}

/**
 * Generate unique location ID
 */
function generateLocationId() {
  return 'loc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
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
    syncActiveLocation();
    saveSettings();
    return settingsData;
  });

  // Location management handlers
  ipcMain.handle('add-location', (_event, locationData) => {
    const newLocation = {
      id: generateLocationId(),
      name: locationData.name || 'New Location',
      city: locationData.city,
      country: locationData.country,
      isActive: false,
      isFavorite: locationData.isFavorite || false,
      createdAt: new Date().toISOString()
    };

    if (!settingsData.locations) {
      settingsData.locations = [];
    }

    settingsData.locations.push(newLocation);
    saveSettings();
    return newLocation;
  });

  ipcMain.handle('update-location', (_event, locationId, updates) => {
    if (!settingsData.locations) return null;

    const locationIndex = settingsData.locations.findIndex(loc => loc.id === locationId);
    if (locationIndex === -1) return null;

    settingsData.locations[locationIndex] = {
      ...settingsData.locations[locationIndex],
      ...updates
    };

    saveSettings();
    return settingsData.locations[locationIndex];
  });

  ipcMain.handle('delete-location', (_event, locationId) => {
    if (!settingsData.locations) return false;

    const locationIndex = settingsData.locations.findIndex(loc => loc.id === locationId);
    if (locationIndex === -1) return false;

    // Prevent deleting the active location if it's the only one
    const location = settingsData.locations[locationIndex];
    if (location.isActive && settingsData.locations.length === 1) {
      return false;
    }

    // If deleting active location, activate another one
    if (location.isActive && settingsData.locations.length > 1) {
      const nextLocation = settingsData.locations.find((_loc, idx) => idx !== locationIndex);
      if (nextLocation) {
        nextLocation.isActive = true;
      }
    }

    settingsData.locations.splice(locationIndex, 1);
    syncActiveLocation();
    saveSettings();
    return true;
  });

  ipcMain.handle('set-active-location', (_event, locationId) => {
    if (!settingsData.locations) return false;

    // Deactivate all locations
    settingsData.locations.forEach(loc => {
      loc.isActive = false;
    });

    // Activate the selected location
    const location = settingsData.locations.find(loc => loc.id === locationId);
    if (location) {
      location.isActive = true;
      syncActiveLocation();
      saveSettings();
      return true;
    }

    return false;
  });

  ipcMain.handle('get-locations', () => {
    return settingsData.locations || [];
  });

  ipcMain.handle('detect-location', async () => {
    try {
      const http = require('http');

      return new Promise((resolve, reject) => {
        http.get('http://ip-api.com/json', (res) => {
          let data = '';

          res.on('data', (chunk) => {
            data += chunk;
          });

          res.on('end', () => {
            try {
              const locationData = JSON.parse(data);
              console.log('Location detection response:', locationData);

              if (locationData && locationData.status === 'success') {
                const detected = {
                  city: locationData.city,
                  country: locationData.country,
                  detectedAt: new Date().toISOString()
                };

                if (settingsData.travelMode) {
                  settingsData.travelMode.lastDetected = detected;
                  saveSettings();
                }

                resolve(detected);
              } else {
                const errorMsg = locationData.message || 'Location detection failed';
                console.error('Location detection failed:', errorMsg);
                reject(new Error(errorMsg));
              }
            } catch (error) {
              console.error('Error parsing location data:', error);
              reject(error);
            }
            
          });
        }).on('error', (error) => {
          console.error('HTTP request error:', error);
          reject(error);
        });
      });
    } catch (error) {
      console.error('Location detection error:', error);
      throw error;
    }
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