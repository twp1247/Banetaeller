const STORAGE_KEY="stafet_checkpoints_v23";
const MAX_ACCURACY=35;
const ZONE_RADIUS=15;
const REQUIRED_HITS=2;
const LEAVE_MARGIN=7;

const names=[
  "START",
  "FØRSTE SVING",
  "MODSATTE LANGSIDE",
  "ANDET SVING",
  "MÅL"
];

const statusEl=document.getElementById("status");
const savedEl=document.getElementById("saved");
const startBtn=document.getElementById("start");
const stopBtn=document.getElementById("stop");
const clearBtn=document.getElementById("clear");
const downloadBtn=document.getElementById("download");
const nextEl=document.getElementById("next");
const progressEl=document.getElementById("progress");
const gpsEl=document.getElementById("gps");
const accEl=document.getElementById("acc");
const latEl=document.getElementById("lat");
const lngEl=document.getElementById("lng");
const distEl=document.getElementById("dist");
const updatesEl=document.getElementById("updates");
const acceptedEl=document.getElementById("accepted");
const rejectedEl=document.getElementById("rejected");
const msgEl=document.getElementById("msg");
const logEl=document.getElementById("log");
const overlay=document.getElementById("overlay");
const overlayText=document.getElementById("overlayText");
const lapCountEl=document.getElementById("lapCount");
const lapStatusEl=document.getElementById("lapStatus");

let checkpoints=[null,null,null,null];
let watchId=null;
let running=false;

let step=0;
let expectedHits=0;
let enteredExpected=false;
let wrongHits=[0,0,0,0];

let invalidLap=false;
let invalidStartHits=0;
let invalidEnteredStart=false;

// Build 023: Efter mål-tilstand.
// En omgang tælles, så snart målzonen er bekræftet.
// Derefter må deltageren stå stille eller gå lidt tilbage mod checkpoint 4
// uden at få en falsk snydealarm.
let afterFinish=false;
let afterFinishBackSide=false;
let afterFinishStartHits=0;
let afterFinishEnteredStart=false;

let updates=0;
let accepted=0;
let rejected=0;
let laps=0;
let logs=[];

function toRadians(value){
  return value*Math.PI/180;
}

function distanceBetween(a,b){
  const earthRadius=6371000;
  const dLat=toRadians(b.lat-a.lat);
  const dLng=toRadians(b.lng-a.lng);

  const x=
    Math.sin(dLat/2)**2+
    Math.cos(toRadians(a.lat))*
    Math.cos(toRadians(b.lat))*
    Math.sin(dLng/2)**2;

  return 2*earthRadius*Math.atan2(
    Math.sqrt(x),
    Math.sqrt(1-x)
  );
}

function allSaved(){
  return checkpoints.every(Boolean);
}

function getTargetIndex(){
  return step===0 || step===4 ? 0 : step;
}

function getTarget(){
  return checkpoints[getTargetIndex()];
}

function addLog(text){
  logs.push(
    new Date().toLocaleTimeString("da-DK")+
    " · "+
    text
  );

  logEl.textContent=logs.join(" | ");
}

function showOverlay(text,isError=false){
  overlayText.textContent=text;
  overlay.classList.toggle("red",isError);
  overlay.classList.add("show");

  window.setTimeout(()=>{
    overlay.classList.remove("show");
    overlay.classList.remove("red");
  },1500);
}

function renderSaved(){
  savedEl.innerHTML="";

  checkpoints.forEach((point,index)=>{
    const title=[
      "Start/mål",
      "Første sving",
      "Modsatte langside",
      "Andet sving"
    ][index];

    const row=document.createElement("div");

    row.innerHTML=
      "<span>"+(index+1)+" · "+title+"</span>"+
      "<strong>"+
      (
        point
          ? point.lat.toFixed(6)+", "+
            point.lng.toFixed(6)+
            " · ±"+
            Math.round(point.accuracy||0)+" m"
          : "Ikke gemt"
      )+
      "</strong>";

    savedEl.appendChild(row);
  });

  const ready=allSaved();

  startBtn.disabled=!ready || running;
  downloadBtn.disabled=!ready;

  statusEl.textContent=ready
    ? "Testede checkpoints er indlæst ✅"
    : "Checkpoints mangler";

  renderProgress();
}

