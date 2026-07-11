function speak(text) {
  if (!SPEAK || !("speechSynthesis" in window)) return;

  window.speechSynthesis.cancel();

  const message = new SpeechSynthesisUtterance(text);
  message.lang = "da-DK";
  window.speechSynthesis.speak(message);
}

function vibrate(pattern) {
  if (!VIBRATE || !navigator.vibrate) return;
  navigator.vibrate(pattern);
}

function announceStart() {
  speak("Træning startet");
}

function announceStop() {
  speak("Træning stoppet");
}

function announceStartPointSaved() {
  speak("Start og mål er gemt");
}

function announceLap(lapNumber) {
  speak("Omgang " + lapNumber + " gennemført");
  vibrate([150, 80, 150]);
}
