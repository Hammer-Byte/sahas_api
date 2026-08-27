const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

//freeze
function getTestConfigurationByChapterId({ chapter_id }) {
    return executeSQLQueryParameterized(
        `SELECT TEST_CONFIGURATIONS.* FROM SUBJECT_CHAPTERS LEFT JOIN TEST_CONFIGURATIONS ON SUBJECT_CHAPTERS.test_configuration_id=TEST_CONFIGURATIONS.id  WHERE SUBJECT_CHAPTERS.id=?`,
        [chapter_id],
    )
        .then((result) => (result.length > 0 ? result[0] : false))
        .catch((error) => logger.error(`getTestConfigurationByChapterId: ${error}`));
}

module.exports = { getTestConfigurationByChapterId };
