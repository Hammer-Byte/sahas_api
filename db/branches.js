const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

function getAllBranches() {
    return executeSQLQueryParameterized(`SELECT * FROM BRANCHES ORDER BY id`).catch((error) => {
        logger.error(`getAllBranches: ${error}`);
        return [];
    });
}

module.exports = { getAllBranches };
