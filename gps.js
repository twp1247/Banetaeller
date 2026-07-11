let gpsWatchId = null;
let lastGpsPoint = null;
let totalDistanceMeters = 0;

function startGPS() {
  if (!navigator.geolocation) {
    showGpsError({ message: "GPS understøttes ikke" });
    return;
  }

  if (gpsWatchId !== null) {
    navigator.geolocation.clearWatch(gpsWatchId);
  }

  gpsWatchId = navigator.geolocation.watchPosition(
    onGPSPosition,
    onGPSError,
    GPS_OPTIONS
  );
}

function stopGPS() {
  if (gpsWatchId !== null) {
    navigator.geolocation.clearWatch(gpsWatchId);
    gpsWatchId = null;
  }
}

function resetGPS() {
  lastGpsPoint = null;
  totalDistanceMeters = 0;
  updateDistanceDisplay(0);
}

function onGPSPosition(position) {
  const lat = position.coords.latitude;
  const lng = position.coords.longitude;
  const accuracy = position.coords.accuracy ?? 999;

  window.currentLat = lat;
  window.currentLng = lng;
  window.currentAccuracy = accuracy;

  updateGpsStatus(accuracy);
  updateUserMarker(lat, lng, accuracy);

  if (accuracy <= MAX_GPS_ACCURACY) {
    if (lastGpsPoint !== null) {
      const moved = distanceBetween(
        lastGpsPoint.lat,
        lastGpsPoint.lng,
        lat,
        lng
      );

      if (moved >= 1 && moved <= MAX_GPS_JUMP) {
        totalDistanceMeters += moved;
        updateDistanceDisplay(totalDistanceMeters);
      }
    }

    lastGpsPoint = { lat, lng };
  }

  updateLapEngine(lat, lng);
}

function onGPSError(error) {
  console.error("GPS-fejl:", error);
  showGpsError(error);
}
