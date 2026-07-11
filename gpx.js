async function loadStegeTrack() {
  const response = await fetch(
    "banen.gpx?v=stable-stege-1",
    { cache: "no-store" }
  );

  if (!response.ok) {
    throw new Error(
      "Stege-banen kunne ikke hentes."
    );
  }

  const xmlText = await response.text();
  const xml = new DOMParser().parseFromString(
    xmlText,
    "application/xml"
  );

  if (xml.querySelector("parsererror")) {
    throw new Error(
      "Stege-banens GPX-fil kunne ikke læses."
    );
  }

  const points = Array.from(
    xml.getElementsByTagNameNS("*", "trkpt")
  ).map(point => [
    Number(point.getAttribute("lat")),
    Number(point.getAttribute("lon"))
  ]).filter(point =>
    Number.isFinite(point[0]) &&
    Number.isFinite(point[1])
  );

  if (points.length < 2) {
    throw new Error(
      "Stege-banen indeholder for få punkter."
    );
  }

  return points;
}
