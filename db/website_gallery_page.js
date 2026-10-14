const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

function getWebsiteGalleryPage() {
    return executeSQLQueryParameterized("SELECT id, eyebrow, title, description, categories_eyebrow, categories_title, categories_description, featured_eyebrow, latest_eyebrow, latest_title, moments_eyebrow, moments_title, empty_title, empty_text, page_size, show_search, show_filters FROM WEBSITE_PAGE_GALLERY WHERE id=1", [])
        .then((result) => (result.length > 0 ? result[0] : false))
        .catch((error) => {
            logger.error(`getWebsiteGalleryPage: ${error}`);
            return false;
        });
}

function updateWebsiteGalleryPage({ eyebrow, title, description, categories_eyebrow, categories_title, categories_description, featured_eyebrow, latest_eyebrow, latest_title, moments_eyebrow, moments_title, empty_title, empty_text, page_size, show_search, show_filters }) {
    return executeSQLQueryParameterized("UPDATE WEBSITE_PAGE_GALLERY SET eyebrow=?, title=?, description=?, categories_eyebrow=?, categories_title=?, categories_description=?, featured_eyebrow=?, latest_eyebrow=?, latest_title=?, moments_eyebrow=?, moments_title=?, empty_title=?, empty_text=?, page_size=?, show_search=?, show_filters=? WHERE id=1", [eyebrow, title, description, categories_eyebrow, categories_title, categories_description, featured_eyebrow, latest_eyebrow, latest_title, moments_eyebrow, moments_title, empty_title, empty_text, page_size, show_search, show_filters]).catch((error) => {
        logger.error(`updateWebsiteGalleryPage: ${error}`);
        return false;
    });
}

module.exports = { getWebsiteGalleryPage, updateWebsiteGalleryPage };
