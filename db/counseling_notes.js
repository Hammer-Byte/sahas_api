const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

function getCounselingNotesByUserId({ user_id }) {
    return executeSQLQueryParameterized(
        "SELECT COUNSELING_NOTES.*, USERS.full_name AS created_by_full_name FROM COUNSELING_NOTES LEFT JOIN USERS ON COUNSELING_NOTES.created_by = USERS.id WHERE user_id=? order by COUNSELING_NOTES.id DESC",
        [user_id],
    ).catch((error) => {
        logger.error(`getCounselingNotesByUserId: ${error}`);
        return [];
    });
}

function getCounselingNoteById({ id }) {
    return executeSQLQueryParameterized(
        "SELECT COUNSELING_NOTES.*, USERS.full_name AS created_by_full_name FROM COUNSELING_NOTES LEFT JOIN USERS ON COUNSELING_NOTES.created_by = USERS.id WHERE COUNSELING_NOTES.id=? ",
        [id],
    )
        .then((result) => (result.length > 0 ? result[0] : false))
        .catch((error) => logger.error(`getCounselingNoteById: ${error}`));
}

function deleteCounselingNoteById({ id }) {
    return executeSQLQueryParameterized("DELETE FROM COUNSELING_NOTES WHERE id=?", [id]).catch((error) => {
        logger.error(`deleteCounselingNoteById: ${error}`);
    });
}

async function addCounselingNote({ user_id, note, type = null, attachment = null, created_by }) {
    return executeSQLQueryParameterized("INSERT INTO COUNSELING_NOTES(user_id, note, type, attachment, created_by) VALUES(?,?,?,?,?)", [
        user_id,
        note,
        type,
        attachment,
        created_by,
    ])
        .then((result) => result.insertId)
        .catch((error) => {
            logger.error(`addCounselingNote: ${error}`);
        });
}

function updateCounselingNoteById({ id, note, type = null, attachment = null }) {
    return executeSQLQueryParameterized("UPDATE COUNSELING_NOTES SET note=?, type=?, attachment=? WHERE id=?", [note, type, attachment, id]).catch((error) => {
        logger.error(`updateCounselingNoteById: ${error}`);
    });
}

module.exports = {
    getCounselingNotesByUserId,
    getCounselingNoteById,
    deleteCounselingNoteById,
    addCounselingNote,
    updateCounselingNoteById,
};
