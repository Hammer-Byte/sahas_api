const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

function getWebsiteFooter() {
    return executeSQLQueryParameterized("SELECT id, footer_description, footer_copyright FROM WEBSITE_SETTINGS WHERE id=1", [])
        .then((result) => (result.length > 0 ? result[0] : false))
        .catch((error) => {
            logger.error(`getWebsiteFooter: ${error}`);
            return false;
        });
}

function updateWebsiteFooter({ footer_description, footer_copyright }) {
    return executeSQLQueryParameterized("UPDATE WEBSITE_SETTINGS SET footer_description=?, footer_copyright=? WHERE id=1", [footer_description, footer_copyright]).catch((error) => {
        logger.error(`updateWebsiteFooter: ${error}`);
        return false;
    });
}

module.exports = { getWebsiteFooter, updateWebsiteFooter };
