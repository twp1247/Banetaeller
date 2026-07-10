// ======================================
// BANETÆLLER
// Build004
// settings.js
// ======================================

// Kort
const MAP_START = {
    lat: 54.9928,
    lng: 12.2830,
    zoom: 18
};

// GPS
const GPS_OPTIONS = {
    enableHighAccuracy: true,
    maximumAge: 0,
    timeout: 15000
};

const MAX_GPS_ACCURACY = 35;
const MAX_GPS_JUMP = 50;

// Lyd
const SPEAK = true;
const VIBRATE = true;

// ======================================
// OMGANGSTÆLLER
// ======================================

// Afstand fra start/mål før en omgang tælles
const START_RADIUS = 8;

// Brugeren skal mindst denne afstand væk
// før en ny omgang kan registreres
const LEAVE_START_DISTANCE = 20;

// Maksimal afstand fra banen
// (bruges senere til baneovervågning)
const TRACK_TOLERANCE = 10;

// Sponsorbeløb pr. omgang
const MONEY_PER_LAP = 2;