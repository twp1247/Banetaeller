// ======================================
// BANETÆLLER
// Build006 Stable – Banebibliotek
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
let selectedTrackId = null;

const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const saveStartBtn = document.getElementById("saveStartBtn");
const newTrackBtn = document.getElementById("newTrackBtn");
const tracksBtn = document.getElementById("tracksBtn");

const gpsText = document.getElementById("gpsText");
const startPointText = document.getElementById("startPointText");
const timeElement = document.getElementById("time");
const distanceElement = document.getElementById("distance");

const trackLibraryModal = document.getElementById("trackLibraryModal");
const trackList = document.getElementById("trackList");
const closeLibraryBtn = document.getElementById("closeLibraryBtn");
const libraryNewTrackBtn = document.getElementById("libraryNewTrackBtn");

function updateTrackButton() {
  if (!tracksBtn) return;

  let count = 0;

  try {
    if (typeof getTrackCount === "function") {
      count = getTrackCount();
    }
  } catch (error) {
    console.error("Kunne ikke tælle baner:", error);
  }

  tracksBtn.textContent =
    "📚 BANEBIBLIOTEK (" + count + ")";
}

function initMap() {
  if (typeof L === "undefined") {
    throw new Error("Leaflet blev ikke indlæst.");
  }

  const mapElement = document.getElementById("map");

  if (!mapElement) {
    throw new Error("Kort-elementet blev ikke fundet.");
  }

  map = L.map("map").setView(
    [MAP_START.lat, MAP_START.lng],
    MAP_START.zoom
  );

  L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      maxZoom: 22,
      attribution: "&copy; OpenStreetMap"
    }
  ).addTo(map);

  setTimeout(() => {
    map.invalidateSize();
  }, 200);
}

function updateGpsStatus(accuracy) {
  if (!gpsText) return;

  gpsText.textContent = recordingTrack
    ? "🛣️ Optager bane – GPS ±" +
      Math.round(accuracy) +
      " m"
    : "GPS OK ±" +
      Math.round(accuracy) +
      " m";
}

function showGpsError(error) {
  if (!gpsText) return;

  if (error && error.code === 1) {
    gpsText.textContent = "GPS-tilladelse mangler";
  } else if (error && error.code === 2) {
    gpsText.textContent = "GPS-position kan ikke findes";
  } else if (error && error.code === 3) {
    gpsText.textContent = "GPS bruger for lang tid";
  } else {
    gpsText.textContent = "GPS-fejl";
  }
}

function updateUserMarker(lat, lng, accuracy) {
  if (!map) return;

  const position = [lat, lng];

  if (userMarker) {
    userMarker.setLatLng(position);
  } else {
    userMarker = L.marker(position, {
      title: "Din position"
    }).addTo(map);
  }

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

  if (
    recordingTrack &&
    accuracy <= MAX_GPS_ACCURACY
  ) {
    addRecordedTrackPoint(lat, lng);
  }
}

function updateDistanceDisplay(meters) {
  if (!distanceElement) return;

  distanceElement.textContent =
    formatDistance(meters);
}

function startTraining() {
  if (running) return;

  running = true;
  startTime = Date.now();

  if (typeof resetGPS === "function") {
    resetGPS();
  }

  if (typeof resetLapEngine === "function") {
    resetLapEngine();
  }

  startTimer();

  if (gpsText) {
    gpsText.textContent = "Starter GPS...";
  }

  if (typeof startGPS === "function") {
    startGPS();
  }

  if (typeof announceStart === "function") {
    announceStart();
  }
}

function stopTraining() {
  if (!running && !recordingTrack) return;

  const wasRecordingTrack = recordingTrack;

  running = false;
  recordingTrack = false;

  stopTimer();

  if (typeof stopGPS === "function") {
    stopGPS();
  }

  if (
    wasRecordingTrack &&
    recordedPoints.length >= 2
  ) {
    const saved = saveRecordedTrackToLibrary();

    if (gpsText) {
      gpsText.textContent = saved
        ? "Stoppet – bane gemt"
        : "Stoppet – bane ikke gemt";
    }
  } else if (gpsText) {
    gpsText.textContent = "Stoppet";
  }

  if (typeof announceStop === "function") {
    announceStop();
  }
}

function startTimer() {
  stopTimer();

  timerInterval = window.setInterval(() => {
    if (!running || startTime === null) return;

    const seconds = Math.floor(
      (Date.now() - startTime) / 1000
    );

    if (timeElement) {
      timeElement.textContent =
        formatTime(seconds);
    }
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

  if (
    (!Number.isFinite(lat) ||
      !Number.isFinite(lng)) &&
    userMarker
  ) {
    const markerPosition = userMarker.getLatLng();

    lat = Number(markerPosition.lat);
    lng = Number(markerPosition.lng);
  }

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng)
  ) {
    alert("Tryk START og vent, til der står GPS OK.");
    return;
  }

  startPoint = {
    lat,
    lng,
    savedAt: Date.now()
  };

  localStorage.setItem(
    "banetaeller_startpoint",
    JSON.stringify(startPoint)
  );

  showStartMarker();

  if (startPointText) {
    startPointText.textContent =
      "🏁 Start/mål er gemt";
  }

  if (
    typeof announceStartPointSaved ===
    "function"
  ) {
    announceStartPointSaved();
  }

  alert("Start/mål er gemt.");
}

