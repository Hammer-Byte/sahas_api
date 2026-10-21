const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

function addUserActivity({ user_id, activity }) {
    return executeSQLQueryParameterized(`INSERT INTO USER_ACTIVITIES (user_id, activity) VALUES (?, ?)`, [user_id, activity]).then(
        (result) => result.insertId,
    );
}

function getUserActivitiesByUserIdBetween({ user_id, day_start, day_end }) {
    return executeSQLQueryParameterized(
        `SELECT id, activity, created_on FROM USER_ACTIVITIES
         WHERE user_id = ? AND created_on >= ? AND created_on <= ?
         ORDER BY created_on DESC, id DESC`,
        [user_id, day_start, day_end],
    ).catch((error) => {
        logger.error(`getUserActivitiesByUserIdBetween: ${error}`);
        return [];
    });
}

module.exports = {
    addUserActivity,
    getUserActivitiesByUserIdBetween,
};
