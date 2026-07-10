// ======================================
// BANETÆLLER
// Build005 – Gem og indlæs bane
// app.js
// ======================================

let map = null;
let userMarker = null;
let accuracyCircle = null;
let startMarker = null;

let running = false;
let startTime = null;
let timerInterval = null;

let startPoint = null;

let recordingTrack = false;
let recordedPoints = [];
let trackLine = null;

const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const saveStartBtn = document.getElementById("saveStartBtn");
const newTrackBtn = document.getElementById("newTrackBtn");

const gpsText = document.getElementById("gpsText");
const startPointText = document.getElementById("startPointText");
const timeElement = document.getElementById("time");
const distanceElement = document.getElementById("distance");

function initMap() {
  if (typeof L === "undefined") throw new Error("Leaflet blev ikke indlæst");

  map = L.map("map").setView([MAP_START.lat, MAP_START.lng], MAP_START.zoom);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 22,
    attribution: "&copy; OpenStreetMap"
  }).addTo(map);

  setTimeout(() => map.invalidateSize(), 200);
}

function updateGpsStatus(accuracy) {
  gpsText.textContent = recordingTrack
    ? "🛣️ Optager bane – GPS ±" + Math.round(accuracy) + " m"
    : "GPS OK ±" + Math.round(accuracy) + " m";
}

function showGpsError(error) {
  if (error && error.code === 1) gpsText.textContent = "GPS-tilladelse mangler";
  else if (error && error.code === 2) gpsText.textContent = "GPS-position kan ikke findes";
  else if (error && error.code === 3) gpsText.textContent = "GPS bruger for lang tid";
  else gpsText.textContent = "GPS-fejl";
}

function updateUserMarker(lat, lng, accuracy) {
  const position = [lat, lng];

  if (userMarker) userMarker.setLatLng(position);
  else userMarker = L.marker(position, { title: "Din position" }).addTo(map);

  if (accuracyCircle) {
    accuracyCircle.setLatLng(position);
    accuracyCircle.setRadius(accuracy);
  } else {
    accuracyCircle = L.circle(position, {
      radius: accuracy,
      weight: 1,
      fillOpacity: 0.08
    }).addTo(map);
  }

  map.setView(position, 18);

  if (recordingTrack && accuracy <= MAX_GPS_ACCURACY) {
    addRecordedTrackPoint(lat, lng);
  }
}

function updateDistanceDisplay(meters) {
  distanceElement.textContent = formatDistance(meters);
}

function startTraining() {
  if (running) return;

  running = true;
  startTime = Date.now();
  resetGPS();

  if (typeof resetLapEngine === "function") resetLapEngine();

  startTimer();
  gpsText.textContent = "Starter GPS...";
  startGPS();

  if (typeof announceStart === "function") announceStart();
}

function stopTraining() {
  if (!running && !recordingTrack) return;

  const wasRecordingTrack = recordingTrack;
  running = false;
  recordingTrack = false;

  stopTimer();
  stopGPS();

  if (wasRecordingTrack && recordedPoints.length >= 2) {
    const trackWasSaved = saveRecordedTrack();

    gpsText.textContent = trackWasSaved
      ? "Stoppet – bane gemt"
      : "Stoppet – banen blev ikke gemt";
  } else {
    gpsText.textContent = "Stoppet";
  }

  if (typeof announceStop === "function") announceStop();
}

function startTimer() {
  stopTimer();
  timerInterval = window.setInterval(() => {
    if (!running || startTime === null) return;
    const seconds = Math.floor((Date.now() - startTime) / 1000);
    timeElement.textContent = formatTime(seconds);
  }, 1000);
}

function stopTimer() {
  if (timerInterval !== null) {
    window.clearInterval(timerInterval);
    timerInterval = null;
  }
}