function showStartMarker() {
  if (!startPoint || !map) return;

  const position = [
    startPoint.lat,
    startPoint.lng
  ];

  if (startMarker) {
    startMarker.setLatLng(position);
    return;
  }

  const startIcon = L.divIcon({
    className: "start-marker",
    html: "🏁",
    iconSize: [36, 36],
    iconAnchor: [18, 30]
  });

  startMarker = L.marker(
    position,
    {
      icon: startIcon,
      title: "Start/mål"
    }
  ).addTo(map);

  startMarker.bindPopup("🏁 Start/mål");
}

function loadSavedStartPoint() {
  try {
    const savedText =
      localStorage.getItem(
        "banetaeller_startpoint"
      );

    if (!savedText) {
      if (startPointText) {
        startPointText.textContent =
          "Intet start/mål gemt";
      }
      return;
    }

    const saved = JSON.parse(savedText);
    const lat = Number(saved.lat);
    const lng = Number(saved.lng);

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      if (startPointText) {
        startPointText.textContent =
          "Intet start/mål gemt";
      }
      return;
    }

    startPoint = {
      lat,
      lng,
      savedAt: saved.savedAt || null
    };

    if (startPointText) {
      startPointText.textContent =
        "🏁 Start/mål er gemt";
    }

    showStartMarker();
  } catch (error) {
    console.error(
      "Kunne ikke hente start/mål:",
      error
    );
  }
}

function startNewTrack() {
  selectedTrackId = null;
  recordedPoints = [];
  recordingTrack = true;

  clearTrackLine();

  if (!running) {
    startTraining();
  }

  if (gpsText) {
    gpsText.textContent =
      "🛣️ Optager ny bane...";
  }
}

function addRecordedTrackPoint(lat, lng) {
  const newPoint = [lat, lng];

  if (recordedPoints.length > 0) {
    const previousPoint =
      recordedPoints[
        recordedPoints.length - 1
      ];

    const moved = distanceBetween(
      previousPoint[0],
      previousPoint[1],
      lat,
      lng
    );

    if (moved < 1) return;
  }

  recordedPoints.push(newPoint);
  drawTrack(recordedPoints);
}

function drawTrack(points) {
  if (
    !map ||
    !Array.isArray(points) ||
    points.length < 2
  ) {
    return;
  }

  if (!trackLine) {
    trackLine = L.polyline(points, {
      weight: 6,
      opacity: 0.85
    }).addTo(map);
  } else {
    trackLine.setLatLngs(points);
  }
}

function clearTrackLine() {
  if (trackLine && map) {
    map.removeLayer(trackLine);
    trackLine = null;
  }
}

function sanitizeTrackPoints(points) {
  if (!Array.isArray(points)) return [];

  return points
    .map(point => [
      Number(point[0]),
      Number(point[1])
    ])
    .filter(point =>
      Number.isFinite(point[0]) &&
      Number.isFinite(point[1])
    );
}

function saveRecordedTrackToLibrary() {
  const points =
    sanitizeTrackPoints(recordedPoints);

  if (points.length < 2) {
    alert("Banen er for kort til at blive gemt.");
    return false;
  }

  const suggestedName =
    "Bane " +
    new Date().toLocaleDateString("da-DK");

  const enteredName = window.prompt(
    "Hvad skal banen hedde?",
    suggestedName
  );

  if (enteredName === null) {
    return false;
  }

  const name =
    enteredName.trim() || suggestedName;

  try {
    if (typeof addTrack !== "function") {
      throw new Error(
        "Banedatabasen er ikke indlæst."
      );
    }

    const savedTrack = addTrack({
      name,
      points,
      startPoint: startPoint
        ? {
            lat: Number(startPoint.lat),
            lng: Number(startPoint.lng),
            savedAt:
              startPoint.savedAt ||
              Date.now()
          }
        : null
    });

    selectedTrackId = savedTrack.id;
    recordedPoints = savedTrack.points;

    updateTrackButton();

    return true;
  } catch (error) {
    console.error(
      "Banen kunne ikke gemmes:",
      error
    );

    alert(
      "Banen kunne ikke gemmes.\n\n" +
      (error && error.message
        ? error.message
        : String(error))
    );

    return false;
  }
}

function openTrackLibrary() {
  if (
    !trackLibraryModal ||
    !trackList
  ) {
    alert(
      "Banebiblioteket mangler i index.html."
    );
    return;
  }

  renderTrackLibrary();

  trackLibraryModal.hidden = false;
  document.body.classList.add("modal-open");
}

function closeTrackLibrary() {
  if (!trackLibraryModal) return;

  trackLibraryModal.hidden = true;
  document.body.classList.remove("modal-open");

  setTimeout(() => {
    if (map) {
      map.invalidateSize();
    }
  }, 100);
}

