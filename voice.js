let voiceEnabled = SPEAK_ENABLED;
function speak(text){
  if(!voiceEnabled || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const msg=new SpeechSynthesisUtterance(text);
  msg.lang="da-DK"; msg.rate=1; msg.pitch=1; msg.volume=1;
  window.speechSynthesis.speak(msg);
}
function vibrate(ms=250){if(VIBRATE_ENABLED && navigator.vibrate) navigator.vibrate(ms);}
function announceStart(){vibrate(150); speak("Træning startet");}
function announceStop(){vibrate(150); speak("Træning stoppet");}
function announceLap(lapNumber, lapTime){vibrate([150,80,150]); speak("Omgang "+lapNumber+" gennemført. Tid "+lapTime);}
