// ======================================
// TEAM WINTHER RUNNER
// Luna v0.3 – GPS, distance og omgange
// ======================================

const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const statusText = document.getElementById("statusText");

const lapsElement = document.getElementById("laps");
const distanceElement = document.getElementById("distance");
const moneyElement = document.getElementById("money");
const lastLapElement = document.getElementById("lastLap");
const averageLapElement = document.getElementById("averageLap");
const lastThreeElement = document.getElementById("lastThree");
const rewardOverlay = document.getElementById("rewardOverlay");
const rewardLap = document.getElementById("rewardLap");

const GPS_OPTIONS = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 15000
};

const MAX_GPS_ACCURACY = 35;
const MAX_GPS_JUMP = 50;
const MIN_GPS_MOVEMENT = 1;

const START_RADIUS = 8;
const LEAVE_START_DISTANCE = 20;
const MONEY_PER_LAP = 2;

let running = false;
let watchId = null;

let lastPosition = null;
let totalDistanceMeters = 0;

let startPoint = null;
let trackReady = false;

let lapCount = 0;
let lapArmed = false;
let lapStartTime = null;
let lapTimes = [];

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

function formatLapTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return (
    String(minutes).padStart(2, "0") +
    ":" +
    String(seconds).padStart(2, "0")
  );
}

function updateDistance() {
  distanceElement.textContent =
    formatDistance(totalDistanceMeters);
}

function updateLapStats() {
  lapsElement.textContent = lapCount;
  moneyElement.textContent =
    (lapCount * MONEY_PER_LAP) + " kr.";

  if (lapTimes.length === 0) {
    lastLapElement.textContent = "--:--";
    averageLapElement.textContent = "--:--";
  } else {
    const lastLap = lapTimes[lapTimes.length - 1];
    const average = Math.round(
      lapTimes.reduce((sum, value) => sum + value, 0) /
      lapTimes.length
    );

    lastLapElement.textContent =
      formatLapTime(lastLap);

    averageLapElement.textContent =
      formatLapTime(average);
  }

  const latestThree = lapTimes.slice(-3).reverse();

  lastThreeElement.innerHTML = "";

  for (let index = 0; index < 3; index++) {
    const item = document.createElement("li");

    item.textContent =
      latestThree[index] !== undefined
        ? formatLapTime(latestThree[index])
        : "--:--";

    lastThreeElement.appendChild(item);
  }
}

function resetSession() {
  lastPosition = null;
  totalDistanceMeters = 0;

  lapCount = 0;
  lapArmed = false;
  lapStartTime = null;
  lapTimes = [];

  updateDistance();
  updateLapStats();
}

async function loadSharedStartPoint() {
  try {
    const response=await fetch("../../startpoint.json?v="+Date.now(),{cache:"no-store"});
    if(!response.ok) throw new Error("Startpunkt mangler");
    const data=await response.json();
    const lat=Number(data.lat);
    const lng=Number(data.lng);
    if(!Number.isFinite(lat)||!Number.isFinite(lng)|| (lat===0&&lng===0)) throw new Error("Startpunkt ugyldigt");
    startPoint={lat,lng};
    trackReady=true;
    statusText.textContent="Startpunkt hentet ✅";
    statusText.dataset.state="ready";
  } catch(error) {
    console.error(error);
    trackReady=false;
    statusText.textContent="Admin mangler at dele start/mål";
    statusText.dataset.state="stopped";
  }
}

function startRunner() {
  if (running) return;

  if (!trackReady || !startPoint) {
    statusText.textContent =
      "Vent – Stege-banen indlæses";
    return;
  }

  if (!navigator.geolocation) {
    statusText.textContent =
      "GPS understøttes ikke på telefonen";
    return;
  }

  running = true;
  resetSession();

  startBtn.disabled = true;
  stopBtn.disabled = false;
  statusText.textContent = "Starter GPS…";
  statusText.dataset.state = "running";

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
  lapArmed = false;

  startBtn.disabled = false;
  stopBtn.disabled = true;
  statusText.textContent = "Stoppet";
  statusText.dataset.state = "stopped";
}

function handlePosition(position) {
  if (!running) return;

  const lat = position.coords.latitude;
  const lng = position.coords.longitude;
  const accuracy = position.coords.accuracy ?? 999;

  statusText.textContent =
    "GPS OK ±" + Math.round(accuracy) + " m";
  statusText.dataset.state = "running";

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

  updateLapEngine(lat, lng);
}

function updateLapEngine(lat, lng) {
  if (!startPoint || !running) return;

  const distanceToStart = distanceBetween(
    lat,
    lng,
    startPoint.lat,
    startPoint.lng
  );

  if (
    !lapArmed &&
    distanceToStart >= LEAVE_START_DISTANCE
  ) {
    lapArmed = true;

    if (lapStartTime === null) {
      lapStartTime = Date.now();
    }
  }

  if (
    lapArmed &&
    distanceToStart <= START_RADIUS
  ) {
    finishLap();
  }
}

function showRewardAnimation() {
  if (!rewardOverlay || !rewardLap) return;

  rewardLap.textContent =
    "Omgang " + lapCount;

  rewardOverlay.classList.remove("show");
  void rewardOverlay.offsetWidth;
  rewardOverlay.classList.add("show");

  window.setTimeout(() => {
    rewardOverlay.classList.remove("show");
  }, 1900);
}

function finishLap() {
  const now = Date.now();

  const lapSeconds =
    lapStartTime === null
      ? 0
      : Math.max(
          1,
          Math.floor((now - lapStartTime) / 1000)
        );

  lapCount += 1;
  lapTimes.push(lapSeconds);

  lapArmed = false;
  lapStartTime = now;

  updateLapStats();
  showRewardAnimation();

  if (navigator.vibrate) {
    navigator.vibrate([150, 80, 150]);
  }

  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();

    const message = new SpeechSynthesisUtterance(
      "Omgang " + lapCount + " gennemført"
    );

    message.lang = "da-DK";
    window.speechSynthesis.speak(message);
  }
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

statusText.dataset.state = "ready";
updateLapStats();
loadSharedStartPoint();

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

statusText.dataset.state = "ready";
updateLapStats();
loadStegeStartPoint();
