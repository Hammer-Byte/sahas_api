const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

function getWebsiteContact() {
    return executeSQLQueryParameterized("SELECT id, eyebrow, title, description FROM WEBSITE_PAGE_CONTACT WHERE id=1", [])
        .then((result) => (result.length > 0 ? result[0] : false))
        .catch((error) => {
            logger.error(`getWebsiteContact: ${error}`);
            return false;
        });
}

function updateWebsiteContact({ eyebrow, title, description }) {
    return executeSQLQueryParameterized("UPDATE WEBSITE_PAGE_CONTACT SET eyebrow=?, title=?, description=? WHERE id=1", [eyebrow, title, description]).catch((error) => {
        logger.error(`updateWebsiteContact: ${error}`);
        return false;
    });
}

module.exports = { getWebsiteContact, updateWebsiteContact };
