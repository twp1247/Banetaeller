// Banetæller Build003 – app.js

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
    if (typeof L === "undefined") {
        throw new Error("Leaflet blev ikke indlæst.");
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
    }, 150);
}

function updateGpsStatus(accuracy) {
    gpsText.textContent =
        "GPS OK ±" + Math.round(accuracy) + " m";
}

function showGpsError(error) {
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
}

function updateDistanceDisplay(meters) {
    distanceElement.textContent =
        formatDistance(meters);
}

function startTraining() {
    if (running) {
        return;
    }

    running = true;
    startTime = Date.now();

    resetGPS();
    startTimer();

    gpsText.textContent = "Starter GPS...";

    startGPS();
    announceStart();
}

function stopTraining() {
    if (!running && !recordingTrack) {
        return;
    }

    running = false;
    recordingTrack = false;

    stopTimer();
    stopGPS();

    gpsText.textContent = "Stoppet";
    announceStop();
}

function startTimer() {
    stopTimer();

    timerInterval = window.setInterval(() => {
        if (!running || startTime === null) {
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
        window.clearInterval(timerInterval);
        timerInterval = null;
    }
}

function saveStartPoint() {
    const lat = Number(window.currentLat);
    const lng = Number(window.currentLng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        alert("Tryk først START og vent, til GPS er klar.");
        return;
    }

    startPoint = {
        lat: lat,
        lng: lng,
        savedAt: Date.now()
    };

    saveJSON(
        STORAGE_KEYS.START_POINT,
        startPoint
    );

    showStartMarker();

    startPointText.textContent =
        "🏁 Start/mål er gemt";

    announceStartPointSaved();

    alert("Start/mål er gemt.");
}

function showStartMarker() {
    if (!startPoint || !map) {
        return;
    }

    const position = [
        startPoint.lat,
        startPoint.lng
    ];

    if (startMarker) {
        startMarker.setLatLng(position);
    } else {
        const icon = L.divIcon({
            className: "start-marker",
            html: "🏁",
            iconSize: [36, 36],
            iconAnchor: [18, 30]
        });

        startMarker = L.marker(
            position,
            {
                icon: icon,
                title: "Start/mål"
            }
        ).addTo(map);

        startMarker.bindPopup("🏁 Start/mål");
    }
}

function loadSavedStartPoint() {
    const saved = loadJSON(
        STORAGE_KEYS.START_POINT
    );

    if (!saved) {
        startPointText.textContent =
            "Intet start/mål gemt";
        return;
    }

    const lat = Number(saved.lat);
    const lng = Number(saved.lng);

    if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lng)
    ) {
        startPointText.textContent =
            "Intet start/mål gemt";
        return;
    }

    startPoint = {
        lat: lat,
        lng: lng,
        savedAt: saved.savedAt ?? null
    };

    startPointText.textContent =
        "🏁 Start/mål er gemt";

    showStartMarker();
}

function startNewTrack() {
    recordingTrack = true;
    recordedPoints = [];

    if (trackLine) {
        map.removeLayer(trackLine);
        trackLine = null;
    }

    gpsText.textContent =
        "🛣️ Optager ny bane...";
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

initMap();
loadSavedStartPoint();