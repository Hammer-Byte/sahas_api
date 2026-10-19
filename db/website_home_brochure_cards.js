const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

function getAllWebsiteHomeBrochureCards() {
    return executeSQLQueryParameterized("SELECT * FROM WEBSITE_HOME_BROCHURE_CARDS ORDER BY id").catch((error) => {
        logger.error(`getAllWebsiteHomeBrochureCards: ${error}`);
        return [];
    });
}

function getWebsiteHomeBrochureCardById({ id }) {
    return executeSQLQueryParameterized("SELECT * FROM WEBSITE_HOME_BROCHURE_CARDS WHERE id=?", [id])
        .then((result) => (result.length > 0 ? result[0] : false))
        .catch((error) => {
            logger.error(`getWebsiteHomeBrochureCardById: ${error}`);
            return false;
        });
}

function addWebsiteHomeBrochureCard({ title, description, file_url, link_url }) {
    return executeSQLQueryParameterized("INSERT INTO WEBSITE_HOME_BROCHURE_CARDS (title, description, file_url, link_url) VALUES (?, ?, ?, ?)", [title, description, file_url, link_url])
        .then((result) => result.insertId)
        .catch((error) => {
            logger.error(`addWebsiteHomeBrochureCard: ${error}`);
            return false;
        });
}

function updateWebsiteHomeBrochureCardById({ id, title, description, file_url, link_url }) {
    return executeSQLQueryParameterized("UPDATE WEBSITE_HOME_BROCHURE_CARDS SET title=?, description=?, file_url=?, link_url=? WHERE id=?", [title, description, file_url, link_url, id]).catch((error) => {
        logger.error(`updateWebsiteHomeBrochureCardById: ${error}`);
        return false;
    });
}

function deleteWebsiteHomeBrochureCardById({ id }) {
    return executeSQLQueryParameterized("DELETE FROM WEBSITE_HOME_BROCHURE_CARDS WHERE id=?", [id]).catch((error) => {
        logger.error(`deleteWebsiteHomeBrochureCardById: ${error}`);
        return false;
    });
}

module.exports = { getAllWebsiteHomeBrochureCards, getWebsiteHomeBrochureCardById, addWebsiteHomeBrochureCard, updateWebsiteHomeBrochureCardById, deleteWebsiteHomeBrochureCardById };
