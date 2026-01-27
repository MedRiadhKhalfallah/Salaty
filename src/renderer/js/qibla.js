const { ipcRenderer } = require('electron');
const { state } = require('./globalStore');
const { t } = require('./translations');
const { showToast } = require('./toast');
const QiblaMap = require('salaty-qibla-map');
const screenSizeManager = require('./screenSize'); // Add this import

let qiblaMapInstance = null;
let currentUserLat = null;
let currentUserLng = null;

async function initQiblaPage() {
    console.log('Initializing Qibla page with Map...');

    // SET INITIAL SCREEN SIZE
    const useBigScreen = screenSizeManager.isBigScreen();
    console.log('Initial screen size preference:', useBigScreen ? 'big' : 'small');
    
    if (useBigScreen) {
        document.body.setAttribute('data-screen-size', 'big');
        document.body.classList.add('big-screen');
        document.querySelector('.qibla-container')?.classList.add('big-screen');
    } else {
        document.body.setAttribute('data-screen-size', 'small');
        document.body.classList.add('small-screen');
        document.querySelector('.qibla-container')?.classList.add('small-screen');
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

    // Setup Screen Size Toggle Button (formerly fullscreen button)
    const screenSizeBtn = document.getElementById('qiblaFullscreenBtn');
    if (screenSizeBtn) {
        screenSizeBtn.addEventListener('click', toggleQiblaScreenSize);
    }

    // Setup Zoom Button
    const zoomBtn = document.getElementById('zoomLocationBtn');
    if (zoomBtn) {
        zoomBtn.addEventListener('click', zoomToUserLocation);
    }

    // Set UI text
    const title = document.getElementById('qiblaTitle');
    if (title) title.textContent = t('qiblaFinder') || 'Qibla Finder';

    const directionLabel = document.getElementById('qiblaDirectionLabel');
    if (directionLabel) directionLabel.textContent = t('fromNorth', 'from (N) North');

    const locationText = document.getElementById('locationText');
    if (locationText) {
        locationText.textContent = t('loading') || 'Loading...';
    }

    const instructionText = document.getElementById('instructionText');
    if (instructionText) {
        instructionText.textContent = t('dragToAdjustInfo') || 'Vous pouvez déplacer le marqueur pour corriger votre position.';
    }

    // Update UI for screen size button
    updateQiblaUI();

    let lat = null;
    let lng = null;

    try {
        if (locationText) locationText.textContent = t('loading') || 'Loading...';

        const city = state.settings?.city;
        const country = state.settings?.country;
        const latitude = state.settings?.latitude || state.settings?.lat;
        const longitude = state.settings?.longitude || state.settings?.lng;

        const result = await QiblaMap.detectLocation({ city, country, lat: latitude, lng: longitude });

        lat = result.lat;
        lng = result.lng;

        console.log(`Location detected via ${result.source}:`, lat, lng);

        if (locationText) {
            let label = `${result.city}, ${result.country}`;
            if (result.source !== 'settings-photon') {
                label += ' (Approx)';
            }
            locationText.textContent = label;
        }

    } catch (error) {
        console.warn('All location detection methods failed:', error);
    }

    // Final check and Map Init
    if (lat && lng) {
        initMap(lat, lng);
        if (locationText && locationText.textContent.includes('Approx')) {
             showToast(t('locationApprox', 'Location is approximate. Drag marker to adjust.'), 'info');
        }
    } else {
        console.error('No location found.');
        if (locationText) locationText.textContent = t('locationNotSet') || 'Location not found. Please check settings.';
    }
}

function getCurrentWindowSize() {
    const isBigScreen = document.body.getAttribute('data-screen-size') === 'big';
    return isBigScreen ? { width: 850, height: 600 } : { width: 320, height: 575 };
}

function updateQiblaUI() {
    const screenSizeBtn = document.getElementById('qiblaFullscreenBtn');
    
    if (screenSizeBtn) {
        const isBigScreen = document.body.getAttribute('data-screen-size') === 'big';
        console.log('updateQiblaUI: Current screen size is', isBigScreen ? 'BIG' : 'SMALL');
        
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

function initMap(userLat, userLng) {
    currentUserLat = userLat;
    currentUserLng = userLng;

    console.log('Initializing Map at:', userLat, userLng);

    qiblaMapInstance = new QiblaMap('qiblaMap', {
        onAngleUpdate: (angle) => {
            const degreeText = document.getElementById('qiblaDegree');
            if (degreeText) {
                degreeText.textContent = Math.round(angle) + '°';
            }
        },
        onDragEnd: (lat, lng) => {
             // Optional: update local state if needed
             currentUserLat = lat;
             currentUserLng = lng;
        },
        markerPopupText: t('dragToAdjust') || 'You are here. Drag to adjust.',
        kaabaPopupText: 'Kaaba'
    });

    qiblaMapInstance.init(userLat, userLng);
}

function zoomToUserLocation() {
    if (qiblaMapInstance && currentUserLat != null && currentUserLng != null) {
        qiblaMapInstance.flyTo(currentUserLat, currentUserLng, 15);
    } else {
        console.warn("Cannot zoom: Map or location not ready.");
    }
}

function toggleQiblaScreenSize() {
    const isCurrentlyBig = document.body.getAttribute('data-screen-size') === 'big';
    console.log('toggleQiblaScreenSize: Switching FROM', isCurrentlyBig ? 'BIG to SMALL' : 'SMALL to BIG');
    
    if (isCurrentlyBig) {
        // Switch FROM big TO small screen
        ipcRenderer.invoke('resize-window', 320, 575);
        document.body.setAttribute('data-screen-size', 'small');
        document.body.classList.remove('big-screen');
        document.body.classList.add('small-screen');
        document.querySelector('.qibla-container')?.classList.remove('big-screen');
        document.querySelector('.qibla-container')?.classList.add('small-screen');
    } else {
        // Switch FROM small TO big screen
        ipcRenderer.invoke('resize-window', 850, 600);
        document.body.setAttribute('data-screen-size', 'big');
        document.body.classList.remove('small-screen');
        document.body.classList.add('big-screen');
        document.querySelector('.qibla-container')?.classList.remove('small-screen');
        document.querySelector('.qibla-container')?.classList.add('big-screen');
    }

    // Update UI
    updateQiblaUI();
    
    // Invalidate map size so it fills new space
    if (qiblaMapInstance) {
        setTimeout(() => { qiblaMapInstance.invalidateSize(); }, 300);
    }
}

module.exports = { initQiblaPage };