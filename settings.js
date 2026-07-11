// Banetæller – stabil Stege-version

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

const START_RADIUS = 8;
const LEAVE_START_DISTANCE = 20;
const MONEY_PER_LAP = 2;

const SPEAK = true;
const VIBRATE = true;
