const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

function getAllWebsiteNotificationFiles() {
    return executeSQLQueryParameterized("SELECT * FROM WEBSITE_NOTIFICATION_FILES ORDER BY id").catch((error) => {
        logger.error(`getAllWebsiteNotificationFiles: ${error}`);
        return [];
    });
}

function getWebsiteNotificationFileById({ id }) {
    return executeSQLQueryParameterized("SELECT * FROM WEBSITE_NOTIFICATION_FILES WHERE id=?", [id])
        .then((result) => (result.length > 0 ? result[0] : false))
        .catch((error) => {
            logger.error(`getWebsiteNotificationFileById: ${error}`);
            return false;
        });
}

function addWebsiteNotificationFile({ notification_public_id, title, url, file_size, file_type }) {
    return executeSQLQueryParameterized("INSERT INTO WEBSITE_NOTIFICATION_FILES (notification_public_id, title, url, file_size, file_type) VALUES (?, ?, ?, ?, ?)", [notification_public_id, title, url, file_size, file_type])
        .then((result) => result.insertId)
        .catch((error) => {
            logger.error(`addWebsiteNotificationFile: ${error}`);
            return false;
        });
}

function updateWebsiteNotificationFileById({ id, notification_public_id, title, url, file_size, file_type }) {
    return executeSQLQueryParameterized("UPDATE WEBSITE_NOTIFICATION_FILES SET notification_public_id=?, title=?, url=?, file_size=?, file_type=? WHERE id=?", [notification_public_id, title, url, file_size, file_type, id]).catch((error) => {
        logger.error(`updateWebsiteNotificationFileById: ${error}`);
        return false;
    });
}

function deleteWebsiteNotificationFileById({ id }) {
    return executeSQLQueryParameterized("DELETE FROM WEBSITE_NOTIFICATION_FILES WHERE id=?", [id]).catch((error) => {
        logger.error(`deleteWebsiteNotificationFileById: ${error}`);
        return false;
    });
}

module.exports = { getAllWebsiteNotificationFiles, getWebsiteNotificationFileById, addWebsiteNotificationFile, updateWebsiteNotificationFileById, deleteWebsiteNotificationFileById };
