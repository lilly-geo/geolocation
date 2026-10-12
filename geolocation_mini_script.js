// initial extent and base maps
const map = L.map('map', { 
    center: [40.0007, -83.0095], // [latitude, longitude]
    zoom: 17 // 0 = whole world, ~18-19 = street level
});

const streets = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19, 
    attribution: 'Tiles &copy; Esri'
}).addTo(map);   // on by default

const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19, 
    attribution: 'Tiles &copy; Esri'
});

// Layers
function svgIcon(color) {
    return L.divIcon({
        className: 'poi-icon',
        html: `
            <svg width="25" height="32" viewBox="0 0 25 32" xmlns="http://www.w3.org/2000/svg">
                <path d="M12.5 0C5.6 0 0 5.6 0 12.5 0 21.5 12.5 32 12.5 32S25 21.5 25 12.5C25 5.6 19.4 0 12.5 0z"
                    fill="${color}" stroke="#1c2b24" stroke-width="1"/>
                <circle cx="12.5" cy="12.5" r="5" fill="#fff"/>
            </svg>`,
        iconSize:    [25, 32],  // match SVG's width/height
        iconAnchor:  [12, 32],  // the pinpoint — where the actual coordinate is at
        popupAnchor: [0, -28]   // where a popup opens relative to iconAnchor
    });
}

const CURRENT_COLOR = '#8336B3';
const PAST_COLOR    = '#e8c4ff';
 
const markersLayer  = L.layerGroup().addTo(map);   // one marker per position update
const pathLayer     = L.polyline([], { color: '#142bbe', weight: 3 }).addTo(map);
const accuracyLayer = L.layerGroup().addTo(map);   // accuracy circle for the latest fix

L.control.layers(
    { "Streets": streets, "Satellite": satellite },
    { "Markers": markersLayer, "Path": pathLayer, "Accuracy": accuracyLayer }
).addTo(map);

// Geolocation

const options = {
    enableHighAccuracy: true,
    maximumAge: 0,
    timeout: 45000
};

const statusDiv = document.getElementById('status');
let firstFix = true;
let latestMarker = null;
let count = 0;
let watchid = null;

if (navigator.geolocation) {
    const watchid = navigator.geolocation.watchPosition(successCallback, errorCallback, options);
} else {
    statusDiv.innerHTML = 'Your browser does not natively support geolocation.';
}

// Build the popup content: everything the msg variable in the examples includes
function buildMessage(position) {
    const c = position.coords;
    let msg = `<strong>My location</strong><br/>
        Longitude: ${c.longitude.toFixed(7)}&deg;<br/>
        Latitude: ${c.latitude.toFixed(7)}&deg;<br/>
        Accuracy: ${c.accuracy.toFixed(2)} meters<br/>
        Time: ${new Date(position.timestamp).toLocaleString()}<br/>`;
    // Below values aren't available on some systems,  API returns null when the device can't measure a value, will write N/A
    // != null keeps real zeros
    const has = v => v != null && !isNaN(v);
    msg += `Altitude: ${has(c.altitude) ? c.altitude.toFixed(2) + ' meters' : 'N/A'}<br/>`;
    msg += `Altitude Accuracy: ${has(c.altitudeAccuracy) ? c.altitudeAccuracy.toFixed(2) + ' meters' : 'N/A'}<br/>`;
    msg += `Heading: ${has(c.heading) ? c.heading.toFixed(1) + '&deg;' : 'N/A'}<br/>`;
    msg += `Speed: ${has(c.speed) ? c.speed.toFixed(2) + ' m/s' : 'N/A'}`;
    return msg;
}

function successCallback(position) {
    const latlng = [position.coords.latitude, position.coords.longitude];
    count++;
 
    // The previous "current" marker becomes a regular (faded purple) marker
    if (latestMarker) latestMarker.setIcon(svgIcon(PAST_COLOR));
 
    latestMarker = L.marker(latlng, { icon: svgIcon(CURRENT_COLOR) })
        .bindPopup(buildMessage(position))
        .addTo(markersLayer);
 
    // Path and accuracy circle
    pathLayer.addLatLng(latlng);
    accuracyLayer.clearLayers();
    L.circle(latlng, {
        radius: position.coords.accuracy,
        color: CURRENT_COLOR, weight: 1, fillOpacity: 0.1
    }).addTo(accuracyLayer);
 
    if (firstFix) {
        map.setView(latlng, 18);   // close-up zoom once geolocation starts
        firstFix = false;
    } else {
        map.panTo(latlng);         // keep following without changing the zoom
    }
 
    statusDiv.innerHTML = `Tracking: ${count} position${count > 1 ? 's' : ''} recorded`;
}

function errorCallback(error) {
    const msgs = { 
        [error.PERMISSION_DENIED]: 'Permission denied',
        [error.POSITION_UNAVAILABLE]: 'Position unavailable',
        [error.TIMEOUT]: 'Request timeout',
        [error.UNKNOWN_ERROR]: 'Unknown error'
    };
    statusDiv.innerHTML = `Error: ${msgs[error.code]}`;
}

// Stop watching
// navigator.geolocation.clearWatch(watchid);
