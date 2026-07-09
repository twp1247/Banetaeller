let gpxRoute=[];
let routeLine=null;
let startMarker=null;

async function loadGPX(){
  try{
    const response=await fetch("banen.gpx");
    if(!response.ok) throw new Error("Kunne ikke hente banen.gpx");
    const text=await response.text();
    const xml=new DOMParser().parseFromString(text,"application/xml");
    const points=xml.getElementsByTagName("trkpt");
    gpxRoute=[];
    for(let i=0;i<points.length;i++){
      const lat=parseFloat(points[i].getAttribute("lat"));
      const lng=parseFloat(points[i].getAttribute("lon"));
      if(!Number.isNaN(lat) && !Number.isNaN(lng)) gpxRoute.push([lat,lng]);
    }
    drawRoute();
    buildCheckpoints();
    debugLog("GPX indlæst", gpxRoute.length, "punkter");
  }catch(err){
    console.error(err);
    if(window.gpsText) gpsText.innerText="GPX ikke indlæst";
  }
}

function drawRoute(){
  if(!window.map || gpxRoute.length===0) return;
  if(routeLine) map.removeLayer(routeLine);
  routeLine=L.polyline(gpxRoute,{color:"#00bfff",weight:6}).addTo(map);
  if(startMarker) map.removeLayer(startMarker);
  startMarker=L.marker(gpxRoute[0],{title:"Start/mål"}).addTo(map);
  map.fitBounds(routeLine.getBounds(),{padding:[20,20]});
}

function nearestPoint(lat,lng){
  if(!gpxRoute || gpxRoute.length===0) return null;
  let bestPoint=null;
  let bestDistance=Infinity;
  for(const p of gpxRoute){
    const d=distanceBetween(lat,lng,p[0],p[1]);
    if(d<bestDistance){bestDistance=d; bestPoint=p;}
  }
  return {point:bestPoint,distance:bestDistance};
}
