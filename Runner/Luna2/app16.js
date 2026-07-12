// ======================================
// LUNA 2 – GPS DEBUG
// Build 015 – 4 checkpoints
// ======================================

const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const resetBtn = document.getElementById("resetBtn");
const useHereBtn = document.getElementById("useHereBtn");
const systemStatus = document.getElementById("systemStatus");

const gpsStatus = document.getElementById("gpsStatus");
const accuracyElement = document.getElementById("accuracy");
const latitudeElement = document.getElementById("latitude");
const longitudeElement = document.getElementById("longitude");
const lastMoveElement = document.getElementById("lastMove");
const speedElement = document.getElementById("speed");
const acceptedDistanceElement = document.getElementById("acceptedDistance");
const rawDistanceElement = document.getElementById("rawDistance");
const gpsUpdatesElement = document.getElementById("gpsUpdates");
const acceptedPointsElement = document.getElementById("acceptedPoints");
const rejectedPointsElement = document.getElementById("rejectedPoints");
const rejectReasonElement = document.getElementById("rejectReason");
const lastTimestampElement = document.getElementById("lastTimestamp");
const checkpointLogElement = document.getElementById("checkpointLog");
const nextCheckpointElement = document.getElementById("nextCheckpoint");

const checkpointCards = [
  document.getElementById("cp1Card"),
  document.getElementById("cp2Card"),
  document.getElementById("cp3Card"),
  document.getElementById("cp4Card")
];

const checkpointStateElements = [
  document.getElementById("cp1State"),
  document.getElementById("cp2State"),
  document.getElementById("cp3State"),
  document.getElementById("cp4State")
];

const checkpointDistanceElements = [
  document.getElementById("cp1Distance"),
  document.getElementById("cp2Distance"),
  document.getElementById("cp3Distance"),
  document.getElementById("cp4Distance")
];

const GPS_OPTIONS = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 20000
};

const MAX_ACCURACY = 35;
const MIN_MOVEMENT = 0.8;
const MAX_WALK_RUN_SPEED = 7.5;
const MAX_GAP_SECONDS = 120;

const START_ZONE_RADIUS = 15;
const CHECKPOINT_ZONE_RADIUS = 15;
const REQUIRED_ZONE_HITS = 2;
const LEAVE_ZONE_MARGIN = 8;

let running = false;
let watchId = null;

let startPoint = null;
let routePoints = [];
let checkpoints = [];

let previousRawPoint = null;
let previousAcceptedPoint = null;

let rawDistance = 0;
let acceptedDistance = 0;

let gpsUpdates = 0;
let acceptedPoints = 0;
let rejectedPoints = 0;

let expectedCheckpoint = 0;
let zoneHitCounts = [0, 0, 0, 0];
let checkpointHits = [false, false, false, false];
let checkpointLog = [];
  insideExpectedZone = false;
  hasEnteredExpectedZone = false;
let insideExpectedZone = false;
let hasEnteredExpectedZone = false;
let lastKnownPoint = null;

function toRadians(value) {
  return value * Math.PI / 180;
}

function distanceBetween(lat1, lng1, lat2, lng2) {
  const earthRadius = 6371000;
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

function formatMeters(value) {
  if (!Number.isFinite(value)) return "—";
  return value < 1000
    ? value.toFixed(1) + " m"
    : (value / 1000).toFixed(3).replace(".", ",") + " km";
}

function formatSpeed(value) {
  if (!Number.isFinite(value)) return "—";
  return value.toFixed(2) + " m/s";
}

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString("da-DK");
}

async function loadStartPoint() {
  const response = await fetch(
    "/Banetaeller/startpoint.json?build=15&t=" + Date.now(),
    { cache: "no-store" }
  );

  if (!response.ok) {
    throw new Error("startpoint.json kunne ikke hentes");
  }

  const data = await response.json();
  const lat = Number(data.lat);
  const lng = Number(data.lng);

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    (lat === 0 && lng === 0)
  ) {
    throw new Error("startpoint.json er ugyldig");
  }

  startPoint = { lat, lng };
}

