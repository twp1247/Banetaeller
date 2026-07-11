let map = null;
let userMarker = null;
let accuracyCircle = null;
let startMarker = null;
let stegeTrackLine = null;

let running = false;
let startTime = null;
let timerInterval = null;

let startPoint = null;
let stegeTrackPoints = [];

const startBtn =
  document.getElementById("startBtn");
const stopBtn =
  document.getElementById("stopBtn");
const saveStartBtn =
  document.getElementById("saveStartBtn");

const gpsText =
  document.getElementById("gpsText");
const startPointText =
  document.getElementById("startPointText");
const timeElement =
  document.getElementById("time");
const distanceElement =
  document.getElementById("distance");

function initMap() {
  if (typeof L === "undefined") {
    throw new Error(
      "Leaflet blev ikke indlæst."
    );
  }

  map = L.map("map").setView(
    [MAP_START.lat, MAP_START.lng],
    MAP_START.zoom
  );

  L.tileLayer(
    "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      maxZoom: 22,
      attribution: "&copy; OpenStreetMap"
    }
  ).addTo(map);

  setTimeout(() => {
    map.invalidateSize();
  }, 250);
}

async function showStegeTrack() {
  try {
    stegeTrackPoints =
      await loadStegeTrack();

    stegeTrackLine = L.polyline(
      stegeTrackPoints,
      {
        weight: 6,
        opacity: 0.9
      }
    ).addTo(map);

    const bounds =
      stegeTrackLine.getBounds();

    if (bounds.isValid()) {
      map.fitBounds(bounds, {
        padding: [25, 25]
      });
    }

    const firstPoint =
      stegeTrackPoints[0];

    if (!loadSavedStartPoint()) {
      startPoint = {
        lat: firstPoint[0],
        lng: firstPoint[1],
        savedAt: Date.now()
      };

      localStorage.setItem(
        "banetaeller_startpoint",
        JSON.stringify(startPoint)
      );

      showStartMarker();
    }

    startPointText.textContent =
      "🏁 Stege-banen er klar";
  } catch (error) {
    console.error(error);

    startPointText.textContent =
      "Stege-banen kunne ikke indlæses";

    alert(error.message);
  }
}

function updateGpsStatus(accuracy) {
  gpsText.textContent =
    "GPS OK ±" +
    Math.round(accuracy) +
    " m";
}

function showGpsError(error) {
  if (error && error.code === 1) {
    gpsText.textContent =
      "GPS-tilladelse mangler";
  } else if (error && error.code === 2) {
    gpsText.textContent =
      "GPS-position kan ikke findes";
  } else if (error && error.code === 3) {
    gpsText.textContent =
      "GPS bruger for lang tid";
  } else {
    gpsText.textContent = "GPS-fejl";
  }
}

function updateUserMarker(
  lat,
  lng,
  accuracy
) {
  if (!map) return;

  const position = [lat, lng];

  if (userMarker) {
    userMarker.setLatLng(position);
  } else {
    userMarker = L.marker(
      position,
      { title: "Din position" }
    ).addTo(map);
  }

  if (accuracyCircle) {
    accuracyCircle.setLatLng(position);
    accuracyCircle.setRadius(accuracy);
  } else {
    accuracyCircle = L.circle(
      position,
      {
        radius: accuracy,
        weight: 1,
        fillOpacity: 0.08
      }
    ).addTo(map);
  }

  map.panTo(position);
}

function updateDistanceDisplay(meters) {
  distanceElement.textContent =
    formatDistance(meters);
}

function startTraining() {
  if (running) return;

  running = true;
  startTime = Date.now();

  resetGPS();
  resetLapEngine();
  startTimer();

  gpsText.textContent =
    "Starter GPS…";

  startGPS();

  if (
    typeof announceStart ===
    "function"
  ) {
    announceStart();
  }
}

function stopTraining() {
  if (!running) return;

  running = false;

  stopTimer();
  stopGPS();

  gpsText.textContent = "Stoppet";

  if (
    typeof announceStop ===
    "function"
  ) {
    announceStop();
  }
}

function startTimer() {
  stopTimer();

  timerInterval =
    window.setInterval(() => {
      if (
        !running ||
        startTime === null
      ) {
        return;
      }

      const seconds = Math.floor(
        (Date.now() - startTime) / 1000
      );

      timeElement.textContent =
        formatTime(seconds);
    }, 1000);
}

function stopTimer() {
  if (timerInterval !== null) {
    window.clearInterval(
      timerInterval
    );

    timerInterval = null;
  }
}

function saveStartPoint() {
  const lat =
    Number(window.currentLat);

  const lng =
    Number(window.currentLng);

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng)
  ) {
    alert(
      "Tryk START og vent, til der står GPS OK."
    );
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

  startPointText.textContent =
    "🏁 Start/mål er gemt";

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
}

function loadSavedStartPoint() {
  try {
    const savedText =
      localStorage.getItem(
        "banetaeller_startpoint"
      );

    if (!savedText) {
      return false;
    }

    const saved =
      JSON.parse(savedText);

    const lat = Number(saved.lat);
    const lng = Number(saved.lng);

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      return false;
    }

    startPoint = {
      lat,
      lng,
      savedAt:
        saved.savedAt || null
    };

    showStartMarker();

    return true;
  } catch (error) {
    console.error(
      "Kunne ikke hente start/mål:",
      error
    );

    return false;
  }
}

startBtn.addEventListener(
  "click",
  startTraining
);

stopBtn.addEventListener(
  "click",
  stopTraining
);

saveStartBtn.addEventListener(
  "click",
  saveStartPoint
);

try {
  initMap();
  showStegeTrack();
} catch (error) {
  console.error(
    "Appen kunne ikke starte:",
    error
  );

  gpsText.textContent =
    "App-fejl – genindlæs siden";
}
