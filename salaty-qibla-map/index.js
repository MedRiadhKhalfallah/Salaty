const L = require('leaflet');
const KAABA_COORDS = [21.422487, 39.826206];

class QiblaMap {
    constructor(mapElementId, options = {}) {
        this.L = L;
        this.mapElementId = mapElementId;
        this.map = null;
        this.userMarker = null;
        this.kaabaMarker = null;
        this.qiblaLine = null;
        this.currentUserLat = null;
        this.currentUserLng = null;

        // Options for callbacks and customization
        this.onAngleUpdate = options.onAngleUpdate || (() => {});
        this.onDragEnd = options.onDragEnd || (() => {});
        this.markerPopupText = options.markerPopupText || 'You are here. Drag to adjust.';
        this.kaabaPopupText = options.kaabaPopupText || 'Kaaba';
    }

    init(userLat, userLng) {
        if (!document.getElementById(this.mapElementId)) {
            console.error(`Map container #${this.mapElementId} not found.`);
            return;
        }

        this.currentUserLat = userLat;
        this.currentUserLng = userLng;

        // Destroy existing map if any
        if (this.map) {
            try {
                this.map.off();
                this.map.remove();
            } catch (e) { console.warn('Map cleanup warning', e); }
            this.map = null;
        }

        // Cleanup markers
        this.userMarker = null;
        this.kaabaMarker = null;
        this.qiblaLine = null;

        // Initialize map centered on user
        this.map = this.L.map(this.mapElementId, {
            zoomControl: false,
            attributionControl: false
        }).setView([userLat, userLng], 5);

        // Add Zoom Control bottom right
        this.L.control.zoom({
            position: 'bottomright'
        }).addTo(this.map);

        // Add Tile Layer
        this.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(this.map);

        // Force map invalidation to ensure tiles load correctly
        setTimeout(() => {
            if (this.map) this.map.invalidateSize();
        }, 200);

        this.updateMapContent(userLat, userLng, true);
    }

    updateMapContent(lat, lng, shouldFitBounds = true) {
        this.currentUserLat = lat;
        this.currentUserLng = lng;

        // Calculate Qibla Angle
        const qiblaAngle = this.getQiblaAngle(lat, lng);

        // Notify callback
        this.onAngleUpdate(qiblaAngle);

        // Icons
        const kaabaIcon = this.L.divIcon({
            className: 'kaaba-icon',
            html: '<div style="font-size: 30px; line-height: 30px; text-shadow: 0 0 5px white;">🕋</div>',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });

        // We rotate the inner container by the qibla angle.
        const arrowIcon = this.L.divIcon({
            className: 'qibla-arrow-icon',
            html: `
                <div id="arrow-container" style="
                    width: 40px; height: 40px; 
                    display: flex; align-items: center; justify-content: center;
                    transition: transform 0.5s ease-out;
                    transform: rotate(${qiblaAngle}deg);
                    cursor: grab;
                ">
                    <i class="fas fa-location-arrow" style="color: #2ecc71; font-size: 30px; text-shadow: 0 0 5px #000; transform: rotate(-45deg);"></i>
                </div>
            `,
            iconSize: [40, 40],
            iconAnchor: [20, 20]
        });

        // Remove old layers
        if (this.kaabaMarker) this.map.removeLayer(this.kaabaMarker);
        if (this.userMarker) this.map.removeLayer(this.userMarker);
        if (this.qiblaLine) this.map.removeLayer(this.qiblaLine);

        // Markers
        this.kaabaMarker = this.L.marker(KAABA_COORDS, { icon: kaabaIcon }).addTo(this.map)
                      .bindPopup(this.kaabaPopupText);

        this.userMarker = this.L.marker([lat, lng], {
            icon: arrowIcon,
            draggable: true,
            autoPan: true
        }).addTo(this.map);

        // Bind popup with instruction
        this.userMarker.bindPopup(this.markerPopupText);

        // Event Listener for Drag
        this.userMarker.on('dragend', (event) => {
            const position = event.target.getLatLng();
            this.onDragEnd(position.lat, position.lng);
            // Recalculate everything based on new position
            this.updateMapContent(position.lat, position.lng, false);
        });

        // DRAW GEODESIC CURVE (Great Circle)
        const curvePoints = this.getGreatCirclePoints({lat, lng}, {lat: KAABA_COORDS[0], lng: KAABA_COORDS[1]}, 100);

        this.qiblaLine = this.L.polyline(curvePoints, {
            color: '#2ecc71',
            weight: 3,
            opacity: 0.8,
            dashArray: '5, 10',
            lineCap: 'round'
        }).addTo(this.map);

        // Fit bounds to show the whole path
        if (shouldFitBounds && (!this.map.getBounds().contains(curvePoints[0]) || !this.map.getBounds().contains(curvePoints[curvePoints.length-1]))) {
           const bounds = this.L.latLngBounds(curvePoints);
           this.map.fitBounds(bounds, { padding: [50, 50] });
        }
    }