function renderProgress(){
  progressEl.innerHTML="";

  names.forEach((name,index)=>{
    const box=document.createElement("div");

    box.textContent=name;

    if(!invalidLap && index<step){
      box.classList.add("done");
    }

    if(!invalidLap && index===step){
      box.classList.add("active");
    }

    progressEl.appendChild(box);
  });

  if(invalidLap){
    nextEl.textContent=
      "UGYLDIG OMGANG · Gå tilbage til START/MÅL";

    lapStatusEl.textContent=
      "Forkert rækkefølge registreret";
  }else if(afterFinish){
    nextEl.textContent=
      afterFinishBackSide
        ? "EFTER MÅL · Checkpoint 4 er tilladt · gå tilbage til START/MÅL"
        : "EFTER MÅL · Appen ser hvilken vej du går";

    lapStatusEl.textContent=
      "Omgang "+laps+" godkendt · efter mål";
  }else{
    nextEl.textContent=allSaved()
      ? "Næste: "+names[step]
      : "Næste: checkpoints mangler";

    lapStatusEl.textContent=
      laps===0
        ? "Klar til omgang 1"
        : "Klar til omgang "+(laps+1);
  }
}

async function loadBundledCheckpoints(){
  try{
    const response=await fetch(
      "checkpoints.json?v=23&t="+Date.now(),
      {cache:"no-store"}
    );

    if(!response.ok){
      throw new Error("HTTP "+response.status);
    }

    const data=await response.json();
    const source=data.checkpoints;

    checkpoints=[
      source.startFinish,
      source.firstTurn,
      source.oppositeStraight,
      source.secondTurn
    ];

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(checkpoints)
    );
  }catch(error){
    console.warn(
      "Kunne ikke hente checkpoints.json:",
      error
    );

    try{
      const saved=JSON.parse(
        localStorage.getItem(STORAGE_KEY)
      );

      if(
        Array.isArray(saved) &&
        saved.length===4
      ){
        checkpoints=saved;
      }
    }catch(localError){
      console.error(localError);
    }
  }

  renderSaved();
}

function saveCheckpoints(){
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(checkpoints)
  );

  renderSaved();
}

function captureCheckpoint(index){
  if(running){
    statusEl.textContent=
      "Stop testen før checkpoint ændres";
    return;
  }

  statusEl.textContent=
    "Finder GPS til punkt "+(index+1)+"…";

  navigator.geolocation.getCurrentPosition(
    position=>{
      const accuracy=
        position.coords.accuracy??999;

      if(accuracy>MAX_ACCURACY){
        statusEl.textContent=
          "GPS for upræcis: ±"+
          Math.round(accuracy)+" m";
        return;
      }

      checkpoints[index]={
        lat:position.coords.latitude,
        lng:position.coords.longitude,
        accuracy,
        savedAt:Date.now()
      };

      saveCheckpoints();

      statusEl.textContent=
        "Punkt "+(index+1)+" gemt ✅";
    },
    error=>{
      statusEl.textContent=
        "GPS-fejl: "+error.message;
    },
    {
      enableHighAccuracy:true,
      maximumAge:0,
      timeout:20000
    }
  );
}

document
  .querySelectorAll("[data-save]")
  .forEach(button=>{
    button.addEventListener(
      "click",
      ()=>{
        captureCheckpoint(
          Number(button.dataset.save)
        );
      }
    );
  });

clearBtn.addEventListener(
  "click",
  ()=>{
    if(
      !window.confirm(
        "Vil du slette alle checkpoints?"
      )
    ){
      return;
    }

    if(running){
      stopTest();
    }

    checkpoints=[
      null,
      null,
      null,
      null
    ];

    localStorage.removeItem(STORAGE_KEY);
    resetSession();
    renderSaved();
  }
);

downloadBtn.addEventListener(
  "click",
  ()=>{
    if(!allSaved()){
      return;
    }

    const payload={
      version:23,
      createdAt:Date.now(),
      zoneRadiusMeters:ZONE_RADIUS,
      checkpoints:{
        startFinish:checkpoints[0],
        firstTurn:checkpoints[1],
        oppositeStraight:checkpoints[2],
        secondTurn:checkpoints[3]
      }
    };

    const blob=new Blob(
      [JSON.stringify(payload,null,2)],
      {type:"application/json"}
    );

    const url=URL.createObjectURL(blob);
    const link=document.createElement("a");

    link.href=url;
    link.download="checkpoints.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    statusEl.textContent=
      "checkpoints.json er hentet ✅";
  }
);

function resetTrackingState(){
  step=0;
  expectedHits=0;
  enteredExpected=false;
  wrongHits=[0,0,0,0];

  invalidLap=false;
  invalidStartHits=0;
  invalidEnteredStart=false;

  afterFinish=false;
  afterFinishBackSide=false;
  afterFinishStartHits=0;
  afterFinishEnteredStart=false;

  document.body.classList.remove(
    "cheat-alert"
  );

  renderProgress();
}

