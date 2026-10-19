const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

function getWebsiteHeader() {
    return executeSQLQueryParameterized("SELECT id, header_logo, header_brand_name, header_brand_tagline, header_phone, header_cta_url FROM WEBSITE_SETTINGS WHERE id=1", [])
        .then((result) => (result.length > 0 ? result[0] : false))
        .catch((error) => {
            logger.error(`getWebsiteHeader: ${error}`);
            return false;
        });
}

function updateWebsiteHeader({ header_logo, header_brand_name, header_brand_tagline, header_phone, header_cta_url }) {
    return executeSQLQueryParameterized("UPDATE WEBSITE_SETTINGS SET header_logo=?, header_brand_name=?, header_brand_tagline=?, header_phone=?, header_cta_url=? WHERE id=1", [header_logo, header_brand_name, header_brand_tagline, header_phone, header_cta_url]).catch((error) => {
        logger.error(`updateWebsiteHeader: ${error}`);
        return false;
    });
}

module.exports = { getWebsiteHeader, updateWebsiteHeader };
