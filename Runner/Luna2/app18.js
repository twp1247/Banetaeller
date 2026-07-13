const KEY="stafet_checkpoints_v18";
const MAX_ACC=35, RADIUS=15, HITS=2, LEAVE=7;
const names=["START","FØRSTE SVING","MODSATTE LANGSIDE","ANDET SVING","MÅL"];
const statusEl=document.getElementById("status"),savedEl=document.getElementById("saved"),
startBtn=document.getElementById("start"),stopBtn=document.getElementById("stop"),
clearBtn=document.getElementById("clear"),nextEl=document.getElementById("next"),
progressEl=document.getElementById("progress"),gpsEl=document.getElementById("gps"),
accEl=document.getElementById("acc"),latEl=document.getElementById("lat"),
lngEl=document.getElementById("lng"),distEl=document.getElementById("dist"),
updatesEl=document.getElementById("updates"),acceptedEl=document.getElementById("accepted"),
rejectedEl=document.getElementById("rejected"),msgEl=document.getElementById("msg"),
logEl=document.getElementById("log"),overlay=document.getElementById("overlay"),
overlayText=document.getElementById("overlayText");

let cps=load(),watchId=null,running=false,step=0,zoneHits=0,entered=false,updates=0,accepted=0,rejected=0,logs=[];

function load(){try{const x=JSON.parse(localStorage.getItem(KEY));return Array.isArray(x)&&x.length===4?x:[null,null,null,null]}catch{return [null,null,null,null]}}
function save(){localStorage.setItem(KEY,JSON.stringify(cps));renderSaved()}
function allSaved(){return cps.every(Boolean)}
function rad(v){return v*Math.PI/180}
function distance(a,b){const R=6371000,dLat=rad(b.lat-a.lat),dLng=rad(b.lng-a.lng);const x=Math.sin(dLat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLng/2)**2;return 2*R*Math.atan2(Math.sqrt(x),Math.sqrt(1-x))}
function target(){return step===0||step===4?cps[0]:cps[step]}
function showOverlay(t){overlayText.textContent=t;overlay.classList.add("show");setTimeout(()=>overlay.classList.remove("show"),1200)}
function log(t){logs.push(new Date().toLocaleTimeString("da-DK")+" · "+t);logEl.textContent=logs.join(" | ")}

function renderSaved(){
  savedEl.innerHTML="";
  cps.forEach((p,i)=>{
    const d=document.createElement("div");
    d.innerHTML="<span>"+(i+1)+" · "+(i===0?"Start/mål":i===1?"Første sving":i===2?"Modsatte langside":"Andet sving")+"</span><strong>"+(p?p.lat.toFixed(6)+", "+p.lng.toFixed(6):"Ikke gemt")+"</strong>";
    savedEl.appendChild(d);
  });
  startBtn.disabled=!allSaved()||running;
  statusEl.textContent=allSaved()?"Alle 4 faste punkter er gemt ✅":"Gem de 4 faste punkter først";
  renderProgress();
}

function renderProgress(){
  progressEl.innerHTML="";
  names.forEach((n,i)=>{
    const d=document.createElement("div");
    d.textContent=n;
    if(i<step)d.classList.add("done");
    if(i===step)d.classList.add("active");
    progressEl.appendChild(d);
  });
  nextEl.textContent=allSaved()?"Næste: "+names[step]:"Næste: Gem alle 4 punkter";
}

function capture(i){
  statusEl.textContent="Finder GPS til punkt "+(i+1)+"…";
  navigator.geolocation.getCurrentPosition(pos=>{
    const a=pos.coords.accuracy??999;
    if(a>MAX_ACC){statusEl.textContent="GPS for upræcis: ±"+Math.round(a)+" m";return}
    cps[i]={lat:pos.coords.latitude,lng:pos.coords.longitude,accuracy:a,savedAt:Date.now()};
    save();statusEl.textContent="Punkt "+(i+1)+" gemt ✅";
  },e=>statusEl.textContent="GPS-fejl: "+e.message,{enableHighAccuracy:true,maximumAge:0,timeout:20000});
}

document.querySelectorAll("[data-save]").forEach(b=>b.addEventListener("click",()=>capture(Number(b.dataset.save))));
clearBtn.addEventListener("click",()=>{if(!confirm("Slet alle checkpoints?"))return;cps=[null,null,null,null];localStorage.removeItem(KEY);reset();renderSaved()});

function reset(){
  step=0;zoneHits=0;entered=false;updates=0;accepted=0;rejected=0;logs=[];
  updatesEl.textContent="0";acceptedEl.textContent="0";rejectedEl.textContent="0";
  logEl.textContent="Tom";msgEl.textContent="Ingen";distEl.textContent="—";renderProgress();
}

function start(){
  if(running||!allSaved())return;reset();running=true;startBtn.disabled=true;stopBtn.disabled=false;gpsEl.textContent="Starter GPS…";
  watchId=navigator.geolocation.watchPosition(handle,error,{enableHighAccuracy:true,maximumAge:0,timeout:20000});
}
function stop(){
  if(!running)return;running=false;if(watchId!==null){navigator.geolocation.clearWatch(watchId);watchId=null}
  startBtn.disabled=false;stopBtn.disabled=true;gpsEl.textContent="Stoppet";
}

function handle(pos){
  if(!running)return;
  const p={lat:pos.coords.latitude,lng:pos.coords.longitude,accuracy:pos.coords.accuracy??999};
  updates++;updatesEl.textContent=updates;accEl.textContent="±"+Math.round(p.accuracy)+" m";latEl.textContent=p.lat.toFixed(7);lngEl.textContent=p.lng.toFixed(7);
  if(p.accuracy>MAX_ACC){rejected++;rejectedEl.textContent=rejected;msgEl.textContent="Afvist: dårlig GPS";return}
  accepted++;acceptedEl.textContent=accepted;gpsEl.textContent="GPS OK";
  const d=distance(p,target());distEl.textContent=d.toFixed(1)+" m";
  if(d<=RADIUS){zoneHits++;if(zoneHits>=HITS){entered=true;msgEl.textContent="I "+names[step]+"-zonen"}}
  else{zoneHits=0;if(entered&&d>=RADIUS+LEAVE){register();entered=false}}
}

function register(){
  const n=names[step];log(n+" registreret");showOverlay(n+" ✅");
  if(navigator.vibrate)navigator.vibrate([100,60,100]);
  if(step===4){log("OMGANG GODKENDT");msgEl.textContent="OMGANG GODKENDT ✅";step=0}
  else{step++;msgEl.textContent=n+" godkendt"}
  renderProgress();
}
function error(e){gpsEl.textContent="GPS-fejl";msgEl.textContent=e.message}

startBtn.addEventListener("click",start);stopBtn.addEventListener("click",stop);
window.addEventListener("pagehide",()=>{if(watchId!==null)navigator.geolocation.clearWatch(watchId)});
renderSaved();
