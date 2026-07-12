const statusEl=document.getElementById("status");
const latEl=document.getElementById("lat");
const lngEl=document.getElementById("lng");
const accEl=document.getElementById("acc");
const captureBtn=document.getElementById("capture");
const downloadBtn=document.getElementById("download");
let point=null;

captureBtn.addEventListener("click",()=>{
  statusEl.textContent="Finder GPS-position…";
  captureBtn.disabled=true;

  navigator.geolocation.getCurrentPosition(pos=>{
    point={
      lat:pos.coords.latitude,
      lng:pos.coords.longitude,
      accuracy:pos.coords.accuracy??999,
      updatedAt:Date.now()
    };

    latEl.textContent=point.lat.toFixed(7);
    lngEl.textContent=point.lng.toFixed(7);
    accEl.textContent="±"+Math.round(point.accuracy)+" m";
    statusEl.textContent="✅ Start/mål er målt";
    downloadBtn.disabled=false;
    captureBtn.disabled=false;
  },err=>{
    statusEl.textContent="GPS-fejl: "+err.message;
    captureBtn.disabled=false;
  },{
    enableHighAccuracy:true,
    maximumAge:0,
    timeout:20000
  });
});

downloadBtn.addEventListener("click",()=>{
  if(!point)return;
  const blob=new Blob([JSON.stringify(point,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;
  a.download="startpoint.json";
  a.click();
  URL.revokeObjectURL(url);
  statusEl.textContent="✅ Fil hentet – upload den til GitHub";
});