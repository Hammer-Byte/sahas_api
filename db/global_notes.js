const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

function getGlobalNotesByUserId({ user_id }) {
    return executeSQLQueryParameterized(
        "SELECT GLOBAL_NOTES.*, USERS.full_name AS created_by_full_name FROM GLOBAL_NOTES LEFT JOIN USERS ON GLOBAL_NOTES.created_by = USERS.id WHERE user_id=? order by GLOBAL_NOTES.id DESC",
        [user_id]
    ).catch((error) => {
        logger.error(`getGlobalNotesByUserId: ${error}`);
        return [];
    });
}

function getGlobalNoteById({ id }) {
    return executeSQLQueryParameterized(
        "SELECT GLOBAL_NOTES.*, USERS.full_name AS created_by_full_name FROM GLOBAL_NOTES LEFT JOIN USERS ON GLOBAL_NOTES.created_by = USERS.id WHERE GLOBAL_NOTES.id=? ",
        [id]
    )
        .then((result) => (result.length > 0 ? result[0] : false))
        .catch((error) => logger.error(`getGlobalNoteById: ${error}`));
}

function deleteGlobalNoteById({ id }) {
    return executeSQLQueryParameterized("DELETE FROM GLOBAL_NOTES WHERE id=?", [id]).catch((error) => {
        logger.error(`deleteGlobalNoteById: ${error}`);
    });
}

async function addGlobalNote({ user_id, note, type, created_by }) {
    return executeSQLQueryParameterized("INSERT INTO GLOBAL_NOTES(user_id, note, type, created_by) VALUES(?,?,?,?)", [user_id, note, type, created_by])
        .then((result) => result.insertId)
        .catch((error) => {
            logger.error(`addGlobalNote: ${error}`);
        });
}

function updateGlobalNoteById({ id, note }) {
    return executeSQLQueryParameterized("UPDATE GLOBAL_NOTES SET note=? WHERE id=?", [note, id]).catch((error) => {
        logger.error(`updateGlobalNoteById: ${error}`);
    });
}

module.exports = { getGlobalNotesByUserId, getGlobalNoteById, deleteGlobalNoteById, addGlobalNote, updateGlobalNoteById };
