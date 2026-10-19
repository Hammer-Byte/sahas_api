const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

function getWebsiteMobileBar() {
    return executeSQLQueryParameterized("SELECT id, mobile_whatsapp, mobile_phone, mobile_courses_url, mobile_app_url FROM WEBSITE_SETTINGS WHERE id=1", [])
        .then((result) => (result.length > 0 ? result[0] : false))
        .catch((error) => {
            logger.error(`getWebsiteMobileBar: ${error}`);
            return false;
        });
}

function updateWebsiteMobileBar({ mobile_whatsapp, mobile_phone, mobile_courses_url, mobile_app_url }) {
    return executeSQLQueryParameterized("UPDATE WEBSITE_SETTINGS SET mobile_whatsapp=?, mobile_phone=?, mobile_courses_url=?, mobile_app_url=? WHERE id=1", [mobile_whatsapp, mobile_phone, mobile_courses_url, mobile_app_url]).catch((error) => {
        logger.error(`updateWebsiteMobileBar: ${error}`);
        return false;
    });
}

module.exports = { getWebsiteMobileBar, updateWebsiteMobileBar };
