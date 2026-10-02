const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

function getUserEventsByUserIdOnDay({ user_id, day_start, day_end }) {
    return executeSQLQueryParameterized(
        `SELECT * FROM USER_EVENTS
         WHERE user_id = ?
           AND start_at < ?
           AND end_at > ?
         ORDER BY start_at ASC`,
        [user_id, day_end, day_start],
    ).catch((error) => {
        logger.error(`getUserEventsByUserIdOnDay: ${error}`);
        return [];
    });
}

function getUserEventById({ id }) {
    return executeSQLQueryParameterized(`SELECT * FROM USER_EVENTS WHERE id = ?`, [id])
        .then((rows) => (rows.length > 0 ? rows[0] : false))
        .catch((error) => logger.error(`getUserEventById: ${error}`));
}

function addUserEvent({ user_id, title, description = null, start_at, end_at }) {
    return executeSQLQueryParameterized(
        `INSERT INTO USER_EVENTS (user_id, title, description, start_at, end_at) VALUES (?, ?, ?, ?, ?)`,
        [user_id, title, description, start_at, end_at],
    )
        .then((result) => result.insertId)
        .catch((error) => logger.error(`addUserEvent: ${error}`));
}

function updateUserEventById({ id, user_id, title, description = null, start_at, end_at }) {
    return executeSQLQueryParameterized(
        `UPDATE USER_EVENTS SET title=?, description=?, start_at=?, end_at=? WHERE id=? AND user_id=?`,
        [title, description, start_at, end_at, id, user_id],
    )
        .then((result) => result.affectedRows > 0)
        .catch((error) => logger.error(`updateUserEventById: ${error}`));
}

function deleteUserEventById({ id, user_id }) {
    return executeSQLQueryParameterized(`DELETE FROM USER_EVENTS WHERE id=? AND user_id=?`, [id, user_id])
        .then((result) => result.affectedRows > 0)
        .catch((error) => logger.error(`deleteUserEventById: ${error}`));
}

module.exports = {
    getUserEventsByUserIdOnDay,
    getUserEventById,
    addUserEvent,
    updateUserEventById,
    deleteUserEventById,
};
