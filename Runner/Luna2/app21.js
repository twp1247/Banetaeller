const STORAGE_KEY = "luna2_calibration_build021";
const SAMPLE_TARGET = 50;
const MAX_ACCURACY = 35;
const POINTS = [
  { key: "startFinish", label: "START/MÅL" },
  { key: "firstTurn", label: "FØRSTE SVING" },
  { key: "oppositeStraight", label: "MODSATTE LANGSIDE" },
  { key: "secondTurn", label: "ANDET SVING" }
];

const el = id => document.getElementById(id);
const statusEl = el("status");
const pointNameEl = el("pointName");
const countEl = el("count");
const barFillEl = el("barFill");
const measureBtn = el("measure");
const cancelBtn = el("cancel");
const resetBtn = el("reset");
const downloadBtn = el("download");
const savedEl = el("saved");
const gpsEl = el("gps");
const accuracyEl = el("accuracy");
const acceptedEl = el("accepted");
const rejectedEl = el("rejected");
const avgAccuracyEl = el("avgAccuracy");
const coordinateEl = el("coordinate");
const messageEl = el("message");

let checkpoints = [null, null, null, null];
let activeIndex = 0;
let watchId = null;
let measuring = false;
let samples = [];
let rejected = 0;

function loadSaved() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(stored) && stored.length === 4) checkpoints = stored;
  } catch (error) {
    console.warn("Kunne ikke læse gemte punkter", error);
  }
  const firstMissing = checkpoints.findIndex(point => !point);
  activeIndex = firstMissing === -1 ? 3 : firstMissing;
  render();
}

function saveLocal() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(checkpoints));
}

function allSaved() {
  return checkpoints.every(Boolean);
}

function render() {
  pointNameEl.textContent = `${activeIndex + 1} · ${POINTS[activeIndex].label}`;
  savedEl.innerHTML = "";

  checkpoints.forEach((point, index) => {
    const row = document.createElement("div");
    row.className = `point-row${point ? " done" : ""}`;
    const title = document.createElement("span");
    title.textContent = `${index + 1} · ${POINTS[index].label}${point ? " ✅" : ""}`;
    const value = document.createElement("strong");
    value.textContent = point
      ? `${point.lat.toFixed(7)}, ${point.lng.toFixed(7)} · gennemsnit ±${point.averageAccuracy.toFixed(1)} m · 50 målinger`
      : "Ikke kalibreret";
    row.append(title, value);
    savedEl.appendChild(row);
  });

  downloadBtn.disabled = !allSaved() || measuring;
  measureBtn.disabled = measuring || allSaved();
  cancelBtn.disabled = !measuring;

  if (allSaved()) {
    statusEl.textContent = "Alle 4 punkter er kalibreret ✅";
    pointNameEl.textContent = "KALIBRERING FÆRDIG";
    messageEl.textContent = "Tryk HENT checkpoints.json og send filen i chatten.";
  } else if (!measuring) {
    statusEl.textContent = "Klar til GPS-kalibrering";
    messageEl.textContent = `Gå til ${POINTS[activeIndex].label} og stå helt stille.`;
  }
}

function resetMeasurementDisplay() {
  samples = [];
  rejected = 0;
  countEl.textContent = "0";
  barFillEl.style.width = "0%";
  acceptedEl.textContent = "0";
  rejectedEl.textContent = "0";
  avgAccuracyEl.textContent = "—";
  coordinateEl.textContent = "—";
}

function startMeasurement() {
  if (measuring || allSaved()) return;
  if (!navigator.geolocation) {
    messageEl.textContent = "Denne telefon understøtter ikke GPS i browseren.";
    return;
  }

  resetMeasurementDisplay();
  measuring = true;
  statusEl.textContent = `Måler ${POINTS[activeIndex].label}…`;
  gpsEl.textContent = "Starter GPS…";
  messageEl.textContent = "Stå helt stille, til tælleren når 50.";
  render();

  watchId = navigator.geolocation.watchPosition(
    handlePosition,
    handleError,
    { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
  );
}

function stopWatch() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
  measuring = false;
}

function cancelMeasurement() {
  if (!measuring) return;
  stopWatch();
  gpsEl.textContent = "Afbrudt";
  statusEl.textContent = "Målingen blev afbrudt";
  messageEl.textContent = `Tryk START igen ved ${POINTS[activeIndex].label}.`;
  render();
}

