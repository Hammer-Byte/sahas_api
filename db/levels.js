const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

function getAllLevels() {
    return executeSQLQueryParameterized(
        `SELECT id, title, color, view_index, active
         FROM LEVELS
         WHERE active = TRUE
         ORDER BY view_index ASC, id ASC`,
    ).catch((error) => {
        logger.error(`getAllLevels: ${error}`);
        return [];
    });
}

function getLevelById({ id }) {
    return executeSQLQueryParameterized(`SELECT id, title, color, view_index, active FROM LEVELS WHERE id = ?`, [id])
        .then((result) => (result.length > 0 ? result[0] : false))
        .catch((error) => {
            logger.error(`getLevelById: ${error}`);
            return false;
        });
}

module.exports = { getAllLevels, getLevelById };
