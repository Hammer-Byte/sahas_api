const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

function getConfigByKey(config_key) {
    return executeSQLQueryParameterized("SELECT config_value FROM CONFIGS WHERE config_key=?", [config_key])
        .then((result) => (result.length > 0 ? result[0].config_value : undefined))
        .catch((error) => {
            logger.error(`getConfigByKey: ${error}`);
            return undefined;
        });
}

function writeConfigByKey(config_key, config_value) {
    return executeSQLQueryParameterized(
        `INSERT INTO CONFIGS (config_key, config_value) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE config_value = VALUES(config_value)`,
        [config_key, String(config_value)],
    ).catch((error) => logger.error(`writeConfigByKey: ${error}`));
}

module.exports = { getConfigByKey, writeConfigByKey };
