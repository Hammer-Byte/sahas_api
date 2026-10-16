const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

function getAllWebsiteCourseFeatures() {
    return executeSQLQueryParameterized("SELECT * FROM WEBSITE_COURSE_FEATURES ORDER BY id").catch((error) => {
        logger.error(`getAllWebsiteCourseFeatures: ${error}`);
        return [];
    });
}

function getWebsiteCourseFeatureById({ id }) {
    return executeSQLQueryParameterized("SELECT * FROM WEBSITE_COURSE_FEATURES WHERE id=?", [id])
        .then((result) => (result.length > 0 ? result[0] : false))
        .catch((error) => {
            logger.error(`getWebsiteCourseFeatureById: ${error}`);
            return false;
        });
}

function addWebsiteCourseFeature({ course_public_id, icon, title }) {
    return executeSQLQueryParameterized("INSERT INTO WEBSITE_COURSE_FEATURES (course_public_id, icon, title) VALUES (?, ?, ?)", [course_public_id, icon, title])
        .then((result) => result.insertId)
        .catch((error) => {
            logger.error(`addWebsiteCourseFeature: ${error}`);
            return false;
        });
}

function updateWebsiteCourseFeatureById({ id, course_public_id, icon, title }) {
    return executeSQLQueryParameterized("UPDATE WEBSITE_COURSE_FEATURES SET course_public_id=?, icon=?, title=? WHERE id=?", [course_public_id, icon, title, id]).catch((error) => {
        logger.error(`updateWebsiteCourseFeatureById: ${error}`);
        return false;
    });
}

function deleteWebsiteCourseFeatureById({ id }) {
    return executeSQLQueryParameterized("DELETE FROM WEBSITE_COURSE_FEATURES WHERE id=?", [id]).catch((error) => {
        logger.error(`deleteWebsiteCourseFeatureById: ${error}`);
        return false;
    });
}

module.exports = { getAllWebsiteCourseFeatures, getWebsiteCourseFeatureById, addWebsiteCourseFeature, updateWebsiteCourseFeatureById, deleteWebsiteCourseFeatureById };
