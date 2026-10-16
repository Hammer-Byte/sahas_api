const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

function getWebsiteNotificationsPage() {
    return executeSQLQueryParameterized("SELECT id, eyebrow, title, description, list_eyebrow, list_title, list_description, empty_title, empty_text, search_empty_title, search_empty_text, load_more_text, page_size, show_search, show_filters, show_sort FROM WEBSITE_PAGE_NOTIFICATIONS WHERE id=1", [])
        .then((result) => (result.length > 0 ? result[0] : false))
        .catch((error) => {
            logger.error(`getWebsiteNotificationsPage: ${error}`);
            return false;
        });
}

function updateWebsiteNotificationsPage({ eyebrow, title, description, list_eyebrow, list_title, list_description, empty_title, empty_text, search_empty_title, search_empty_text, load_more_text, page_size, show_search, show_filters, show_sort }) {
    return executeSQLQueryParameterized("UPDATE WEBSITE_PAGE_NOTIFICATIONS SET eyebrow=?, title=?, description=?, list_eyebrow=?, list_title=?, list_description=?, empty_title=?, empty_text=?, search_empty_title=?, search_empty_text=?, load_more_text=?, page_size=?, show_search=?, show_filters=?, show_sort=? WHERE id=1", [eyebrow, title, description, list_eyebrow, list_title, list_description, empty_title, empty_text, search_empty_title, search_empty_text, load_more_text, page_size, show_search, show_filters, show_sort]).catch((error) => {
        logger.error(`updateWebsiteNotificationsPage: ${error}`);
        return false;
    });
}

module.exports = { getWebsiteNotificationsPage, updateWebsiteNotificationsPage };
