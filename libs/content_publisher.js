const { saas_requester, CONSTANTS } = require("@hammerbyte/utils");
const { logger } = require("sahas_utils");

function getHammerbyteHeaders() {
    const applicationId = process.env.HAMMERBYTE_APPLICATION_ID;
    const applicationToken = process.env.HAMMERBYTE_APPLICATION_TOKEN;

    if (!applicationId || !applicationToken) {
        throw new Error("Missing HAMMERBYTE_APPLICATION_ID or HAMMERBYTE_APPLICATION_TOKEN");
    }

    return {
        [CONSTANTS.SAAS.HEADERS.APPLICATION_ID]: applicationId,
        [CONSTANTS.SAAS.HEADERS.APPLICATION_TOKEN]: applicationToken,
    };
}

async function queuePublish({ formData }) {
    logger.info("Queueing content-publisher run");
    return saas_requester({
        service: "content-publisher",
        path: "",
        method: "POST",
        headers: getHammerbyteHeaders(),
        body: formData,
    });
}

async function getRunStatus({ runId }) {
    return saas_requester({
        service: "content-publisher",
        path: `runs/${runId}`,
        method: "GET",
        headers: getHammerbyteHeaders(),
    });
}

module.exports = { queuePublish, getRunStatus };
