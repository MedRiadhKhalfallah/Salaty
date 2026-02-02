// src/renderer/js/locationManager.js
const { ipcRenderer } = require('electron');
const { t } = require('./translations');
const { showToast } = require('./toast');

/**
 * Get all locations
 */
async function getLocations() {
  try {
    return await ipcRenderer.invoke('get-locations');
  } catch (error) {
    console.error('Error getting locations:', error);
    return [];
  }
}

/**
 * Get active location
 */
async function getActiveLocation() {
  try {
    const locations = await getLocations();
    return locations.find(loc => loc.isActive) || null;
  } catch (error) {
    console.error('Error getting active location:', error);
    return null;
  }
}

/**
 * Add new location
 */
async function addLocation(locationData) {
  try {
    const newLocation = await ipcRenderer.invoke('add-location', locationData);
    showToast(t('locationAdded'), 'success');
    return newLocation;
  } catch (error) {
    console.error('Error adding location:', error);
    showToast(t('errorAddingLocation'), 'error');
    return null;
  }
}

/**
 * Update location
 */
async function updateLocation(locationId, updates) {
  try {
    const updatedLocation = await ipcRenderer.invoke('update-location', locationId, updates);
    if (updatedLocation) {
      showToast(t('locationUpdated'), 'success');
    }
    return updatedLocation;
  } catch (error) {
    console.error('Error updating location:', error);
    showToast(t('errorUpdatingLocation'), 'error');
    return null;
  }
}

/**
 * Delete location
 */
async function deleteLocation(locationId) {
  try {
    const success = await ipcRenderer.invoke('delete-location', locationId);
    if (success) {
      showToast(t('locationDeleted'), 'success');
    } else {
      showToast(t('cannotDeleteLastLocation'), 'error');
    }
    return success;
  } catch (error) {
    console.error('Error deleting location:', error);
    showToast(t('errorDeletingLocation'), 'error');
    return false;
  }
}

/**
 * Set active location
 */
async function setActiveLocation(locationId) {
  try {
    const success = await ipcRenderer.invoke('set-active-location', locationId);
    if (success) {
      showToast(t('locationActivated'), 'success');
      // Reload the page to update prayer times
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
    return success;
  } catch (error) {
    console.error('Error setting active location:', error);
    showToast(t('errorActivatingLocation'), 'error');
    return false;
  }
}

/**
 * Toggle travel mode
 */
async function toggleTravelMode(enabled) {
  try {
    const travelMode = await ipcRenderer.invoke('toggle-travel-mode', enabled);
    return travelMode;
  } catch (error) {
    console.error('Error toggling travel mode:', error);
    return null;
  }
}

/**
 * Detect current location
 */
async function detectLocation() {
  try {
    const detected = await ipcRenderer.invoke('detect-location');
    return detected;
  } catch (error) {
    console.error('Error detecting location:', error);
    showToast(t('errorDetectingLocation'), 'error');
    return null;
  }
}

module.exports = {
  getLocations,
  getActiveLocation,
  addLocation,
  updateLocation,
  deleteLocation,
  setActiveLocation,
  toggleTravelMode,
  detectLocation
};
