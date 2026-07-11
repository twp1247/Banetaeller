// ======================================
// BANETÆLLER
// Build007 – Banedatabase og favorit
// trackDatabase.js
// ======================================

function getTrackDatabase() {
  try {
    const json = localStorage.getItem(TRACK_DATABASE_KEY);
    if (!json) return [];

    const database = JSON.parse(json);
    return Array.isArray(database) ? database : [];
  } catch (error) {
    console.error("Fejl ved læsning af banedatabase:", error);
    return [];
  }
}

function saveTrackDatabase(database) {
  localStorage.setItem(
    TRACK_DATABASE_KEY,
    JSON.stringify(database)
  );
}

function createTrackId() {
  return (
    Date.now().toString(36) +
    "-" +
    Math.random().toString(36).slice(2, 8)
  );
}

function addTrack(track) {
  const database = getTrackDatabase();

  if (database.length >= MAX_TRACKS) {
    throw new Error(
      "Du kan højst gemme " + MAX_TRACKS + " baner."
    );
  }

  const savedTrack = {
    id: track.id || createTrackId(),
    name: track.name || "Unavngivet bane",
    createdAt: track.createdAt || Date.now(),
    points: Array.isArray(track.points) ? track.points : [],
    startPoint: track.startPoint || null
  };

  database.push(savedTrack);
  saveTrackDatabase(database);

  return savedTrack;
}

function getTrack(id) {
  return getTrackDatabase().find(track => track.id === id) || null;
}

function deleteTrack(id) {
  const database = getTrackDatabase();
  const newDatabase = database.filter(track => track.id !== id);
  saveTrackDatabase(newDatabase);
}

function updateTrack(id, changes) {
  const database = getTrackDatabase();
  const index = database.findIndex(track => track.id === id);

  if (index < 0) return null;

  database[index] = {
    ...database[index],
    ...changes,
    id: database[index].id
  };

  saveTrackDatabase(database);
  return database[index];
}

function getTrackCount() {
  return getTrackDatabase().length;
}


// ======================================
// FAVORITBANE
// ======================================

const FAVORITE_TRACK_KEY = "banetaeller_favorite_track";

function getFavoriteTrackId() {
  return localStorage.getItem(FAVORITE_TRACK_KEY);
}

function setFavoriteTrack(id) {
  localStorage.setItem(FAVORITE_TRACK_KEY, id);
}

function clearFavoriteTrack() {
  localStorage.removeItem(FAVORITE_TRACK_KEY);
}

function getFavoriteTrack() {
  const id = getFavoriteTrackId();
  return id ? getTrack(id) : null;
}
