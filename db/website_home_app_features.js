const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

function getAllWebsiteHomeAppFeatures() {
    return executeSQLQueryParameterized("SELECT * FROM WEBSITE_HOME_APP_FEATURES ORDER BY id").catch((error) => {
        logger.error(`getAllWebsiteHomeAppFeatures: ${error}`);
        return [];
    });
}

function getWebsiteHomeAppFeatureById({ id }) {
    return executeSQLQueryParameterized("SELECT * FROM WEBSITE_HOME_APP_FEATURES WHERE id=?", [id])
        .then((result) => (result.length > 0 ? result[0] : false))
        .catch((error) => {
            logger.error(`getWebsiteHomeAppFeatureById: ${error}`);
            return false;
        });
}

function addWebsiteHomeAppFeature({ title }) {
    return executeSQLQueryParameterized("INSERT INTO WEBSITE_HOME_APP_FEATURES (title) VALUES (?)", [title])
        .then((result) => result.insertId)
        .catch((error) => {
            logger.error(`addWebsiteHomeAppFeature: ${error}`);
            return false;
        });
}

function updateWebsiteHomeAppFeatureById({ id, title }) {
    return executeSQLQueryParameterized("UPDATE WEBSITE_HOME_APP_FEATURES SET title=? WHERE id=?", [title, id]).catch((error) => {
        logger.error(`updateWebsiteHomeAppFeatureById: ${error}`);
        return false;
    });
}

function deleteWebsiteHomeAppFeatureById({ id }) {
    return executeSQLQueryParameterized("DELETE FROM WEBSITE_HOME_APP_FEATURES WHERE id=?", [id]).catch((error) => {
        logger.error(`deleteWebsiteHomeAppFeatureById: ${error}`);
        return false;
    });
}

module.exports = { getAllWebsiteHomeAppFeatures, getWebsiteHomeAppFeatureById, addWebsiteHomeAppFeature, updateWebsiteHomeAppFeatureById, deleteWebsiteHomeAppFeatureById };
