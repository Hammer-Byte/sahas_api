const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

function getGovernmentHolidaysInRange({ from, to }) {
    return executeSQLQueryParameterized(
        `SELECT id, date, name, year
         FROM GOVERNMENT_HOLIDAYS
         WHERE date >= ? AND date <= ?
         ORDER BY date ASC`,
        [from, to],
    ).catch((error) => {
        logger.error(`getGovernmentHolidaysInRange: ${error}`);
        return [];
    });
}

module.exports = {
    getGovernmentHolidaysInRange,
};
