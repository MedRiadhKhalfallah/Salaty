const { ipcRenderer } = require('electron');
const { state } = require('./globalStore');
const { t } = require('./translations');
const L = require('leaflet');

let map = null;
let userMarker = null;
let kaabaMarker = null;
let qiblaLine = null;
let currentUserLat = null;
let currentUserLng = null;
let isQiblaFullscreen = false;

const KAABA_COORDS = [21.422487, 39.826206];

async function initQiblaPage() {
    console.log('Initializing Qibla page with Map...');

    // Setup back button
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
             if (isQiblaFullscreen) {
                 toggleQiblaFullscreen();
             }
             ipcRenderer.invoke('resize-window', 320, 555);
             ipcRenderer.invoke('go-back');
        });
    }

    // Setup Fullscreen Button
    const fullscreenBtn = document.getElementById('qiblaFullscreenBtn');
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', toggleQiblaFullscreen);
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

    let lat = null;
    let lng = null;

    // 1. Browser Geolocation
    try {
        console.log('Attempting Browser Geolocation...');
        const position = await new Promise((resolve, reject) => {
            if (!navigator.geolocation) reject(new Error('Geolocation not supported'));
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            });
        });
        lat = position.coords.latitude;
        lng = position.coords.longitude;
        console.log('Browser Geolocation success:', lat, lng);
        if (locationText) locationText.textContent = 'Precise Location (GPS)';
    } catch (e) {
        console.warn('Browser geolocation failed:', e.message);
    }

    // 2. IP Geolocation (if step 1 failed)
    if ((!lat || !lng) && !usingSettingsFallback()) {
        try {
            console.log('Attempting IP Geolocation...');
            if (locationText) locationText.textContent = 'Detecting via IP...';
            // Using ipapi.co (HTTPS supported)
            const res = await fetch('https://ipapi.co/json/');
            const data = await res.json();
            if (data.latitude && data.longitude) {
                lat = Number.parseFloat(data.latitude);
                lng = Number.parseFloat(data.longitude);
                console.log('IP Geolocation success:', lat, lng);
                if (locationText) locationText.textContent = `${data.city}, ${data.country_name} (IP)`;
            }
        } catch (e) {
             console.warn('IP location failed:', e.message);
        }
    }

    // 3. Settings (if steps 1 & 2 failed)
    if (!lat || !lng) {
        console.log('Attempting Settings Fallback...');
        if (state.settings?.city && state.settings?.country) {
             try {
                const city = state.settings.city;
                const country = state.settings.country;
                if (locationText) locationText.textContent = `${city}, ${country}`;

                const response = await fetch(`https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}`);
                const data = await response.json();

                if (data.code === 200 && data.data) {
                    const meta = data.data.meta;
                    lat = Number.parseFloat(meta.latitude);
                    lng = Number.parseFloat(meta.longitude);
                    console.log('Settings fallback success:', lat, lng);
                }
             } catch (e) {
                console.error('Settings location failed', e);
             }
        }
    }

    // Final check and Map Init
    if (lat && lng) {
        initMap(lat, lng);
    } else {
        console.error('No location found.');
        if (locationText) locationText.textContent = t('locationNotSet') || 'Location not found. Please check settings.';
    }
}

function usingSettingsFallback() {
    // Helper to check if we should prefer settings over IP immediately if configured?
    // For now returning false to prefer IP detection if GPS fails, as it's more accurate than city center
    return false;
}

function initMap(userLat, userLng) {
    currentUserLat = userLat;
    currentUserLng = userLng;

    const mapContainer = document.getElementById('qiblaMap');
    if (!mapContainer) return;

    // Destroy existing map if any
    if (map) {
        try {
            map.off();
            map.remove();
        } catch(e) { console.warn('Map cleanup warning', e); }
        map = null;
    }

    // Cleanup markers
    userMarker = null;
    kaabaMarker = null;
    qiblaLine = null;

    console.log('Initializing Map at:', userLat, userLng);

    // Initialize map centered on user
    map = L.map('qiblaMap', {
        zoomControl: false, // Cleaner look
        attributionControl: false
    }).setView([userLat, userLng], 5);

    // Add Tile Layer (CartoDB Positron for clean look, or OSM)
    // Using OSM here for consistency
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Force map invalidation to ensure tiles load correctly
    setTimeout(() => {
        if(map) map.invalidateSize();
    }, 200);

    updateMapContent(userLat, userLng);
}