async function loadRoute() {
  const response = await fetch(
    "banen.gpx?build=15&t=" + Date.now(),
    { cache: "no-store" }
  );

  if (!response.ok) {
    throw new Error("banen.gpx kunne ikke hentes");
  }

  const xmlText = await response.text();
  const xml = new DOMParser().parseFromString(
    xmlText,
    "application/xml"
  );

  if (xml.querySelector("parsererror")) {
    throw new Error("banen.gpx kunne ikke læses");
  }

  routePoints = Array.from(
    xml.getElementsByTagNameNS("*", "trkpt")
  ).map(point => ({
    lat: Number(point.getAttribute("lat")),
    lng: Number(point.getAttribute("lon"))
  })).filter(point =>
    Number.isFinite(point.lat) &&
    Number.isFinite(point.lng)
  );

  if (routePoints.length < 4) {
    throw new Error("Banen har for få GPX-punkter");
  }
}

function findNearestRouteIndex(point) {
  let bestIndex = 0;
  let bestDistance = Infinity;

  routePoints.forEach((routePoint, index) => {
    const distance = distanceBetween(
      point.lat,
      point.lng,
      routePoint.lat,
      routePoint.lng
    );

    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });

  return bestIndex;
}

function rotateRouteToStart(index) {
  return [
    ...routePoints.slice(index),
    ...routePoints.slice(0, index)
  ];
}

function calculateQuarterCheckpoints() {
  const nearestIndex = findNearestRouteIndex(startPoint);
  const rotated = rotateRouteToStart(nearestIndex);

  const cumulative = [0];

  for (let i = 1; i < rotated.length; i++) {
    cumulative.push(
      cumulative[i - 1] +
      distanceBetween(
        rotated[i - 1].lat,
        rotated[i - 1].lng,
        rotated[i].lat,
        rotated[i].lng
      )
    );
  }

  const closingDistance = distanceBetween(
    rotated[rotated.length - 1].lat,
    rotated[rotated.length - 1].lng,
    rotated[0].lat,
    rotated[0].lng
  );

  const totalLength =
    cumulative[cumulative.length - 1] +
    closingDistance;

  function pointAtFraction(fraction) {
    const target = totalLength * fraction;

    let bestIndex = 0;
    let bestDifference = Infinity;

    cumulative.forEach((value, index) => {
      const difference = Math.abs(value - target);

      if (difference < bestDifference) {
        bestDifference = difference;
        bestIndex = index;
      }
    });

    return {
      lat: rotated[bestIndex].lat,
      lng: rotated[bestIndex].lng
    };
  }

  checkpoints = [
    { ...startPoint, name: "Start/mål", radius: START_ZONE_RADIUS },
    { ...pointAtFraction(0.25), name: "Første sving", radius: CHECKPOINT_ZONE_RADIUS },
    { ...pointAtFraction(0.50), name: "Modsatte side", radius: CHECKPOINT_ZONE_RADIUS },
    { ...pointAtFraction(0.75), name: "Andet sving", radius: CHECKPOINT_ZONE_RADIUS }
  ];
}

async function initialize() {
  try {
    systemStatus.textContent =
      "Henter fælles start/mål og Stege-banen…";

    await loadStartPoint();
    await loadRoute();
    calculateQuarterCheckpoints();

    systemStatus.textContent =
      "Klar · start testen ved checkpoint 1";

    startBtn.disabled = false;
    renderCheckpointStates();
  } catch (error) {
    console.error(error);
    systemStatus.textContent =
      "FEJL: " + error.message;
  }
}

function resetDebugData() {
  previousRawPoint = null;
  previousAcceptedPoint = null;

  rawDistance = 0;
  acceptedDistance = 0;

  gpsUpdates = 0;
  acceptedPoints = 0;
  rejectedPoints = 0;

  expectedCheckpoint = 0;
  zoneHitCounts = [0, 0, 0, 0];
  checkpointHits = [false, false, false, false];
  checkpointLog = [];

  gpsStatus.textContent = running
    ? "Venter på GPS"
    : "Ikke startet";

  accuracyElement.textContent = "—";
  latitudeElement.textContent = "—";
  longitudeElement.textContent = "—";
  lastMoveElement.textContent = "—";
  speedElement.textContent = "—";
  acceptedDistanceElement.textContent = "0 m";
  rawDistanceElement.textContent = "0 m";
  gpsUpdatesElement.textContent = "0";
  acceptedPointsElement.textContent = "0";
  rejectedPointsElement.textContent = "0";
  rejectReasonElement.textContent = "Ingen";
  lastTimestampElement.textContent = "—";
  checkpointLogElement.textContent =
    "Ingen checkpoints registreret";

  renderCheckpointStates();
}

