require("dotenv").config();

const { allowTraffic } = require("./server");
const { logger } = require("sahas_utils");
const { generateDBTables } = require("./libs/db");

// Test and Prepare Required Tables
(async () => {
    await generateDBTables()
        .then(() => logger.success("Database Ready"))
        .then(allowTraffic)
        .catch((error) => logger.error(`Failed To Prepare Database ${error}`));
})();