function renderTrackLibrary() {
  updateTrackButton();

  const tracks =
    typeof getTrackDatabase === "function"
      ? getTrackDatabase()
      : [];

  trackList.innerHTML = "";

  if (tracks.length === 0) {
    const empty =
      document.createElement("div");

    empty.className = "track-empty";
    empty.textContent =
      "Du har ingen gemte baner endnu.";

    trackList.appendChild(empty);
    return;
  }

  const newestFirst =
    [...tracks].sort(
      (a, b) =>
        Number(b.createdAt || 0) -
        Number(a.createdAt || 0)
    );

  newestFirst.forEach(track => {
    const card =
      document.createElement("article");

    card.className = "track-card";

    const main =
      document.createElement("div");

    main.className = "track-main";

    const name =
      document.createElement("span");

    name.className = "track-name";
    name.textContent = "🏃 " + track.name;

    const meta =
      document.createElement("span");

    meta.className = "track-meta";

    const pointCount =
      Array.isArray(track.points)
        ? track.points.length
        : 0;

    const date = track.createdAt
      ? new Date(
          track.createdAt
        ).toLocaleDateString("da-DK")
      : "Ukendt dato";

    meta.textContent =
      pointCount +
      " GPS-punkter · " +
      date;

    main.append(name, meta);

    const actions =
      document.createElement("div");

    actions.className = "track-actions";

    const useButton =
      document.createElement("button");

    useButton.type = "button";
    useButton.className = "track-use";
    useButton.textContent = "Vælg";

    useButton.addEventListener(
      "click",
      () => selectTrack(track.id)
    );

    const deleteButton =
      document.createElement("button");

    deleteButton.type = "button";
    deleteButton.className = "track-delete";
    deleteButton.textContent = "Slet";

    deleteButton.addEventListener(
      "click",
      () =>
        deleteTrackFromLibrary(
          track.id,
          track.name
        )
    );

    actions.append(
      useButton,
      deleteButton
    );

    card.append(main, actions);
    trackList.appendChild(card);
  });
}

function selectTrack(id) {
  if (typeof getTrack !== "function") {
    alert("Banedatabasen er ikke indlæst.");
    return;
  }

  const track = getTrack(id);

  if (!track) {
    alert("Banen kunne ikke findes.");
    return;
  }

  const points =
    sanitizeTrackPoints(track.points);

  if (points.length < 2) {
    alert(
      "Banen indeholder ikke nok GPS-punkter."
    );
    return;
  }

  selectedTrackId = track.id;
  recordedPoints = points;
  recordingTrack = false;

  clearTrackLine();
  drawTrack(recordedPoints);

  if (track.startPoint) {
    const lat =
      Number(track.startPoint.lat);

    const lng =
      Number(track.startPoint.lng);

    if (
      Number.isFinite(lat) &&
      Number.isFinite(lng)
    ) {
      startPoint = {
        lat,
        lng,
        savedAt:
          track.startPoint.savedAt ||
          Date.now()
      };

      localStorage.setItem(
        "banetaeller_startpoint",
        JSON.stringify(startPoint)
      );

      showStartMarker();

      if (startPointText) {
        startPointText.textContent =
          "🏁 Start/mål er gemt";
      }
    }
  }

  const bounds =
    trackLine.getBounds();

  if (bounds.isValid()) {
    map.fitBounds(bounds, {
      padding: [25, 25]
    });
  }

  if (gpsText) {
    gpsText.textContent =
      "Valgt bane: " + track.name;
  }

  closeTrackLibrary();
}

function deleteTrackFromLibrary(
  id,
  name
) {
  const confirmed = window.confirm(
    'Vil du slette banen "' +
    name +
    '"?'
  );

  if (!confirmed) return;

  if (typeof deleteTrack === "function") {
    deleteTrack(id);
  }

  if (selectedTrackId === id) {
    selectedTrackId = null;
    recordedPoints = [];
    clearTrackLine();
  }

  renderTrackLibrary();
  updateTrackButton();
}

if (startBtn) {
  startBtn.addEventListener(
    "click",
    startTraining
  );
}

if (stopBtn) {
  stopBtn.addEventListener(
    "click",
    stopTraining
  );
}

if (saveStartBtn) {
  saveStartBtn.addEventListener(
    "click",
    saveStartPoint
  );
}

if (newTrackBtn) {
  newTrackBtn.addEventListener(
    "click",
    startNewTrack
  );
}

if (tracksBtn) {
  tracksBtn.addEventListener(
    "click",
    openTrackLibrary
  );
}

if (closeLibraryBtn) {
  closeLibraryBtn.addEventListener(
    "click",
    closeTrackLibrary
  );
}

if (libraryNewTrackBtn) {
  libraryNewTrackBtn.addEventListener(
    "click",
    () => {
      closeTrackLibrary();
      startNewTrack();
    }
  );
}

if (trackLibraryModal) {
  trackLibraryModal.addEventListener(
    "click",
    event => {
      if (
        event.target.hasAttribute(
          "data-close-library"
        )
      ) {
        closeTrackLibrary();
      }
    }
  );
}

initMap();
loadSavedStartPoint();
updateTrackButton();

// Build006 starter uden automatisk blå bane.
// Vælg en bane i Banebiblioteket.
