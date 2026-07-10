// ======================================
// Banetæller
// Build002
// voice.js
// ======================================

function speak(text) {
    if (!SPEAK) {
        return;
    }

    if (!("speechSynthesis" in window)) {
        return;
    }

    window.speechSynthesis.cancel();

    const message = new SpeechSynthesisUtterance(text);

    message.lang = "da-DK";
    message.rate = 1;
    message.pitch = 1;
    message.volume = 1;

    window.speechSynthesis.speak(message);
}

function vibrate(pattern = 250) {
    if (!VIBRATE) {
        return;
    }

    if ("vibrate" in navigator) {
        navigator.vibrate(pattern);
    }
}

function announceStart() {
    vibrate(200);
    speak("Træning startet");
}

function announceStop() {
    vibrate(200);
    speak("Træning stoppet");
}

function announceStartPointSaved() {
    vibrate([150, 100, 150]);
    speak("Start og mål er gemt");
}