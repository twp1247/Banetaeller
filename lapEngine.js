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

function finishLap() {
  lapCount++;

  const now = Date.now();
  const lapSeconds = lapStartTime === null
    ? 0
    : Math.floor((now - lapStartTime) / 1000);

  lapArmed = false;
  lapStartTime = now;

  updateLapDisplay(lapSeconds);

  if (typeof announceLap === "function") {
    announceLap(lapCount);
  }
}

function updateLapDisplay(lapSeconds = null) {
  const lapsElement = document.getElementById("laps");
  const lapTimeElement = document.getElementById("lapTime");
  const moneyElement = document.getElementById("money");

  if (lapsElement) {
    lapsElement.textContent = lapCount;
  }

  if (lapTimeElement) {
    lapTimeElement.textContent =
      lapSeconds === null
        ? "--:--"
        : formatLapTime(lapSeconds);
  }

  if (moneyElement) {
    moneyElement.textContent =
      (lapCount * MONEY_PER_LAP) + " kr.";
  }
}
