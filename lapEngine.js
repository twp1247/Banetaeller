// ======================================
// BANETÆLLER
// Build004
// lapEngine.js
// ======================================

let lapCount = 0;
let lapArmed = false;
let lapStartTime = null;

function resetLapEngine() {
  lapCount = 0;
  lapArmed = false;
  lapStartTime = null;
  updateLapDisplay();
}

function updateLapEngine(lat, lng) {
  if (!startPoint) return;

  const distanceToStart = distanceBetween(
    lat,
    lng,
    startPoint.lat,
    startPoint.lng
  );

  if (!lapArmed && distanceToStart >= LEAVE_START_DISTANCE) {
    lapArmed = true;

    if (lapStartTime === null) {
      lapStartTime = Date.now();
    }
  }

  if (lapArmed && distanceToStart <= START_RADIUS) {
    finishLap();
  }
}

function finishLap() {
  lapCount++;

  const now = Date.now();
  let lapSeconds = 0;

  if (lapStartTime !== null) {
    lapSeconds = Math.floor((now - lapStartTime) / 1000);
  }

  lapArmed = false;
  lapStartTime = now;

  updateLapDisplay(lapSeconds);

  if (typeof speak === "function") {
    speak("Omgang " + lapCount + " gennemført");
  }

  if (typeof vibrate === "function") {
    vibrate([120, 80, 120]);
  }
}

function updateLapDisplay(lapSeconds = null) {
  const lapsElement = document.getElementById("laps");
  const lapTimeElement = document.getElementById("lapTime");
  const moneyElement = document.getElementById("money");

  if (lapsElement) {
    lapsElement.textContent = lapCount;
  }

  if (lapTimeElement && lapSeconds !== null) {
    lapTimeElement.textContent = formatLapTime(lapSeconds);
  }

  if (moneyElement) {
    moneyElement.textContent = (lapCount * MONEY_PER_LAP) + " kr.";
  }
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
