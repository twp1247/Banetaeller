// Runner v0.1 – kun design og lokal knaptest.
// GPS, omgangstælling og live-data kobles på senere.

const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const statusText = document.getElementById("statusText");

let running = false;

function startRunner() {
  if (running) return;

  running = true;
  startBtn.disabled = true;
  stopBtn.disabled = false;
  statusText.textContent = "Luna er i gang 🏃";
}

function stopRunner() {
  if (!running) return;

  running = false;
  startBtn.disabled = false;
  stopBtn.disabled = true;
  statusText.textContent = "Stoppet";
}

startBtn.addEventListener("click", startRunner);
stopBtn.addEventListener("click", stopRunner);
