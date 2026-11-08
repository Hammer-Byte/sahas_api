const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

function getAllAutomationUsers() {
    return executeSQLQueryParameterized(`SELECT * FROM AUTOMATION_USERS ORDER BY id DESC`).catch((error) => {
        logger.error(`getAllAutomationUsers: ${error}`);
        return [];
    });
}

function getAutomationUserById({ id }) {
    return executeSQLQueryParameterized(`SELECT * FROM AUTOMATION_USERS WHERE id = ?`, [id])
        .then((result) => (result.length > 0 ? result[0] : false))
        .catch((error) => {
            logger.error(`getAutomationUserById: ${error}`);
            return false;
        });
}

function addAutomationUser({ name, instagram_access_token, instagram_user_id, youtube_cookie, youtube_channel_id }) {
    return executeSQLQueryParameterized(
        `INSERT INTO AUTOMATION_USERS (name, instagram_access_token, instagram_user_id, youtube_cookie, youtube_channel_id) VALUES (?,?,?,?,?)`,
        [name, instagram_access_token || null, instagram_user_id || null, youtube_cookie || null, youtube_channel_id || null]
    )
        .then((result) => result.insertId)
        .catch((error) => logger.error(`addAutomationUser: ${error}`));
}

function updateAutomationUserById({ id, name, instagram_access_token, instagram_user_id, youtube_cookie, youtube_channel_id }) {
    return executeSQLQueryParameterized(
        `UPDATE AUTOMATION_USERS SET name=?, instagram_access_token=?, instagram_user_id=?, youtube_cookie=?, youtube_channel_id=? WHERE id=?`,
        [name, instagram_access_token || null, instagram_user_id || null, youtube_cookie || null, youtube_channel_id || null, id]
    ).catch((error) => logger.error(`updateAutomationUserById: ${error}`));
}

function deleteAutomationUserById({ id }) {
    return executeSQLQueryParameterized(`DELETE FROM AUTOMATION_USERS WHERE id=?`, [id]).catch((error) => {
        logger.error(`deleteAutomationUserById: ${error}`);
        throw error;
    });
}

module.exports = {
    getAllAutomationUsers,
    getAutomationUserById,
    addAutomationUser,
    updateAutomationUserById,
    deleteAutomationUserById,
};
