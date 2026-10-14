const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

function getAllWebsiteHomeAchievements() {
    return executeSQLQueryParameterized("SELECT * FROM WEBSITE_HOME_ACHIEVEMENTS ORDER BY id").catch((error) => {
        logger.error(`getAllWebsiteHomeAchievements: ${error}`);
        return [];
    });
}

function getWebsiteHomeAchievementById({ id }) {
    return executeSQLQueryParameterized("SELECT * FROM WEBSITE_HOME_ACHIEVEMENTS WHERE id=?", [id])
        .then((result) => (result.length > 0 ? result[0] : false))
        .catch((error) => {
            logger.error(`getWebsiteHomeAchievementById: ${error}`);
            return false;
        });
}

function addWebsiteHomeAchievement({ category, value_text, title, meta }) {
    return executeSQLQueryParameterized("INSERT INTO WEBSITE_HOME_ACHIEVEMENTS (category, value_text, title, meta) VALUES (?, ?, ?, ?)", [category, value_text, title, meta])
        .then((result) => result.insertId)
        .catch((error) => {
            logger.error(`addWebsiteHomeAchievement: ${error}`);
            return false;
        });
}

function updateWebsiteHomeAchievementById({ id, category, value_text, title, meta }) {
    return executeSQLQueryParameterized("UPDATE WEBSITE_HOME_ACHIEVEMENTS SET category=?, value_text=?, title=?, meta=? WHERE id=?", [category, value_text, title, meta, id]).catch((error) => {
        logger.error(`updateWebsiteHomeAchievementById: ${error}`);
        return false;
    });
}

function deleteWebsiteHomeAchievementById({ id }) {
    return executeSQLQueryParameterized("DELETE FROM WEBSITE_HOME_ACHIEVEMENTS WHERE id=?", [id]).catch((error) => {
        logger.error(`deleteWebsiteHomeAchievementById: ${error}`);
        return false;
    });
}

module.exports = { getAllWebsiteHomeAchievements, getWebsiteHomeAchievementById, addWebsiteHomeAchievement, updateWebsiteHomeAchievementById, deleteWebsiteHomeAchievementById };
