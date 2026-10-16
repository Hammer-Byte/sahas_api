const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

function getAllWebsiteStats() {
    return executeSQLQueryParameterized("SELECT * FROM WEBSITE_STATS ORDER BY id").catch((error) => {
        logger.error(`getAllWebsiteStats: ${error}`);
        return [];
    });
}

function getWebsiteStatById({ id }) {
    return executeSQLQueryParameterized("SELECT * FROM WEBSITE_STATS WHERE id=?", [id])
        .then((result) => (result.length > 0 ? result[0] : false))
        .catch((error) => {
            logger.error(`getWebsiteStatById: ${error}`);
            return false;
        });
}

function addWebsiteStat({ value_text, label, hint }) {
    return executeSQLQueryParameterized("INSERT INTO WEBSITE_STATS (value_text, label, hint) VALUES (?, ?, ?)", [value_text, label, hint])
        .then((result) => result.insertId)
        .catch((error) => {
            logger.error(`addWebsiteStat: ${error}`);
            return false;
        });
}

function updateWebsiteStatById({ id, value_text, label, hint }) {
    return executeSQLQueryParameterized("UPDATE WEBSITE_STATS SET value_text=?, label=?, hint=? WHERE id=?", [value_text, label, hint, id]).catch((error) => {
        logger.error(`updateWebsiteStatById: ${error}`);
        return false;
    });
}

function deleteWebsiteStatById({ id }) {
    return executeSQLQueryParameterized("DELETE FROM WEBSITE_STATS WHERE id=?", [id]).catch((error) => {
        logger.error(`deleteWebsiteStatById: ${error}`);
        return false;
    });
}

module.exports = { getAllWebsiteStats, getWebsiteStatById, addWebsiteStat, updateWebsiteStatById, deleteWebsiteStatById };
