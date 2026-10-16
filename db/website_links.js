const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

function getAllWebsiteLinks() {
    return executeSQLQueryParameterized("SELECT * FROM WEBSITE_LINKS ORDER BY id").catch((error) => {
        logger.error(`getAllWebsiteLinks: ${error}`);
        return [];
    });
}

function getWebsiteLinkById({ id }) {
    return executeSQLQueryParameterized("SELECT * FROM WEBSITE_LINKS WHERE id=?", [id])
        .then((result) => (result.length > 0 ? result[0] : false))
        .catch((error) => {
            logger.error(`getWebsiteLinkById: ${error}`);
            return false;
        });
}

function addWebsiteLink({ group_key, label, href, icon }) {
    return executeSQLQueryParameterized("INSERT INTO WEBSITE_LINKS (group_key, label, href, icon) VALUES (?, ?, ?, ?)", [group_key, label, href, icon])
        .then((result) => result.insertId)
        .catch((error) => {
            logger.error(`addWebsiteLink: ${error}`);
            return false;
        });
}

function updateWebsiteLinkById({ id, group_key, label, href, icon }) {
    return executeSQLQueryParameterized("UPDATE WEBSITE_LINKS SET group_key=?, label=?, href=?, icon=? WHERE id=?", [group_key, label, href, icon, id]).catch((error) => {
        logger.error(`updateWebsiteLinkById: ${error}`);
        return false;
    });
}

function deleteWebsiteLinkById({ id }) {
    return executeSQLQueryParameterized("DELETE FROM WEBSITE_LINKS WHERE id=?", [id]).catch((error) => {
        logger.error(`deleteWebsiteLinkById: ${error}`);
        return false;
    });
}

module.exports = { getAllWebsiteLinks, getWebsiteLinkById, addWebsiteLink, updateWebsiteLinkById, deleteWebsiteLinkById };
