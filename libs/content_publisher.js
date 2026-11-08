const { CONSTANTS } = require("@hammerbyte/utils");
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

function contentPublisherUrl(path = "") {
    const host = (CONSTANTS.SAAS.HOST || "https://hammerbyte.co.in/api/services").replace(/\/$/, "");
    const base = `${host}/content-publisher`;
    const cleanPath = String(path || "").replace(/^\//, "");
    return cleanPath ? `${base}/${cleanPath}` : `${base}/`;
}

function isFormDataBody(body) {
    return typeof FormData !== "undefined" && body instanceof FormData;
}

/**
 * Call HammerByte content-publisher.
 * Important: never set Content-Type for FormData — fetch must add the multipart boundary.
 * The shared saas_requester FormData detection is unreliable (`FormData || Object`), so we call fetch here.
 */
async function hammerbyteRequest({ method = "GET", path = "", body = false } = {}) {
    const url = contentPublisherUrl(path);
    const headers = {
        ...getHammerbyteHeaders(),
    };

    const fetchOptions = {
        method: method.toUpperCase(),
        headers,
    };

    if (body) {
        if (isFormDataBody(body)) {
            // Do not set Content-Type — boundary is required for multipart parsing
            fetchOptions.body = body;
            const keys = [];
            for (const [key, value] of body.entries()) {
                if (key === "file") {
                    keys.push("file=<blob>");
                } else if (key.includes("cookie") || key.includes("token")) {
                    keys.push(`${key}=<redacted:${String(value || "").length}>`);
                } else {
                    keys.push(`${key}=${String(value || "").slice(0, 60)}`);
                }
            }
            logger.info(`HammerByte content-publisher ${method} ${url} fields: ${keys.join(" | ")}`);
        } else {
            headers["Content-Type"] = "application/json";
            fetchOptions.body = typeof body === "string" ? body : JSON.stringify(body);
            logger.info(`HammerByte content-publisher ${method} ${url} (json)`);
        }
    } else {
        logger.info(`HammerByte content-publisher ${method} ${url}`);
    }

    const response = await fetch(url, fetchOptions);
    const result = {
        responseCode: response.status,
        responseBody: undefined,
    };

    const raw = await response.text();
    try {
        result.responseBody = raw ? JSON.parse(raw) : raw;
    } catch (error) {
        result.responseBody = raw;
    }

    return result;
}

async function queuePublish({ formData }) {
    logger.info("Queueing content-publisher run");
    return hammerbyteRequest({
        method: "POST",
        path: "",
        body: formData,
    });
}

async function getRunStatus({ runId }) {
    return hammerbyteRequest({
        method: "GET",
        path: `runs/${runId}`,
    });
}

module.exports = { queuePublish, getRunStatus };
