const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

function getAllCalendarMonthImages() {
    return executeSQLQueryParameterized("SELECT * FROM CALENDAR_MONTH_IMAGES ORDER BY month ASC").catch((error) => {
        logger.error(`getAllCalendarMonthImages: ${error}`);
        return [];
    });
}

function getCalendarMonthImageByMonth({ month }) {
    return executeSQLQueryParameterized("SELECT * FROM CALENDAR_MONTH_IMAGES WHERE month = ?", [month])
        .then((result) => (result.length > 0 ? result[0] : false))
        .catch((error) => {
            logger.error(`getCalendarMonthImageByMonth: ${error}`);
            return false;
        });
}

function upsertCalendarMonthImage({ month, image_url = null, updated_by = null }) {
    return executeSQLQueryParameterized(
        `INSERT INTO CALENDAR_MONTH_IMAGES (month, image_url, updated_by)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE image_url = VALUES(image_url), updated_by = VALUES(updated_by)`,
        [month, image_url, updated_by],
    )
        .then(() => getCalendarMonthImageByMonth({ month }))
        .catch((error) => {
            logger.error(`upsertCalendarMonthImage: ${error}`);
            return false;
        });
}

module.exports = {
    getAllCalendarMonthImages,
    getCalendarMonthImageByMonth,
    upsertCalendarMonthImage,
};
