const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

function getWebsiteFacilitiesPage() {
    return executeSQLQueryParameterized("SELECT id, eyebrow, title, description, intro_eyebrow, intro_title, intro_text, carousel_eyebrow, carousel_title, carousel_description, show_filters, ecosystem_title, ecosystem_description, closing_brand, cta_title, cta_primary_text, cta_primary_url, cta_secondary_url, float_title, line_title FROM WEBSITE_PAGE_FACILITIES WHERE id=1", [])
        .then((result) => (result.length > 0 ? result[0] : false))
        .catch((error) => {
            logger.error(`getWebsiteFacilitiesPage: ${error}`);
            return false;
        });
}

function updateWebsiteFacilitiesPage({ eyebrow, title, description, intro_eyebrow, intro_title, intro_text, carousel_eyebrow, carousel_title, carousel_description, show_filters, ecosystem_title, ecosystem_description, closing_brand, cta_title, cta_primary_text, cta_primary_url, cta_secondary_url, float_title, line_title }) {
    return executeSQLQueryParameterized("UPDATE WEBSITE_PAGE_FACILITIES SET eyebrow=?, title=?, description=?, intro_eyebrow=?, intro_title=?, intro_text=?, carousel_eyebrow=?, carousel_title=?, carousel_description=?, show_filters=?, ecosystem_title=?, ecosystem_description=?, closing_brand=?, cta_title=?, cta_primary_text=?, cta_primary_url=?, cta_secondary_url=?, float_title=?, line_title=? WHERE id=1", [eyebrow, title, description, intro_eyebrow, intro_title, intro_text, carousel_eyebrow, carousel_title, carousel_description, show_filters, ecosystem_title, ecosystem_description, closing_brand, cta_title, cta_primary_text, cta_primary_url, cta_secondary_url, float_title, line_title]).catch((error) => {
        logger.error(`updateWebsiteFacilitiesPage: ${error}`);
        return false;
    });
}

module.exports = { getWebsiteFacilitiesPage, updateWebsiteFacilitiesPage };
