let map;
let running=false;
let startTime=null;
let timerInterval=null;

const startBtn=document.getElementById("startBtn");
const stopBtn=document.getElementById("stopBtn");
const gpsText=document.getElementById("gpsText");
const timeElement=document.getElementById("time");
const lapsElement=document.getElementById("laps");
const distanceElement=document.getElementById("distance");
const lapTimeElement=document.getElementById("lapTime");
const moneyElement=document.getElementById("money");

function initMap(){
  map=L.map("map").setView([54.9928,12.2830],18);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:22}).addTo(map);
}

function startTraining(){
  if(running) return;
  running=true;
  startTime=Date.now();
  resetGPS();
  resetLapEngine();
  gpsText.innerText="Starter GPS...";
  startTimer();
  announceStart();
  startGPS();
}

function stopTraining(){
  if(!running) return;
  running=false;
  stopTimer();
  stopGPS();
  gpsText.innerText="Stoppet";
  announceStop();
}

function startTimer(){
  stopTimer();
  timerInterval=setInterval(()=>{
    const seconds=Math.floor((Date.now()-startTime)/1000);
    timeElement.innerText=formatTime(seconds);
  },1000);
}

function stopTimer(){
  if(timerInterval!==null){
    clearInterval(timerInterval);
    timerInterval=null;
  }
}

startBtn.addEventListener("click",startTraining);
stopBtn.addEventListener("click",stopTraining);

initMap();
loadGPX();

if("serviceWorker" in navigator){
  navigator.serviceWorker.register("sw.js").catch(console.error);
}
