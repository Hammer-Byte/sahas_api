const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

function getContentPublishRuns({ start_date, end_date } = {}) {
    const params = [];
    let where = "WHERE 1=1";

    if (start_date) {
        where += " AND DATE(COALESCE(r.started_on, r.created_on)) >= DATE(?)";
        params.push(start_date);
    }
    if (end_date) {
        where += " AND DATE(COALESCE(r.started_on, r.created_on)) <= DATE(?)";
        params.push(end_date);
    }

    return executeSQLQueryParameterized(
        `SELECT r.*,
                u.name AS automation_user_name,
                cu.full_name AS created_by_name,
                retry_src.hammerbyte_run_id AS retry_of_hammerbyte_run_id
         FROM CONTENT_PUBLISH_RUNS r
         LEFT JOIN AUTOMATION_USERS u ON u.id = r.automation_user_id
         LEFT JOIN USERS cu ON cu.id = r.created_by_user_id
         LEFT JOIN CONTENT_PUBLISH_RUNS retry_src ON retry_src.id = r.retry_of_run_id
         ${where}
         ORDER BY r.id DESC
         LIMIT 500`,
        params
    ).catch((error) => {
        logger.error(`getContentPublishRuns: ${error}`);
        return [];
    });
}

function getAllContentPublishRuns() {
    return getContentPublishRuns();
}

function getContentPublishRunById({ id }) {
    return executeSQLQueryParameterized(
        `SELECT r.*,
                u.name AS automation_user_name,
                cu.full_name AS created_by_name,
                retry_src.hammerbyte_run_id AS retry_of_hammerbyte_run_id
         FROM CONTENT_PUBLISH_RUNS r
         LEFT JOIN AUTOMATION_USERS u ON u.id = r.automation_user_id
         LEFT JOIN USERS cu ON cu.id = r.created_by_user_id
         LEFT JOIN CONTENT_PUBLISH_RUNS retry_src ON retry_src.id = r.retry_of_run_id
         WHERE r.id = ?`,
        [id]
    )
        .then((result) => (result.length > 0 ? result[0] : false))
        .catch((error) => {
            logger.error(`getContentPublishRunById: ${error}`);
            return false;
        });
}

function addContentPublishRun({
    hammerbyte_run_id,
    automation_user_id,
    created_by_user_id,
    retry_of_run_id,
    media_kind,
    media_filename,
    media_mime,
    media_path,
    platforms,
    status,
    error_message,
    instagram_user_id,
    instagram_caption,
    instagram_destinations,
    youtube_channel_id,
    youtube_title,
    youtube_description,
    youtube_destination,
    targets_json,
    started_on,
    finished_on,
}) {
    return executeSQLQueryParameterized(
        `INSERT INTO CONTENT_PUBLISH_RUNS (
            hammerbyte_run_id, automation_user_id, created_by_user_id, retry_of_run_id, media_kind,
            media_filename, media_mime, media_path, platforms, status, error_message,
            instagram_user_id, instagram_caption, instagram_destinations,
            youtube_channel_id, youtube_title, youtube_description, youtube_destination,
            targets_json, started_on, finished_on
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
            hammerbyte_run_id,
            automation_user_id || null,
            created_by_user_id || null,
            retry_of_run_id || null,
            media_kind || "image",
            media_filename || null,
            media_mime || null,
            media_path || null,
            platforms,
            status || "queued",
            error_message || null,
            instagram_user_id || null,
            instagram_caption || null,
            instagram_destinations || null,
            youtube_channel_id || null,
            youtube_title || null,
            youtube_description || null,
            youtube_destination || null,
            targets_json || null,
            started_on || null,
            finished_on || null,
        ]
    )
        .then((result) => result.insertId)
        .catch((error) => logger.error(`addContentPublishRun: ${error}`));
}

function updateContentPublishRunById({ id, status, error_message, started_on, finished_on, targets_json }) {
    return executeSQLQueryParameterized(
        `UPDATE CONTENT_PUBLISH_RUNS
         SET status=?,
             error_message=?,
             started_on=COALESCE(?, started_on),
             finished_on=?,
             targets_json=COALESCE(?, targets_json)
         WHERE id=?`,
        [status, error_message || null, started_on || null, finished_on || null, targets_json || null, id]
    ).catch((error) => logger.error(`updateContentPublishRunById: ${error}`));
}

module.exports = {
    getContentPublishRuns,
    getAllContentPublishRuns,
    getContentPublishRunById,
    addContentPublishRun,
    updateContentPublishRunById,
};
