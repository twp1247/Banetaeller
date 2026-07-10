let watchId=null;
let lastPosition=null;
let totalDistance=0;
let gpsTrack=[];
let userMarker=null;

function startGPS(){
  if(!navigator.geolocation){
    gpsText.innerText="GPS understøttes ikke";
    return;
  }
  watchId=navigator.geolocation.watchPosition(onGPS,onGPSError,{
    enableHighAccuracy:true,
    maximumAge:0,
    timeout:10000
  });
}

function stopGPS(){
  if(watchId!==null){
    navigator.geolocation.clearWatch(watchId);
    watchId=null;
  }
}

function resetGPS(){
  lastPosition=null;
  totalDistance=0;
  gpsTrack=[];
  distanceElement.innerText="0.00 km";
}

function onGPS(position){
  const lat=position.coords.latitude;
  const lng=position.coords.longitude;
  window.currentLat = lat;
window.currentLng = lng;
  const acc=position.coords.accuracy ?? 999;

  gpsText.innerText="GPS OK ±"+Math.round(acc)+" m";

  if(userMarker) userMarker.setLatLng([lat,lng]);
  else userMarker=L.marker([lat,lng],{title:"Din position"}).addTo(map);

  map.setView([lat,lng],18);

  if(lastPosition){
    const d=distanceBetween(lastPosition.lat,lastPosition.lng,lat,lng);
    if(d<GPS_MAX_JUMP){
      totalDistance+=d;
      distanceElement.innerText=formatDistance(totalDistance);
    }
  }

  lastPosition={lat,lng};
  gpsTrack.push({lat,lng,acc,time:Date.now()});

  updateLapEngine(lat,lng,acc,totalDistance);
}

function onGPSError(error){
  gpsText.innerText="GPS fejl";
  console.error("GPS fejl",error);
}
