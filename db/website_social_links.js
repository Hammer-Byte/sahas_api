const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

function getAllWebsiteSocialLinks() {
    return executeSQLQueryParameterized("SELECT * FROM WEBSITE_SOCIAL_LINKS ORDER BY id").catch((error) => {
        logger.error(`getAllWebsiteSocialLinks: ${error}`);
        return [];
    });
}

function getWebsiteSocialLinkById({ id }) {
    return executeSQLQueryParameterized("SELECT * FROM WEBSITE_SOCIAL_LINKS WHERE id=?", [id])
        .then((result) => (result.length > 0 ? result[0] : false))
        .catch((error) => {
            logger.error(`getWebsiteSocialLinkById: ${error}`);
            return false;
        });
}

function addWebsiteSocialLink({ platform, url, icon }) {
    const publicId = String(platform || "website_social_links").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70) || `website_social_links-${Date.now()}`;
    return executeSQLQueryParameterized("INSERT INTO WEBSITE_SOCIAL_LINKS (public_id, platform, url, icon) VALUES (?, ?, ?, ?)", [publicId, platform, url, icon])
        .then((result) => result.insertId)
        .catch((error) => {
            logger.error(`addWebsiteSocialLink: ${error}`);
            return false;
        });
}

function updateWebsiteSocialLinkById({ id, platform, url, icon }) {
    return executeSQLQueryParameterized("UPDATE WEBSITE_SOCIAL_LINKS SET platform=?, url=?, icon=? WHERE id=?", [platform, url, icon, id]).catch((error) => {
        logger.error(`updateWebsiteSocialLinkById: ${error}`);
        return false;
    });
}

function deleteWebsiteSocialLinkById({ id }) {
    return executeSQLQueryParameterized("DELETE FROM WEBSITE_SOCIAL_LINKS WHERE id=?", [id]).catch((error) => {
        logger.error(`deleteWebsiteSocialLinkById: ${error}`);
        return false;
    });
}

module.exports = { getAllWebsiteSocialLinks, getWebsiteSocialLinkById, addWebsiteSocialLink, updateWebsiteSocialLinkById, deleteWebsiteSocialLinkById };
