// ======================================
// BANETÆLLER
// Build006 – Banebibliotek
// settings.js
// ======================================

const MAP_START = {
  lat: 54.9928,
  lng: 12.2830,
  zoom: 18
};

const GPS_OPTIONS = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 15000
};

const MAX_GPS_ACCURACY = 35;
const MAX_GPS_JUMP = 50;

const SPEAK = true;
const VIBRATE = true;

// Omgangstæller
const START_RADIUS = 8;
const LEAVE_START_DISTANCE = 20;
const MONEY_PER_LAP = 2;

// Banebibliotek
const TRACK_DATABASE_KEY = "banetaeller_tracks";
const TRACK_DATABASE_VERSION = 1;
const MAX_TRACKS = 50;

// ======================================

// Database med alle baner
const TRACK_DATABASE_KEY = "banetaeller_tracks";

// Maksimalt antal gemte baner
const MAX_TRACKS = 50;

// Versionsnummer på databasen
const TRACK_DATABASE_VERSION = 1;