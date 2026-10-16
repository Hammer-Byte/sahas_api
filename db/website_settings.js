const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

function getWebsiteSettings() {
    return executeSQLQueryParameterized("SELECT id, site_name, site_tagline, site_logo, site_phone, site_whatsapp, site_email FROM WEBSITE_SETTINGS WHERE id=1", [])
        .then((result) => (result.length > 0 ? result[0] : false))
        .catch((error) => {
            logger.error(`getWebsiteSettings: ${error}`);
            return false;
        });
}

function updateWebsiteSettings({ site_name, site_tagline, site_logo, site_phone, site_whatsapp, site_email }) {
    return executeSQLQueryParameterized("UPDATE WEBSITE_SETTINGS SET site_name=?, site_tagline=?, site_logo=?, site_phone=?, site_whatsapp=?, site_email=? WHERE id=1", [site_name, site_tagline, site_logo, site_phone, site_whatsapp, site_email]).catch((error) => {
        logger.error(`updateWebsiteSettings: ${error}`);
        return false;
    });
}

module.exports = { getWebsiteSettings, updateWebsiteSettings };
