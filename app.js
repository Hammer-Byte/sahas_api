require("dotenv").config();

const { allowTraffic } = require("./server");
const { logger } = require("sahas_utils");
const { generateDBTables } = require("./libs/db");
const { prepareDirectories } = require("./utils");
const { generateCaches } = require("./libs/cacher");


// Test and Prepare Required Tables
(async () => {
    await generateDBTables()
        .then(() => logger.success("Database Ready"))
        .then(generateCaches)
        .catch((error) => logger.error(`Failed To Prepare Cache ${error}`))
        .then(allowTraffic)
        .catch((error) => logger.error(`Failed To Prepare Database ${error}`));
})();
