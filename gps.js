// ======================================
// BANETÆLLER
// Build003 Stable
// gps.js
// ======================================

let gpsWatchId = null;
let lastGpsPoint = null;
let totalDistanceMeters = 0;


// ======================================
// START GPS
// ======================================

function startGPS() {
    if (!navigator.geolocation) {
        if (typeof showGpsError === "function") {
            showGpsError({
                message: "GPS understøttes ikke"
            });
        }

        return;
    }

    if (gpsWatchId !== null) {
        navigator.geolocation.clearWatch(
            gpsWatchId
        );
    }

    gpsWatchId =
        navigator.geolocation.watchPosition(
            onGPSPosition,
            onGPSError,
            GPS_OPTIONS
        );
}


// ======================================
// STOP GPS
// ======================================

function stopGPS() {
    if (gpsWatchId !== null) {
        navigator.geolocation.clearWatch(
            gpsWatchId
        );

        gpsWatchId = null;
    }
}


// ======================================
// NULSTIL GPS OG DISTANCE
// ======================================

function resetGPS() {
    lastGpsPoint = null;
    totalDistanceMeters = 0;

    if (
        typeof updateDistanceDisplay ===
        "function"
    ) {
        updateDistanceDisplay(
            totalDistanceMeters
        );
    }
}


// ======================================
// NY GPS-POSITION
// ======================================

function onGPSPosition(position) {
    const lat =
        position.coords.latitude;

    const lng =
        position.coords.longitude;

    const accuracy =
        position.coords.accuracy ?? 999;

    // Gør positionen tilgængelig for
    // knappen Gem start/mål
    window.currentLat = lat;
    window.currentLng = lng;
    window.currentAccuracy = accuracy;

    if (
        typeof updateGpsStatus ===
        "function"
    ) {
        updateGpsStatus(accuracy);
    }

    if (
        typeof updateUserMarker ===
        "function"
    ) {
        updateUserMarker(
            lat,
            lng,
            accuracy
        );
    }

    // Tæl kun distance ved rimelig GPS
    if (
        accuracy <= MAX_GPS_ACCURACY
    ) {
        if (lastGpsPoint !== null) {
            const moved =
                distanceBetween(
                    lastGpsPoint.lat,
                    lastGpsPoint.lng,
                    lat,
                    lng
                );

            // Ignorer meget små bevægelser
            // og store GPS-hop
            if (
                moved >= 1 &&
                moved <= MAX_GPS_JUMP
            ) {
                totalDistanceMeters += moved;

                if (
                    typeof updateDistanceDisplay ===
                    "function"
                ) {
                    updateDistanceDisplay(
                        totalDistanceMeters
                    );
                }
            }
        }

        lastGpsPoint = {
            lat: lat,
            lng: lng
        };
    }
}


// ======================================
// GPS-FEJL
// ======================================

function onGPSError(error) {
    console.error(
        "GPS-fejl:",
        error
    );

    if (
        typeof showGpsError ===
        "function"
    ) {
        showGpsError(error);
    }
}