function startTest() {
  if (running || checkpoints.length !== 4) return;

  if (!navigator.geolocation) {
    gpsStatus.textContent =
      "GPS understøttes ikke";
    return;
  }

  running = true;
  resetDebugData();

  startBtn.disabled = true;
  stopBtn.disabled = false;
  gpsStatus.textContent = "Starter GPS…";

  watchId = navigator.geolocation.watchPosition(
    handlePosition,
    handleGpsError,
    GPS_OPTIONS
  );
}

function stopTest() {
  if (!running) return;

  running = false;

  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }

  startBtn.disabled = false;
  stopBtn.disabled = true;
  gpsStatus.textContent = "Stoppet";
}

function rejectPoint(reason) {
  rejectedPoints += 1;
  rejectedPointsElement.textContent =
    String(rejectedPoints);

  rejectReasonElement.textContent = reason;
}

function acceptPoint(point, moved, speed) {
  acceptedPoints += 1;
  acceptedPointsElement.textContent =
    String(acceptedPoints);

  if (Number.isFinite(moved)) {
    acceptedDistance += moved;
  }

  acceptedDistanceElement.textContent =
    formatMeters(acceptedDistance);

  previousAcceptedPoint = point;

  updateCheckpoints(point);
}

function handlePosition(position) {
  if (!running) return;

  const point = {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
    accuracy: position.coords.accuracy ?? 999,
    timestamp: position.timestamp || Date.now()
  };

  lastKnownPoint = point;

  gpsUpdates += 1;
  gpsUpdatesElement.textContent =
    String(gpsUpdates);

  gpsStatus.textContent = "GPS modtaget";
  accuracyElement.textContent =
    "±" + Math.round(point.accuracy) + " m";
  latitudeElement.textContent =
    point.lat.toFixed(7);
  longitudeElement.textContent =
    point.lng.toFixed(7);
  lastTimestampElement.textContent =
    formatTime(point.timestamp);

  let rawMoved = NaN;

  if (previousRawPoint) {
    rawMoved = distanceBetween(
      previousRawPoint.lat,
      previousRawPoint.lng,
      point.lat,
      point.lng
    );

    rawDistance += rawMoved;
    rawDistanceElement.textContent =
      formatMeters(rawDistance);
  }

  previousRawPoint = point;

  if (point.accuracy > MAX_ACCURACY) {
    lastMoveElement.textContent =
      formatMeters(rawMoved);

    speedElement.textContent = "—";
    rejectPoint(
      "Nøjagtighed ±" +
      Math.round(point.accuracy) +
      " m"
    );
    return;
  }

  if (!previousAcceptedPoint) {
    lastMoveElement.textContent = "Første punkt";
    speedElement.textContent = "—";
    rejectReasonElement.textContent = "Ingen";
    acceptPoint(point, 0, 0);
    return;
  }

  const moved = distanceBetween(
    previousAcceptedPoint.lat,
    previousAcceptedPoint.lng,
    point.lat,
    point.lng
  );

  const seconds = Math.max(
    0.001,
    (point.timestamp -
      previousAcceptedPoint.timestamp) /
      1000
  );

  const speed = moved / seconds;

  lastMoveElement.textContent =
    formatMeters(moved);
  speedElement.textContent =
    formatSpeed(speed);

  if (seconds > MAX_GAP_SECONDS) {
    rejectPoint(
      "For lang pause: " +
      seconds.toFixed(0) +
      " sek."
    );

    previousAcceptedPoint = point;
    return;
  }

  if (moved < MIN_MOVEMENT) {
    rejectPoint(
      "For lille bevægelse: " +
      moved.toFixed(1) +
      " m"
    );
    return;
  }

  if (speed > MAX_WALK_RUN_SPEED) {
    rejectPoint(
      "Urealistisk hastighed: " +
      speed.toFixed(1) +
      " m/s"
    );
    return;
  }

  rejectReasonElement.textContent = "Ingen";
  acceptPoint(point, moved, speed);
}

