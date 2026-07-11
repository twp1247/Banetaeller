// ======================================
// TEAM WINTHER RUNNER
// Luna v0.2 – GPS og distance
// ======================================

const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const statusText = document.getElementById("statusText");
const distanceElement = document.getElementById("distance");

const GPS_OPTIONS = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 15000
};

const MAX_GPS_ACCURACY = 35;
const MAX_GPS_JUMP = 50;
const MIN_GPS_MOVEMENT = 1;

let running = false;
let watchId = null;
let lastPosition = null;
let totalDistanceMeters = 0;

function distanceBetween(lat1, lng1, lat2, lng2) {
  const earthRadius = 6371000;
  const toRadians = value => value * Math.PI / 180;

  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
    Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) ** 2;

  return 2 * earthRadius * Math.atan2(
    Math.sqrt(a),
    Math.sqrt(1 - a)
  );
}

function formatDistance(meters) {
  return (meters / 1000)
    .toFixed(2)
    .replace(".", ",") + " km";
}

function updateDistance() {
  distanceElement.textContent =
    formatDistance(totalDistanceMeters);
}

function startRunner() {
  if (running) return;

  if (!navigator.geolocation) {
    statusText.textContent =
      "GPS understøttes ikke på telefonen";
    return;
  }

  running = true;
  lastPosition = null;
  totalDistanceMeters = 0;
  updateDistance();

  startBtn.disabled = true;
  stopBtn.disabled = false;
  statusText.textContent = "Starter GPS…";

  watchId = navigator.geolocation.watchPosition(
    handlePosition,
    handleGpsError,
    GPS_OPTIONS
  );
}

function stopRunner() {
  if (!running) return;

  running = false;

  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }

  lastPosition = null;
  startBtn.disabled = false;
  stopBtn.disabled = true;
  statusText.textContent = "Stoppet";
}

function handlePosition(position) {
  if (!running) return;

  const lat = position.coords.latitude;
  const lng = position.coords.longitude;
  const accuracy = position.coords.accuracy ?? 999;

  statusText.textContent =
    "GPS OK ±" + Math.round(accuracy) + " m";

  if (accuracy > MAX_GPS_ACCURACY) {
    return;
  }

  if (lastPosition !== null) {
    const moved = distanceBetween(
      lastPosition.lat,
      lastPosition.lng,
      lat,
      lng
    );

    if (
      moved >= MIN_GPS_MOVEMENT &&
      moved <= MAX_GPS_JUMP
    ) {
      totalDistanceMeters += moved;
      updateDistance();
    }
  }

  lastPosition = { lat, lng };
}

function handleGpsError(error) {
  console.error("GPS-fejl:", error);

  if (error.code === 1) {
    statusText.textContent =
      "GPS-tilladelse mangler";
  } else if (error.code === 2) {
    statusText.textContent =
      "GPS-position kan ikke findes";
  } else if (error.code === 3) {
    statusText.textContent =
      "GPS bruger for lang tid";
  } else {
    statusText.textContent = "GPS-fejl";
  }
}

startBtn.addEventListener("click", startRunner);
stopBtn.addEventListener("click", stopRunner);

window.addEventListener("pagehide", () => {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
  }
});