function saveStartPoint() {
  let lat = Number(window.currentLat);
  let lng = Number(window.currentLng);

  if ((!Number.isFinite(lat) || !Number.isFinite(lng)) && userMarker) {
    const markerPosition = userMarker.getLatLng();
    lat = Number(markerPosition.lat);
    lng = Number(markerPosition.lng);
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    alert("Tryk START og vent, til der står GPS OK.");
    return;
  }

  startPoint = { lat, lng, savedAt: Date.now() };
  localStorage.setItem("banetaeller_startpoint", JSON.stringify(startPoint));

  showStartMarker();
  startPointText.textContent = "🏁 Start/mål er gemt";

  if (typeof announceStartPointSaved === "function") announceStartPointSaved();
  alert("Start/mål er gemt.");
}

function showStartMarker() {
  if (!startPoint || !map) return;

  const position = [startPoint.lat, startPoint.lng];

  if (startMarker) startMarker.setLatLng(position);
  else {
    const startIcon = L.divIcon({
      className: "start-marker",
      html: "🏁",
      iconSize: [36, 36],
      iconAnchor: [18, 30]
    });

    startMarker = L.marker(position, {
      icon: startIcon,
      title: "Start/mål"
    }).addTo(map);

    startMarker.bindPopup("🏁 Start/mål");
  }
}

function loadSavedStartPoint() {
  try {
    const savedText = localStorage.getItem("banetaeller_startpoint");
    if (!savedText) {
      startPointText.textContent = "Intet start/mål gemt";
      return;
    }

    const saved = JSON.parse(savedText);
    const lat = Number(saved.lat);
    const lng = Number(saved.lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      startPointText.textContent = "Intet start/mål gemt";
      return;
    }

    startPoint = { lat, lng, savedAt: saved.savedAt || null };
    startPointText.textContent = "🏁 Start/mål er gemt";
    showStartMarker();
  } catch (error) {
    console.error("Kunne ikke hente start/mål:", error);
  }
}

function startNewTrack() {
  recordedPoints = [];
  recordingTrack = true;

  if (trackLine) {
    map.removeLayer(trackLine);
    trackLine = null;
  }

  if (!running) startTraining();
  gpsText.textContent = "🛣️ Optager ny bane...";
}

function addRecordedTrackPoint(lat, lng) {
  const newPoint = [lat, lng];

  if (recordedPoints.length > 0) {
    const previousPoint = recordedPoints[recordedPoints.length - 1];
    const moved = distanceBetween(previousPoint[0], previousPoint[1], lat, lng);
    if (moved < 1) return;
  }

  recordedPoints.push(newPoint);
  drawTrack(recordedPoints);
}

function drawTrack(points) {
  if (!map || !Array.isArray(points) || points.length < 2) return;

  if (!trackLine) {
    trackLine = L.polyline(points, {
      weight: 6,
      opacity: 0.85
    }).addTo(map);
  } else {
    trackLine.setLatLngs(points);
  }
}

function saveRecordedTrack() {
  try {
    const trackData = {
      savedAt: Date.now(),
      points: recordedPoints.map(point => [
        Number(point[0]),
        Number(point[1])
      ])
    };

    localStorage.setItem(
      "banetaeller_build005_track",
      JSON.stringify(trackData)
    );

    return true;
  } catch (error) {
    console.error("Kunne ikke gemme banen:", error);

    alert(
      "Banen kunne ikke gemmes.\n\nFejl: " +
      (error && error.message ? error.message : String(error))
    );

    return false;
  }
}

function loadSavedTrack() {
  try {
    const savedText = localStorage.getItem("banetaeller_build005_track");
    if (!savedText) return;

    const savedTrack = JSON.parse(savedText);
    if (!savedTrack || !Array.isArray(savedTrack.points)) return;

    recordedPoints = savedTrack.points
      .map(point => [Number(point[0]), Number(point[1])])
      .filter(point => Number.isFinite(point[0]) && Number.isFinite(point[1]));

    if (recordedPoints.length < 2) return;

    drawTrack(recordedPoints);

    const bounds = trackLine.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [25, 25] });
    }
  } catch (error) {
    console.error("Kunne ikke indlæse den gemte bane:", error);
  }
}

startBtn.addEventListener("click", startTraining);
stopBtn.addEventListener("click", stopTraining);
saveStartBtn.addEventListener("click", saveStartPoint);
newTrackBtn.addEventListener("click", startNewTrack);

initMap();
loadSavedStartPoint();
loadSavedTrack();