function resetSession(){
  resetTrackingState();

  updates=0;
  accepted=0;
  rejected=0;
  laps=0;
  logs=[];

  updatesEl.textContent="0";
  acceptedEl.textContent="0";
  rejectedEl.textContent="0";
  lapCountEl.textContent="0";
  logEl.textContent="Tom";
  msgEl.textContent="Ingen";
  distEl.textContent="—";
}

function startTest(){
  if(
    running ||
    !allSaved()
  ){
    return;
  }

  resetSession();
  running=true;

  startBtn.disabled=true;
  stopBtn.disabled=false;
  gpsEl.textContent="Starter GPS…";

  watchId=
    navigator.geolocation.watchPosition(
      handlePosition,
      handleError,
      {
        enableHighAccuracy:true,
        maximumAge:0,
        timeout:20000
      }
    );
}

function stopTest(){
  if(!running){
    return;
  }

  running=false;

  if(watchId!==null){
    navigator.geolocation.clearWatch(
      watchId
    );

    watchId=null;
  }

  startBtn.disabled=false;
  stopBtn.disabled=true;
  gpsEl.textContent="Stoppet";
}

function triggerCheat(index){
  if(invalidLap){
    return;
  }

  invalidLap=true;
  expectedHits=0;
  enteredExpected=false;
  wrongHits=[0,0,0,0];

  const wrongName=
    index===0
      ? "START/MÅL"
      : names[index];

  addLog(
    "UGYLDIG RÆKKEFØLGE · "+
    wrongName+
    " blev ramt"
  );

  msgEl.textContent=
    "OM GANG IKKE GODKENDT ❌";

  document.body.classList.add(
    "cheat-alert"
  );

  showOverlay(
    "FORKERT RÆKKEFØLGE ❌",
    true
  );

  if(navigator.vibrate){
    navigator.vibrate(
      [180,80,180,80,180]
    );
  }

  renderProgress();
}

function handleInvalidLap(point){
  const startDistance=
    distanceBetween(
      point,
      checkpoints[0]
    );

  distEl.textContent=
    startDistance.toFixed(1)+" m";

  if(startDistance<=ZONE_RADIUS){
    invalidStartHits+=1;

    if(
      invalidStartHits>=
      REQUIRED_HITS
    ){
      invalidEnteredStart=true;

      msgEl.textContent=
        "Ugyldig omgang · i målzonen";
    }
  }else{
    invalidStartHits=0;

    if(
      invalidEnteredStart &&
      startDistance>=
        ZONE_RADIUS+
        LEAVE_MARGIN
    ){
      invalidLap=false;
      invalidEnteredStart=false;
      step=1;

      document.body.classList.remove(
        "cheat-alert"
      );

      addLog(
        "Ugyldig omgang afsluttet · klar igen"
      );

      msgEl.textContent=
        "Klar til ny omgang ✅";

      renderProgress();
    }
  }
}

function beginNormalLapAfterFinish(){
  afterFinish=false;
  afterFinishBackSide=false;
  afterFinishStartHits=0;
  afterFinishEnteredStart=false;
  step=1;
  expectedHits=0;
  enteredExpected=false;
  wrongHits=[0,0,0,0];

  addLog("Ny omgang startet i normal retning");
  msgEl.textContent="Ny omgang startet ✅";
  renderProgress();
}

function handleAfterFinish(point){
  const startDistance=distanceBetween(point,checkpoints[0]);
  const firstTurnDistance=distanceBetween(point,checkpoints[1]);
  const secondTurnDistance=distanceBetween(point,checkpoints[3]);

  distEl.textContent=startDistance.toFixed(1)+" m";

  // I målområdet må man stå stille og vende rundt uden alarm.
  if(startDistance<=ZONE_RADIUS){
    afterFinishStartHits+=1;

    if(afterFinishStartHits>=REQUIRED_HITS){
      afterFinishEnteredStart=true;
      afterFinishBackSide=false;
      msgEl.textContent="Efter mål · i målzonen";
    }

    return;
  }

  afterFinishStartHits=0;

  // Vi vælger først side, når personen tydeligt har forladt målområdet.
  if(startDistance<ZONE_RADIUS+LEAVE_MARGIN){
    return;
  }

  // Den side, der ligger nærmest, fortæller om personen fortsætter normalt
  // eller blot går lidt tilbage mod checkpoint 4.
  if(!afterFinishBackSide && firstTurnDistance<secondTurnDistance){
    beginNormalLapAfterFinish();
    return;
  }

  if(secondTurnDistance<=firstTurnDistance){
    afterFinishBackSide=true;
    msgEl.textContent="Efter mål · tilbage mod checkpoint 4 er tilladt";
  }

  if(!afterFinishBackSide){
    return;
  }

  // Checkpoint 4 er tilladt efter mål. Checkpoint 3 eller 2 betyder,
  // at personen fortsætter baglæns rundt på banen og skal afvises.
  const checkpoint3Distance=distanceBetween(point,checkpoints[2]);
  const checkpoint2Distance=distanceBetween(point,checkpoints[1]);

  if(checkpoint3Distance<=ZONE_RADIUS){
    wrongHits[2]+=1;
    if(wrongHits[2]>=REQUIRED_HITS){
      triggerCheat(2);
    }
  }else{
    wrongHits[2]=0;
  }

  if(checkpoint2Distance<=ZONE_RADIUS){
    wrongHits[1]+=1;
    if(wrongHits[1]>=REQUIRED_HITS){
      triggerCheat(1);
    }
  }else{
    wrongHits[1]=0;
  }
}

