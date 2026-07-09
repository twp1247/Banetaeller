function distanceBetween(lat1,lng1,lat2,lng2){
  const R=6371000;
  const dLat=(lat2-lat1)*Math.PI/180;
  const dLng=(lng2-lng1)*Math.PI/180;
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}
function formatTime(totalSeconds){
  const h=Math.floor(totalSeconds/3600);
  const m=Math.floor((totalSeconds%3600)/60);
  const s=totalSeconds%60;
  return String(h).padStart(2,"0")+":"+String(m).padStart(2,"0")+":"+String(s).padStart(2,"0");
}
function formatLapTime(seconds){
  const m=Math.floor(seconds/60);
  const s=seconds%60;
  return String(m).padStart(2,"0")+":"+String(s).padStart(2,"0");
}
function formatDistance(meters){return (meters/1000).toFixed(2)+" km";}
function debugLog(...args){if(DEBUG) console.log(...args);}
