// ======================================
// Banetæller
// Build002
// utils.js
// ======================================

function distanceBetween(lat1, lng1, lat2, lng2) {
    const earthRadius = 6371000;

    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(
        Math.sqrt(a),
        Math.sqrt(1 - a)
    );

    return earthRadius * c;
}

function formatTime(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return (
        String(hours).padStart(2, "0") +
        ":" +
        String(minutes).padStart(2, "0") +
        ":" +
        String(seconds).padStart(2, "0")
    );
}

function formatDistance(meters) {
    return (meters / 1000)
        .toFixed(2)
        .replace(".", ",") + " km";
}

function saveJSON(key, value) {
    localStorage.setItem(
        key,
        JSON.stringify(value)
    );
}

function loadJSON(key) {
    const savedValue = localStorage.getItem(key);

    if (!savedValue) {
        return null;
    }

    try {
        return JSON.parse(savedValue);
    } catch (error) {
        console.error(
            "Kunne ikke læse gemte data:",
            error
        );

        return null;
    }
}