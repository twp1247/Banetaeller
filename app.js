// ======================================
// BANETÆLLER
// app.js
// Build002 – Gem start/mål
// ======================================

let map = null;
let running = false;

let startTime = null;
let timerInterval = null;

let startPoint = null;
let startMarker = null;

let recordingTrack = false;
let recordedPoints = [];
let trackLine = null;

// --------------------------------------
// Elementer fra index.html
// --------------------------------------

const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const saveStartBtn = document.getElementById("saveStartBtn");
const newTrackBtn = document.getElementById("newTrackBtn");

const gpsText = document.getElementById("gpsText");
const savedStartText = document.getElementById("savedStartText");

const timeElement = document.getElementById("time");
const lapsElement = document.getElementById("laps");
const distanceElement = document.getElementById("distance");
const lapTimeElement = document.getElementById("lapTime");
const moneyElement = document.getElementById("money");

// --------------------------------------
// Start kort
// --------------------------------------

function initMap() {
    map = L.map("map").setView(
        [54.9928, 12.2830],
        18
    );

    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            maxZoom: 22,
            attribution: "&copy; OpenStreetMap"
        }
    ).addTo(map);
}

// --------------------------------------
// Start træning
// --------------------------------------

function startTraining() {
    if (running) {
        return;
    }

    running = true;
    startTime = Date.now();

    if (typeof resetGPS === "function") {
        resetGPS();
    }

    if (typeof resetLapEngine === "function") {
        resetLapEngine();
    }

    gpsText.textContent = "Starter GPS...";

    startTimer();

    if (typeof announceStart === "function") {
        announceStart();
    }

    if (typeof startGPS === "function") {
        startGPS();
    }
}

// --------------------------------------
// Stop træning
// --------------------------------------

function stopTraining() {
    if (!running) {
        return;
    }

    running = false;

    stopTimer();

    if (typeof stopGPS === "function") {
        stopGPS();
    }

    gpsText.textContent = "Stoppet";

    if (typeof announceStop === "function") {
        announceStop();
    }
}

// --------------------------------------
// Timer
// --------------------------------------

function startTimer() {
    stopTimer();

    timerInterval = setInterval(() => {
        if (!running || startTime === null) {
            return;
        }

        const seconds = Math.floor(
            (Date.now() - startTime) / 1000
        );

        if (typeof formatTime === "function") {
            timeElement.textContent = formatTime(seconds);
        } else {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor(
                (seconds % 3600) / 60
            );
            const remainingSeconds = seconds % 60;

            timeElement.textContent =
                String(hours).padStart(2, "0") +
                ":" +
                String(minutes).padStart(2, "0") +
                ":" +
                String(remainingSeconds).padStart(2, "0");
        }
    }, 1000);
}

function stopTimer() {
    if (timerInterval !== null) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

// --------------------------------------
// Gem start/mål
// --------------------------------------

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

    try {
        localStorage.setItem(
            "banetaellerStartPoint",
            JSON.stringify(startPoint)
        );
    } catch (error) {
        console.error(
            "Kunne ikke gemme start/mål:",
            error
        );

        alert("Start/mål kunne ikke gemmes.");
        return;
    }

    showStartMarker();

    if (savedStartText) {
        savedStartText.textContent =
            "🏁 Start/mål er gemt";
    }

    if (typeof vibrate === "function") {
        vibrate(250);
    }

    alert("Start/mål er gemt.");
}

// --------------------------------------
// Vis start/mål på kortet
// --------------------------------------

function showStartMarker() {
    if (!map || !startPoint) {
        return;
    }

    const position = [
        startPoint.lat,
        startPoint.lng
    ];

    if (startMarker) {
        startMarker.setLatLng(position);
    } else {
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

    map.setView(position, 18);
}

function startNewTrack() {

    recordingTrack = true;
    recordedPoints = [];

    if (trackLine) {
        map.removeLayer(trackLine);
        trackLine = null;
    }

    gpsText.textContent = "🛣️ Optager ny bane...";
}


// --------------------------------------
// Hent gemt start/mål
// --------------------------------------

function loadSavedStartPoint() {
    let savedValue = null;

    try {
        savedValue =
            localStorage.getItem(
                "banetaellerStartPoint"
            ) ||
            localStorage.getItem("startPoint");
    } catch (error) {
        console.error(
            "Kunne ikke hente start/mål:",
            error
        );
        return;
    }

    if (!savedValue) {
        if (savedStartText) {
            savedStartText.textContent =
                "Intet startpunkt gemt";
        }

        return;
    }

    try {
        const parsed = JSON.parse(savedValue);

        if (
            Number.isFinite(Number(parsed.lat)) &&
            Number.isFinite(Number(parsed.lng))
        ) {
            startPoint = {
                lat: Number(parsed.lat),
                lng: Number(parsed.lng),
                savedAt: parsed.savedAt || null
            };

            if (savedStartText) {
                savedStartText.textContent =
                    "🏁 Start/mål er gemt";
            }

            showStartMarker();
        }
    } catch (error) {
        console.error(
            "Ugyldigt gemt startpunkt:",
            error
        );
    }
}

// --------------------------------------
// Knapper
// --------------------------------------

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

newTrackBtn.addEventListener(
    "click",
    startNewTrack
    );
}

// --------------------------------------
// Start appen
// --------------------------------------

initMap();

if (typeof loadGPX === "function") {
    loadGPX();
}

loadSavedStartPoint();

// --------------------------------------
// Service Worker
// --------------------------------------

if ("serviceWorker" in navigator) {
    window.addEventListener("load", async () => {
        try {
            const registration =
                await navigator.serviceWorker.register(
                    "./sw.js"
                );

            registration.update();
        } catch (error) {
            console.error(
                "Service Worker-fejl:",
                error
            );
        }
    });
}