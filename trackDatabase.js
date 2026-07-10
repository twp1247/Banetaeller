// ======================================
// BANETÆLLER
// Build006
// trackDatabase.js
// ======================================

function getTrackDatabase() {

    try {

        const json = localStorage.getItem(
            TRACK_DATABASE_KEY
        );

        if (!json) {
            return [];
        }

        const database = JSON.parse(json);

        if (!Array.isArray(database)) {
            return [];
        }

        return database;

    } catch (error) {

        console.error(
            "Fejl ved læsning af banedatabase",
            error
        );

        return [];
    }

}

function saveTrackDatabase(database) {

    localStorage.setItem(
        TRACK_DATABASE_KEY,
        JSON.stringify(database)
    );

}

function addTrack(track) {

    const database =
        getTrackDatabase();

    database.push(track);

    saveTrackDatabase(database);

}

function getTrack(id) {

    const database =
        getTrackDatabase();

    return database.find(
        track => track.id === id
    );

}

function deleteTrack(id) {

    const database =
        getTrackDatabase();

    const newDatabase =
        database.filter(
            track => track.id !== id
        );

    saveTrackDatabase(newDatabase);

}

function updateTrack(id, newTrack) {

    const database =
        getTrackDatabase();

    const index =
        database.findIndex(
            track => track.id === id
        );

    if (index >= 0) {

        database[index] =
            newTrack;

        saveTrackDatabase(database);

    }

}

function getTrackCount() {

    return getTrackDatabase().length;

}