    invalidateSize() {
        if (this.map) {
            this.map.invalidateSize();
        }
    }

    flyTo(lat, lng, zoom = 15) {
        if (this.map) {
             this.map.flyTo([lat, lng], zoom, {
                animate: true,
                duration: 1.5
            });
        }
    }

    // === MATH HELPERS ===
    getQiblaAngle(lat, lng) {
        const kaabaLat = KAABA_COORDS[0];
        const kaabaLng = KAABA_COORDS[1];

        const y = Math.sin(this.toRad(kaabaLng - lng)) * Math.cos(this.toRad(kaabaLat));
        const x = Math.cos(this.toRad(lat)) * Math.sin(this.toRad(kaabaLat)) -
                  Math.sin(this.toRad(lat)) * Math.cos(this.toRad(kaabaLat)) * Math.cos(this.toRad(kaabaLng - lng));

        let brng = this.toDeg(Math.atan2(y, x));
        return (brng + 360) % 360; // Normalize to 0-360
    }

    getGreatCirclePoints(start, end, numPoints) {
        const lat1 = this.toRad(start.lat);
        const lon1 = this.toRad(start.lng);
        const lat2 = this.toRad(end.lat);
        const lon2 = this.toRad(end.lng);

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

            points.push([this.toDeg(lat), this.toDeg(lon)]);
        }

        return points;
    }

    toRad(deg) { return deg * (Math.PI / 180); }
    toDeg(rad) { return rad * (180 / Math.PI); }

    static async detectLocation(options = {}) {
        let lat = null;
        let lng = null;
        let source = '';
        let detectedCity = '';
        let detectedCountry = '';

        // 1. Manual Coordinates (Highest Priority)
        if (options.lat && options.lng) {
            console.log('Using provided coordinates...');
            lat = parseFloat(options.lat);
            lng = parseFloat(options.lng);
            return {
                lat,
                lng,
                source: 'manual',
                city: options.city || '',
                country: options.country || ''
            };
        }

        // 2. Settings Location (City/Country)
        if (options.city && options.country) {
            console.log('Attempting Settings Location (Photon)...');
            try {
                const query = `${options.city}, ${options.country}`;
                const response = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=1`);
                const data = await response.json();
                if (data && data.features && data.features.length > 0) {
                     const coords = data.features[0].geometry.coordinates;
                     // Photon GeoJSON is [lng, lat]
                     lat = coords[1];
                     lng = coords[0];
                     source = 'settings-photon';
                     return { lat, lng, source, city: options.city, country: options.country };
                }
            } catch (e) {
                 console.error('Settings location failed', e);
            }
        }

        // 3. IP Geolocation (ip-api.com)
        try {
            console.log('Attempting IP Geolocation (ip-api.com)...');
            const res = await fetch('http://ip-api.com/json/');
            const data = await res.json();
            if (data.status === 'success') {
                lat = data.lat;
                lng = data.lon;
                detectedCity = data.city;
                detectedCountry = data.country;
                source = 'ip-api';
                return { lat, lng, source, city: detectedCity, country: detectedCountry };
            }
        } catch (e) {
            console.warn('First IP location failed:', e.message);
        }

        // 4. Fallback IP Geolocation (ipapi.co)
        try {
            console.log('Attempting IP Geolocation Fallback (ipapi.co)...');
            const res = await fetch('https://ipapi.co/json/');
            if (res.ok) {
                const data = await res.json();
                if (data.latitude && data.longitude) {
                    lat = parseFloat(data.latitude);
                    lng = parseFloat(data.longitude);
                    detectedCity = data.city;
                    detectedCountry = data.country_name;
                    source = 'ipapi.co';
                    return { lat, lng, source, city: detectedCity, country: detectedCountry };
                }
            }
        } catch(e2) {
            console.warn('Second IP location failed:', e2.message);
        }


        throw new Error('Could not detect location');
    }
}

module.exports = QiblaMap;
