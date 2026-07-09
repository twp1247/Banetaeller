let checkpoints=[];
let currentCheckpoint=0;
let lapCounter=0;
let lapStartTime=null;
let lapStarted=false;

function buildCheckpoints(){
  checkpoints=[];
  if(!gpxRoute || gpxRoute.length===0) return;

  const step=Math.max(1,Math.floor(gpxRoute.length/CHECKPOINT_COUNT));
  for(let i=0;i<gpxRoute.length;i+=step){
    checkpoints.push({lat:gpxRoute[i][0],lng:gpxRoute[i][1],reached:false});
  }
  resetLapEngine();
  debugLog("Checkpoints",checkpoints.length);
}

function resetLapEngine(){
  currentCheckpoint=0;
  lapStartTime=null;
  lapStarted=false;
  checkpoints.forEach(cp=>cp.reached=false);
}

function updateLapEngine(lat,lng,accuracy,totalDistance){
  if(!running) return;
  if(checkpoints.length===0) return;
  if(currentCheckpoint>=checkpoints.length) return;

  const near=nearestPoint(lat,lng);
  if(near && near.distance>ROUTE_TOLERANCE){
    gpsText.innerText="Uden for banen "+Math.round(near.distance)+" m";
    return;
  }

  if(!lapStarted){
    lapStarted=true;
    lapStartTime=Date.now();
  }

  const cp=checkpoints[currentCheckpoint];
  const d=distanceBetween(lat,lng,cp.lat,cp.lng);

  if(d<=ROUTE_TOLERANCE){
    cp.reached=true;
    currentCheckpoint++;
    debugLog("Checkpoint",currentCheckpoint,"/",checkpoints.length);

    if(currentCheckpoint>=checkpoints.length){
      finishLap();
    }
  }
}

function finishLap(){
  lapCounter++;
  const lapSeconds=lapStartTime ? Math.floor((Date.now()-lapStartTime)/1000) : 0;

  lapsElement.innerText=String(lapCounter);
  lapTimeElement.innerText=formatLapTime(lapSeconds);
  moneyElement.innerText=(lapCounter*MONEY_PER_LAP)+" kr";

  announceLap(lapCounter,formatLapTime(lapSeconds));
  resetLapEngine();
}
