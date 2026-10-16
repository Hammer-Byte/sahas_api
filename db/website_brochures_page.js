const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

function getWebsiteBrochuresPage() {
    return executeSQLQueryParameterized("SELECT id, eyebrow, title, description, empty_title, empty_text, search_empty_title, search_empty_text, show_search, show_filters FROM WEBSITE_PAGE_BROCHURES WHERE id=1", [])
        .then((result) => (result.length > 0 ? result[0] : false))
        .catch((error) => {
            logger.error(`getWebsiteBrochuresPage: ${error}`);
            return false;
        });
}

function updateWebsiteBrochuresPage({ eyebrow, title, description, empty_title, empty_text, search_empty_title, search_empty_text, show_search, show_filters }) {
    return executeSQLQueryParameterized("UPDATE WEBSITE_PAGE_BROCHURES SET eyebrow=?, title=?, description=?, empty_title=?, empty_text=?, search_empty_title=?, search_empty_text=?, show_search=?, show_filters=? WHERE id=1", [eyebrow, title, description, empty_title, empty_text, search_empty_title, search_empty_text, show_search, show_filters]).catch((error) => {
        logger.error(`updateWebsiteBrochuresPage: ${error}`);
        return false;
    });
}

module.exports = { getWebsiteBrochuresPage, updateWebsiteBrochuresPage };