function updateCheckpoints(point) {
  checkpoints.forEach((checkpoint, index) => {
    const distance = distanceBetween(
      point.lat,
      point.lng,
      checkpoint.lat,
      checkpoint.lng
    );

    checkpointDistanceElements[index].textContent =
      formatMeters(distance);
  });

  const checkpoint = checkpoints[expectedCheckpoint];

  const distanceToExpected = distanceBetween(
    point.lat,
    point.lng,
    checkpoint.lat,
    checkpoint.lng
  );

  const inside =
    distanceToExpected <= checkpoint.radius;

  if (inside) {
    zoneHitCounts[expectedCheckpoint] += 1;

    if (
      zoneHitCounts[expectedCheckpoint] >=
      REQUIRED_ZONE_HITS
    ) {
      hasEnteredExpectedZone = true;
      insideExpectedZone = true;
      checkpointStateElements[expectedCheckpoint].textContent =
        "I zonen…";
    }
  } else {
    zoneHitCounts[expectedCheckpoint] = 0;

    if (
      hasEnteredExpectedZone &&
      insideExpectedZone &&
      distanceToExpected >=
        checkpoint.radius + LEAVE_ZONE_MARGIN
    ) {
      registerCheckpoint(expectedCheckpoint);
      hasEnteredExpectedZone = false;
      insideExpectedZone = false;
    }
  }

  renderCheckpointStates();
}

function registerCheckpoint(index) {
  checkpointHits[index] = true;

  checkpointLog.push(
    (index + 1) +
    " · " +
    checkpoints[index].name +
    " · " +
    formatTime(Date.now())
  );

  if (
    index === 0 &&
    checkpointHits[1] &&
    checkpointHits[2] &&
    checkpointHits[3]
  ) {
    checkpointLog.push(
      "OMGANG TEKNISK GODKENDT ✅"
    );

    checkpointHits = [true, false, false, false];
    expectedCheckpoint = 1;
  } else if (index === 0) {
    expectedCheckpoint = 1;
  } else if (index === 1) {
    expectedCheckpoint = 2;
  } else if (index === 2) {
    expectedCheckpoint = 3;
  } else if (index === 3) {
    expectedCheckpoint = 0;
  }

  checkpointLogElement.textContent =
    checkpointLog.join("  |  ");

  zoneHitCounts = [0, 0, 0, 0];
}

function renderCheckpointStates() {
  checkpointCards.forEach((card, index) => {
    card.classList.remove("next", "hit");

    if (checkpointHits[index]) {
      card.classList.add("hit");
      checkpointStateElements[index].textContent =
        "Ramt ✅";
    } else if (index === expectedCheckpoint) {
      card.classList.add("next");
      checkpointStateElements[index].textContent =
        "Næste";
    } else {
      checkpointStateElements[index].textContent =
        "Venter";
    }
  });

  if (checkpoints[expectedCheckpoint]) {
    nextCheckpointElement.textContent =
      "Næste: " +
      (expectedCheckpoint + 1) +
      " · " +
      checkpoints[expectedCheckpoint].name;
  } else {
    nextCheckpointElement.textContent =
      "Næste: —";
  }
}

function handleGpsError(error) {
  console.error(error);

  if (error.code === 1) {
    gpsStatus.textContent =
      "GPS-tilladelse mangler";
  } else if (error.code === 2) {
    gpsStatus.textContent =
      "GPS-position kan ikke findes";
  } else if (error.code === 3) {
    gpsStatus.textContent =
      "GPS timeout";
  } else {
    gpsStatus.textContent =
      "GPS-fejl";
  }
}

function useCurrentPositionAsTestStart() {
  if (!lastKnownPoint) {
    systemStatus.textContent =
      "Tryk START TEST og vent på første GPS-punkt";
    return;
  }

  startPoint = {
    lat: lastKnownPoint.lat,
    lng: lastKnownPoint.lng
  };

  calculateQuarterCheckpoints();
  resetDebugData();

  systemStatus.textContent =
    "Test-start sat til din position ✅";
}

startBtn.addEventListener("click", startTest);
stopBtn.addEventListener("click", stopTest);
resetBtn.addEventListener("click", resetDebugData);
useHereBtn.addEventListener("click", useCurrentPositionAsTestStart);

window.addEventListener("pagehide", () => {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
  }
});

initialize();
