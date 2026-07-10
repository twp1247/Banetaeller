// ======================================
// Banetæller
// Build002
// settings.js
// ======================================

const APP_NAME = "Banetæller";

const MAP_START = {
    lat: 54.9928,
    lng: 12.2830,
    zoom: 18
};

const GPS_OPTIONS = {
    enableHighAccuracy: true,
    maximumAge: 0,
    timeout: 10000
};

const DISTANCE_UPDATE = 2;      // meter
const CHECKPOINT_RADIUS = 5;    // meter
const START_RADIUS = 5;         // meter

const SPEAK = true;
const VIBRATE = true;

const STORAGE = {
    START_POINT: "banetaeller_startpoint",
    SETTINGS: "banetaeller_settings"
};