const { REQUEST_DENIED, SERVER_UNDER_MAINTENANCE } = require("../constants");
const { getConfigByKey } = require("../db/configs");
const { logger } = require("sahas_utils");

module.exports = async (req, res, next) => {
    //if maintenance mode is disabled, then allow the request to proceed
    if ((await getConfigByKey("under_maintenance")) !== "true") {
        return next();
    }
    logger.error(`${REQUEST_DENIED} - ${SERVER_UNDER_MAINTENANCE}`);
    return res.status(503).json({ error: SERVER_UNDER_MAINTENANCE });
};
