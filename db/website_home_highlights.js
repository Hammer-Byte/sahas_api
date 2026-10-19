const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

function getAllWebsiteHomeHighlights() {
    return executeSQLQueryParameterized("SELECT * FROM WEBSITE_HOME_HIGHLIGHTS ORDER BY id").catch((error) => {
        logger.error(`getAllWebsiteHomeHighlights: ${error}`);
        return [];
    });
}

function getWebsiteHomeHighlightById({ id }) {
    return executeSQLQueryParameterized("SELECT * FROM WEBSITE_HOME_HIGHLIGHTS WHERE id=?", [id])
        .then((result) => (result.length > 0 ? result[0] : false))
        .catch((error) => {
            logger.error(`getWebsiteHomeHighlightById: ${error}`);
            return false;
        });
}

function addWebsiteHomeHighlight({ icon, title, description }) {
    return executeSQLQueryParameterized("INSERT INTO WEBSITE_HOME_HIGHLIGHTS (icon, title, description) VALUES (?, ?, ?)", [icon, title, description])
        .then((result) => result.insertId)
        .catch((error) => {
            logger.error(`addWebsiteHomeHighlight: ${error}`);
            return false;
        });
}

function updateWebsiteHomeHighlightById({ id, icon, title, description }) {
    return executeSQLQueryParameterized("UPDATE WEBSITE_HOME_HIGHLIGHTS SET icon=?, title=?, description=? WHERE id=?", [icon, title, description, id]).catch((error) => {
        logger.error(`updateWebsiteHomeHighlightById: ${error}`);
        return false;
    });
}

function deleteWebsiteHomeHighlightById({ id }) {
    return executeSQLQueryParameterized("DELETE FROM WEBSITE_HOME_HIGHLIGHTS WHERE id=?", [id]).catch((error) => {
        logger.error(`deleteWebsiteHomeHighlightById: ${error}`);
        return false;
    });
}

module.exports = { getAllWebsiteHomeHighlights, getWebsiteHomeHighlightById, addWebsiteHomeHighlight, updateWebsiteHomeHighlightById, deleteWebsiteHomeHighlightById };