function detectWrongCheckpoint(point){
  const expectedIndex=
    getTargetIndex();

  checkpoints.forEach(
    (checkpoint,index)=>{
      if(index===expectedIndex){
        wrongHits[index]=0;
        return;
      }

      const distance=
        distanceBetween(
          point,
          checkpoint
        );

      if(distance<=ZONE_RADIUS){
        wrongHits[index]+=1;

        if(
          wrongHits[index]>=
          REQUIRED_HITS
        ){
          triggerCheat(index);
        }
      }else{
        wrongHits[index]=0;
      }
    }
  );
}

function handlePosition(position){
  if(!running){
    return;
  }

  const point={
    lat:position.coords.latitude,
    lng:position.coords.longitude,
    accuracy:
      position.coords.accuracy??999
  };

  updates+=1;
  updatesEl.textContent=String(updates);

  accEl.textContent=
    "±"+
    Math.round(point.accuracy)+
    " m";

  latEl.textContent=
    point.lat.toFixed(7);

  lngEl.textContent=
    point.lng.toFixed(7);

  if(point.accuracy>MAX_ACCURACY){
    rejected+=1;
    rejectedEl.textContent=
      String(rejected);

    msgEl.textContent=
      "Afvist: dårlig GPS";

    return;
  }

  accepted+=1;
  acceptedEl.textContent=
    String(accepted);

  gpsEl.textContent="GPS OK";

  if(invalidLap){
    handleInvalidLap(point);
    return;
  }

  if(afterFinish){
    handleAfterFinish(point);
    return;
  }

  detectWrongCheckpoint(point);

  if(invalidLap){
    return;
  }

  const target=getTarget();

  const distance=
    distanceBetween(
      point,
      target
    );

  distEl.textContent=
    distance.toFixed(1)+" m";

  if(distance<=ZONE_RADIUS){
    expectedHits+=1;

    if(
      expectedHits>=
      REQUIRED_HITS
    ){
      enteredExpected=true;

      msgEl.textContent=
        "I "+
        names[step]+
        "-zonen";

      // Mål tælles ved bekræftet indgang i målzonen. Det gør det muligt
      // at håndtere vendingen, mens personen stadig er i målområdet.
      if(step===4){
        registerStep();
      }
    }
  }else{
    expectedHits=0;

    if(
      enteredExpected &&
      distance>=
        ZONE_RADIUS+
        LEAVE_MARGIN
    ){
      registerStep();
      enteredExpected=false;
    }
  }
}

function registerStep(){
  const name=names[step];

  addLog(
    name+
    " registreret"
  );

  showOverlay(
    name+
    " ✅"
  );

  if(navigator.vibrate){
    navigator.vibrate(
      [100,60,100]
    );
  }

  if(step===4){
    laps+=1;
    lapCountEl.textContent=
      String(laps);

    addLog(
      "OMGANG "+
      laps+
      " GODKENDT"
    );

    msgEl.textContent=
      "OMGANG "+
      laps+
      " GODKENDT ✅";

    showOverlay(
      "OMGANG "+
      laps+
      " GODKENDT ✅"
    );

    afterFinish=true;
    afterFinishBackSide=false;
    afterFinishStartHits=REQUIRED_HITS;
    afterFinishEnteredStart=true;
    step=0;
  }else{
    step+=1;

    msgEl.textContent=
      name+
      " godkendt";
  }

  expectedHits=0;
  wrongHits=[0,0,0,0];
  renderProgress();
}

function handleError(error){
  gpsEl.textContent="GPS-fejl";
  msgEl.textContent=error.message;
}

startBtn.addEventListener(
  "click",
  startTest
);

stopBtn.addEventListener(
  "click",
  stopTest
);

window.addEventListener(
  "pagehide",
  ()=>{
    if(watchId!==null){
      navigator.geolocation.clearWatch(
        watchId
      );
    }
  }
);

loadBundledCheckpoints();