function handlePosition(position) {
  if (!measuring) return;
  const accuracy = position.coords.accuracy ?? 999;
  const lat = position.coords.latitude;
  const lng = position.coords.longitude;

  gpsEl.textContent = "GPS aktiv";
  accuracyEl.textContent = `±${Math.round(accuracy)} m`;
  coordinateEl.textContent = `${lat.toFixed(7)}, ${lng.toFixed(7)}`;

  if (accuracy > MAX_ACCURACY) {
    rejected += 1;
    rejectedEl.textContent = String(rejected);
    messageEl.textContent = `Afvist måling: GPS ±${Math.round(accuracy)} m. Vent og stå stille.`;
    return;
  }

  samples.push({ lat, lng, accuracy, timestamp: position.timestamp || Date.now() });
  const count = samples.length;
  countEl.textContent = String(count);
  acceptedEl.textContent = String(count);
  barFillEl.style.width = `${(count / SAMPLE_TARGET) * 100}%`;
  const avgAcc = samples.reduce((sum, sample) => sum + sample.accuracy, 0) / count;
  avgAccuracyEl.textContent = `±${avgAcc.toFixed(1)} m`;
  messageEl.textContent = `Måler ${POINTS[activeIndex].label}: ${count} af ${SAMPLE_TARGET}`;

  if (count >= SAMPLE_TARGET) finishMeasurement();
}

function finishMeasurement() {
  stopWatch();
  const count = samples.length;
  const lat = samples.reduce((sum, sample) => sum + sample.lat, 0) / count;
  const lng = samples.reduce((sum, sample) => sum + sample.lng, 0) / count;
  const averageAccuracy = samples.reduce((sum, sample) => sum + sample.accuracy, 0) / count;
  const bestAccuracy = Math.min(...samples.map(sample => sample.accuracy));
  const worstAccuracy = Math.max(...samples.map(sample => sample.accuracy));

  checkpoints[activeIndex] = {
    lat,
    lng,
    accuracy: averageAccuracy,
    averageAccuracy,
    bestAccuracy,
    worstAccuracy,
    sampleCount: count,
    savedAt: Date.now()
  };
  saveLocal();
  gpsEl.textContent = "Punkt gemt ✅";
  statusEl.textContent = `${POINTS[activeIndex].label} er gemt ✅`;

  const nextMissing = checkpoints.findIndex(point => !point);
  if (nextMissing !== -1) {
    activeIndex = nextMissing;
    messageEl.textContent = `Gå nu til ${POINTS[activeIndex].label}.`;
  }
  render();
}

function handleError(error) {
  stopWatch();
  gpsEl.textContent = "GPS-fejl";
  statusEl.textContent = "GPS kunne ikke startes";
  messageEl.textContent = `${error.message}. Kontrollér at placering er tilladt, og prøv igen.`;
  render();
}

function resetAll() {
  if (!confirm("Vil du slette alle fire kalibrerede punkter?")) return;
  stopWatch();
  checkpoints = [null, null, null, null];
  activeIndex = 0;
  localStorage.removeItem(STORAGE_KEY);
  resetMeasurementDisplay();
  gpsEl.textContent = "Ikke startet";
  accuracyEl.textContent = "—";
  statusEl.textContent = "Klar til GPS-kalibrering";
  render();
}

function downloadJson() {
  if (!allSaved()) return;
  const payload = {
    version: 21,
    calibrationMethod: "average-of-50-accepted-gps-readings",
    maxAcceptedAccuracyMeters: MAX_ACCURACY,
    createdAt: Date.now(),
    checkpoints: {
      startFinish: checkpoints[0],
      firstTurn: checkpoints[1],
      oppositeStraight: checkpoints[2],
      secondTurn: checkpoints[3]
    }
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "checkpoints.json";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  statusEl.textContent = "checkpoints.json er hentet ✅";
  messageEl.textContent = "Send checkpoints.json til mig i chatten.";
}

measureBtn.addEventListener("click", startMeasurement);
cancelBtn.addEventListener("click", cancelMeasurement);
resetBtn.addEventListener("click", resetAll);
downloadBtn.addEventListener("click", downloadJson);
window.addEventListener("pagehide", stopWatch);
loadSaved();
