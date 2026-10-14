const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

function getWebsiteCoursesPage() {
    return executeSQLQueryParameterized("SELECT id, eyebrow, title, description, intro_title, intro_text, show_search, show_filters, cta_title, cta_description, cta_primary_text, cta_primary_url, cta_secondary_url FROM WEBSITE_PAGE_COURSES WHERE id=1", [])
        .then((result) => (result.length > 0 ? result[0] : false))
        .catch((error) => {
            logger.error(`getWebsiteCoursesPage: ${error}`);
            return false;
        });
}

function updateWebsiteCoursesPage({ eyebrow, title, description, intro_title, intro_text, show_search, show_filters, cta_title, cta_description, cta_primary_text, cta_primary_url, cta_secondary_url }) {
    return executeSQLQueryParameterized("UPDATE WEBSITE_PAGE_COURSES SET eyebrow=?, title=?, description=?, intro_title=?, intro_text=?, show_search=?, show_filters=?, cta_title=?, cta_description=?, cta_primary_text=?, cta_primary_url=?, cta_secondary_url=? WHERE id=1", [eyebrow, title, description, intro_title, intro_text, show_search, show_filters, cta_title, cta_description, cta_primary_text, cta_primary_url, cta_secondary_url]).catch((error) => {
        logger.error(`updateWebsiteCoursesPage: ${error}`);
        return false;
    });
}

module.exports = { getWebsiteCoursesPage, updateWebsiteCoursesPage };
