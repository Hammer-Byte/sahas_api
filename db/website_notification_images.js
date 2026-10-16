const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

function getAllWebsiteNotificationImages() {
    return executeSQLQueryParameterized("SELECT * FROM WEBSITE_NOTIFICATION_IMAGES ORDER BY id").catch((error) => {
        logger.error(`getAllWebsiteNotificationImages: ${error}`);
        return [];
    });
}

function getWebsiteNotificationImageById({ id }) {
    return executeSQLQueryParameterized("SELECT * FROM WEBSITE_NOTIFICATION_IMAGES WHERE id=?", [id])
        .then((result) => (result.length > 0 ? result[0] : false))
        .catch((error) => {
            logger.error(`getWebsiteNotificationImageById: ${error}`);
            return false;
        });
}

function addWebsiteNotificationImage({ notification_public_id, url, alt_text }) {
    return executeSQLQueryParameterized("INSERT INTO WEBSITE_NOTIFICATION_IMAGES (notification_public_id, url, alt_text) VALUES (?, ?, ?)", [notification_public_id, url, alt_text])
        .then((result) => result.insertId)
        .catch((error) => {
            logger.error(`addWebsiteNotificationImage: ${error}`);
            return false;
        });
}

function updateWebsiteNotificationImageById({ id, notification_public_id, url, alt_text }) {
    return executeSQLQueryParameterized("UPDATE WEBSITE_NOTIFICATION_IMAGES SET notification_public_id=?, url=?, alt_text=? WHERE id=?", [notification_public_id, url, alt_text, id]).catch((error) => {
        logger.error(`updateWebsiteNotificationImageById: ${error}`);
        return false;
    });
}

function deleteWebsiteNotificationImageById({ id }) {
    return executeSQLQueryParameterized("DELETE FROM WEBSITE_NOTIFICATION_IMAGES WHERE id=?", [id]).catch((error) => {
        logger.error(`deleteWebsiteNotificationImageById: ${error}`);
        return false;
    });
}

module.exports = { getAllWebsiteNotificationImages, getWebsiteNotificationImageById, addWebsiteNotificationImage, updateWebsiteNotificationImageById, deleteWebsiteNotificationImageById };