function updateMapContent(lat, lng) {
    // Calculate Qibla Angle locally (spherical geometry)
    const qiblaAngle = getQiblaAngle(lat, lng);

    // Update Text
    const degreeText = document.getElementById('qiblaDegree');
    if (degreeText) {
        degreeText.textContent = Math.round(qiblaAngle) + '°';
    }

    // Icons
    const kaabaIcon = L.divIcon({
        className: 'kaaba-icon',
        html: '<div style="font-size: 30px; line-height: 30px; text-shadow: 0 0 5px white;">🕋</div>',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
    });

    // We rotate the inner container by the qibla angle.
    // The arrow icon itself points UP (0 deg).
    const arrowIcon = L.divIcon({
        className: 'qibla-arrow-icon',
        html: `
            <div id="arrow-container" style="
                width: 40px; height: 40px; 
                display: flex; align-items: center; justify-content: center;
                transition: transform 1s ease-out;
                transform: rotate(${qiblaAngle}deg);
            ">
                <i class="fas fa-arrow-up" style="color: #2ecc71; font-size: 30px; text-shadow: 0 0 5px #000;"></i>
            </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
    });

    // Markers
    kaabaMarker = L.marker(KAABA_COORDS, { icon: kaabaIcon }).addTo(map)
                  .bindPopup('Kaaba');

    userMarker = L.marker([lat, lng], { icon: arrowIcon }).addTo(map)
                .bindPopup(t('ui', 'nav_location') || 'You are here');

    // DRAW GEODESIC CURVE (Great Circle)
    // 100 intermediate points for smoothness
    const curvePoints = getGreatCirclePoints({lat, lng}, {lat: KAABA_COORDS[0], lng: KAABA_COORDS[1]}, 100);

    qiblaLine = L.polyline(curvePoints, {
        color: '#2ecc71',
        weight: 3,
        opacity: 0.8,
        dashArray: '5, 10',
        lineCap: 'round'
    }).addTo(map);

    // Fit bounds to show the whole path
    const bounds = L.latLngBounds(curvePoints);
    map.fitBounds(bounds, { padding: [50, 50] });
}

// === MATH HELPERS ===

function getQiblaAngle(lat, lng) {
    const kaabaLat = KAABA_COORDS[0];
    const kaabaLng = KAABA_COORDS[1];

    const y = Math.sin(toRad(kaabaLng - lng)) * Math.cos(toRad(kaabaLat));
    const x = Math.cos(toRad(lat)) * Math.sin(toRad(kaabaLat)) -
              Math.sin(toRad(lat)) * Math.cos(toRad(kaabaLat)) * Math.cos(toRad(kaabaLng - lng));

    let brng = toDeg(Math.atan2(y, x));
    return (brng + 360) % 360; // Normalize to 0-360
}

/**
 * Calculates intermediate points for a Great Circle path
 */
function getGreatCirclePoints(start, end, numPoints) {
    const lat1 = toRad(start.lat);
    const lon1 = toRad(start.lng);
    const lat2 = toRad(end.lat);
    const lon2 = toRad(end.lng);

    // Total angular distance
    const d = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin((lat1 - lat2) / 2), 2) +
              Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin((lon1 - lon2) / 2), 2)));

    let points = [];

    for (let i = 0; i <= numPoints; i++) {
        const f = i / numPoints; // Fraction of the path
        const A = Math.sin((1 - f) * d) / Math.sin(d);
        const B = Math.sin(f * d) / Math.sin(d);

        // Convert to Cartesian (unit sphere) then back to spherical
        const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2);
        const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2);
        const z = A * Math.sin(lat1) + B * Math.sin(lat2);

        const lat = Math.atan2(z, Math.hypot(x, y));
        const lon = Math.atan2(y, x);

        points.push([toDeg(lat), toDeg(lon)]);
    }

    return points;
}

function toRad(deg) { return deg * (Math.PI / 180); }
function toDeg(rad) { return rad * (180 / Math.PI); }

function zoomToUserLocation() {
    if (map && currentUserLat != null && currentUserLng != null) {
        map.flyTo([currentUserLat, currentUserLng], 15, {
            animate: true,
            duration: 1.5
        });
    } else {
        console.warn("Cannot zoom: Map or location not ready.");
    }
}

function toggleQiblaFullscreen() {
    isQiblaFullscreen = !isQiblaFullscreen;
    const btn = document.getElementById('qiblaFullscreenBtn');
    const icon = btn ? btn.querySelector('i') : null;

    if (isQiblaFullscreen) {
        ipcRenderer.invoke('resize-window', 850, 600);
        document.body.classList.add('fullscreen');
        if (icon) icon.className = 'fas fa-compress';
        if (btn) btn.setAttribute('aria-label', t('exitFullscreen') || 'Exit Fullscreen');
    } else {
        ipcRenderer.invoke('resize-window', 320, 555);
        document.body.classList.remove('fullscreen');
        if (icon) icon.className = 'fas fa-expand';
        if (btn) btn.setAttribute('aria-label', t('enterFullscreen') || 'Enter Fullscreen');
    }

    // Invalidate map size so it fills new space
    if (map) {
        setTimeout(() => { map.invalidateSize(); }, 300);
    }
}

module.exports = { initQiblaPage };
