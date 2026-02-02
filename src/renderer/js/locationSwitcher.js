// src/renderer/js/locationSwitcher.js
const locationManager = require('./locationManager');
const { t } = require('./translations');

let isDropdownOpen = false;

/**
 * Initialize location switcher on main page
 */
async function initLocationSwitcher() {
  const switcherBtn = document.getElementById('locationSwitcherBtn');
  const dropdown = document.getElementById('locationSwitcherDropdown');

  if (!switcherBtn || !dropdown) return;

  // Load locations and update switcher
  await updateLocationSwitcher();

  // Toggle dropdown
  switcherBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleDropdown();
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (isDropdownOpen && !dropdown.contains(e.target) && e.target !== switcherBtn) {
      closeDropdown();
    }
  });
}

/**
 * Update location switcher with current locations
 */
async function updateLocationSwitcher() {
  const switcherBtn = document.getElementById('locationSwitcherBtn');
  const dropdown = document.getElementById('locationSwitcherDropdown');

  if (!switcherBtn || !dropdown) return;

  const locations = await locationManager.getLocations();
  const favoriteLocations = locations.filter(loc => loc.isFavorite);

  // Show switcher button only if there are favorite locations
  if (favoriteLocations.length > 1) {
    switcherBtn.style.display = 'flex';
  } else {
    switcherBtn.style.display = 'none';
    return;
  }

  // Build dropdown HTML
  dropdown.innerHTML = favoriteLocations.map(location => `
    <div class="location-switcher-item ${location.isActive ? 'active' : ''}"
         data-location-id="${location.id}">
      <div class="switcher-item-info">
        <div class="switcher-item-name">${location.name}</div>
        <div class="switcher-item-details">${location.city}, ${location.country}</div>
      </div>
      ${location.isActive ? '<i class="fas fa-check switcher-check"></i>' : ''}
    </div>
  `).join('');

  // Add event listeners to items
  dropdown.querySelectorAll('.location-switcher-item').forEach(item => {
    item.addEventListener('click', async (e) => {
      e.stopPropagation();
      const locationId = item.dataset.locationId;
      const location = locations.find(loc => loc.id === locationId);

      if (location && !location.isActive) {
        await locationManager.setActiveLocation(locationId);
        closeDropdown();
        // Page will reload after location change
      } else {
        closeDropdown();
      }
    });
  });
}

/**
 * Toggle dropdown visibility
 */
function toggleDropdown() {
  const dropdown = document.getElementById('locationSwitcherDropdown');
  const switcherBtn = document.getElementById('locationSwitcherBtn');

  if (!dropdown || !switcherBtn) return;

  if (isDropdownOpen) {
    closeDropdown();
  } else {
    openDropdown();
  }
}

/**
 * Open dropdown
 */
function openDropdown() {
  const dropdown = document.getElementById('locationSwitcherDropdown');
  const switcherBtn = document.getElementById('locationSwitcherBtn');

  if (!dropdown || !switcherBtn) return;

  dropdown.classList.add('active');
  switcherBtn.classList.add('active');
  isDropdownOpen = true;
}

/**
 * Close dropdown
 */
function closeDropdown() {
  const dropdown = document.getElementById('locationSwitcherDropdown');
  const switcherBtn = document.getElementById('locationSwitcherBtn');

  if (!dropdown || !switcherBtn) return;

  dropdown.classList.remove('active');
  switcherBtn.classList.remove('active');
  isDropdownOpen = false;
}

module.exports = {
  initLocationSwitcher,
  updateLocationSwitcher
};
