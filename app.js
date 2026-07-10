// ======================================
// BANETÆLLER
// Build003 Stable
// app.js
// ======================================

// Kort og markører
let map = null;
let userMarker = null;
let accuracyCircle = null;
let startMarker = null;

// Træning
let running = false;
let startTime = null;
let timerInterval = null;

// Start/mål
let startPoint = null;

// Baneoptagelse
let recordingTrack = false;
let recordedPoints = [];
let trackLine = null;

// Knapper
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const saveStartBtn = document.getElementById("saveStartBtn");
const newTrackBtn = document.getElementById("newTrackBtn");

// Tekst og statistik
const gpsText = document.getElementById("gpsText");
const startPointText = document.getElementById("startPointText");
const timeElement = document.getElementById("time");
const distanceElement = document.getElementById("distance");


// ======================================
// KORT
// ======================================

function initMap() {
    if (typeof L === "undefined") {
        console.error("Leaflet blev ikke indlæst.");
        return;
    }

    const mapElement = document.getElementById("map");

    if (!mapElement) {
        console.error("Kort-elementet blev ikke fundet.");
        return;
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


// ======================================
// GPS-VISNING
// Disse funktioner kaldes fra gps.js
// ======================================

function updateGpsStatus(accuracy) {
    if (!gpsText) {
        return;
    }

    if (recordingTrack) {
        gpsText.textContent =
            "🛣️ Optager bane – GPS ±" +
            Math.round(accuracy) +
            " m";
    } else {
        gpsText.textContent =
            "GPS OK ±" +
            Math.round(accuracy) +
            " m";
    }
}

function showGpsError(error) {
    if (!gpsText) {
        return;
    }

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
    if (!map) {
        return;
    }

    const position = [lat, lng];

    // Blå GPS-markør
    if (userMarker) {
        userMarker.setLatLng(position);
    } else {
        userMarker = L.marker(position, {
            title: "Din position"
        }).addTo(map);
    }

    // Cirkel der viser GPS-nøjagtighed
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

    // Gem og tegn GPS-punkt under baneoptagelse
    if (
        recordingTrack &&
        accuracy <= MAX_GPS_ACCURACY
    ) {
        addRecordedTrackPoint(lat, lng);
    }
}

function updateDistanceDisplay(meters) {
    if (!distanceElement) {
        return;
    }

    distanceElement.textContent =
        formatDistance(meters);
}


// ======================================
// START TRÆNING
// ======================================

function startTraining() {
    if (running) {
        return;
    }

    running = true;
    startTime = Date.now();

    if (typeof resetGPS === "function") {
        resetGPS();
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


// ======================================
// STOP
// ======================================

function stopTraining() {
    if (!running && !recordingTrack) {
        return;
    }

    running = false;
    recordingTrack = false;

    stopTimer();

    if (typeof stopGPS === "function") {
        stopGPS();
    }

    if (gpsText) {
        gpsText.textContent = "Stoppet";
    }

    if (typeof announceStop === "function") {
        announceStop();
    }
}


// ======================================
// TIMER
// ======================================

function startTimer() {
    stopTimer();

    timerInterval = window.setInterval(() => {
        if (!running || startTime === null) {
            return;
        }

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


// ======================================
// GEM START/MÅL
// ======================================

function saveStartPoint() {
    try {
        let lat = Number(window.currentLat);
        let lng = Number(window.currentLng);

        // Ekstra sikkerhed: hent positionen fra kortmarkøren
        // hvis GPS-koordinaterne ikke findes i window endnu.
        if (
            (!Number.isFinite(lat) || !Number.isFinite(lng)) &&
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
            lat: lat,
            lng: lng,
            savedAt: Date.now()
        };

        // Gem direkte uden hjælp fra andre filer
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
    } catch (error) {
        console.error("Fejl ved Gem start/mål:", error);

        alert(
            "Start/mål kunne ikke gemmes: " +
            error.message
        );
    }
}


    const lat = Number(window.currentLat);
    const lng = Number(window.currentLng);

    if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lng)
    ) {
        alert(
            "Tryk START og vent, til GPS er klar."
        );

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
    if (!startPoint || !map) {
        return;
    }

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

    startMarker.bindPopup("?? Start/mål");
}

function loadSavedStartPoint() {
    let saved = null;

try {
    const savedText =
        localStorage.getItem("banetaeller_startpoint");

    if (savedText) {
        saved = JSON.parse(savedText);
    }
} catch (error) {
    console.error("Kunne ikke hente start/mål:", error);
}
    );

    if (!saved) {
        if (startPointText) {
            startPointText.textContent =
                "Intet start/mål gemt";
        }

        return;
    }

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
        lat: lat,
        lng: lng,
        savedAt: saved.savedAt || null
    };

    if (startPointText) {
        startPointText.textContent =
            "🏁 Start/mål er gemt";
    }

    showStartMarker();
}


// ======================================
// NY BANE
// ======================================

function startNewTrack() {
    recordedPoints = [];
    recordingTrack = true;

    if (trackLine && map) {
        map.removeLayer(trackLine);
        trackLine = null;
    }

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

    // Undgå næsten identiske GPS-punkter
    if (recordedPoints.length > 0) {
        const previousPoint =
            recordedPoints[
                recordedPoints.length - 1
            ];

        const distance = distanceBetween(
            previousPoint[0],
            previousPoint[1],
            lat,
            lng
        );

        if (distance < 1) {
            return;
        }
    }

    recordedPoints.push(newPoint);

    if (!trackLine) {
        trackLine = L.polyline(
            recordedPoints,
            {
                weight: 6,
                opacity: 0.85
            }
        ).addTo(map);
    } else {
        trackLine.setLatLngs(recordedPoints);
    }
}


// ======================================
// KNAPPER
// ======================================

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


// ======================================
// START APPEN
// ======================================

try {
    initMap();
    loadSavedStartPoint();
} catch (error) {
    console.error(
        "Appen kunne ikke starte:",
        error
    );

    if (gpsText) {
        gpsText.textContent =
            "App-fejl – genindlæs siden";
    }
}