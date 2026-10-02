const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

function getBatchEventById({ id }) {
    return executeSQLQueryParameterized(`SELECT * FROM BATCH_EVENTS WHERE id = ?`, [id])
        .then(async (rows) => {
            if (!rows?.length) return false;
            const event = rows[0];
            event.batch_ids = await getBatchIdsByBatchEventId({ batch_event_id: id });
            return event;
        })
        .catch((error) => logger.error(`getBatchEventById: ${error}`));
}

function getBatchIdsByBatchEventId({ batch_event_id }) {
    return executeSQLQueryParameterized(
        `SELECT batch_id FROM BATCH_EVENT_BATCHES WHERE batch_event_id = ?`,
        [batch_event_id],
    )
        .then((rows) => rows.map((row) => row.batch_id))
        .catch((error) => {
            logger.error(`getBatchIdsByBatchEventId: ${error}`);
            return [];
        });
}

function getAllBatchEvents({ branch_id, batch_id } = {}) {
    const conditions = [];
    const params = [];

    if (branch_id) {
        conditions.push("BATCH_EVENTS.branch_id = ?");
        params.push(branch_id);
    }
    if (batch_id) {
        conditions.push(
            `EXISTS (SELECT 1 FROM BATCH_EVENT_BATCHES WHERE BATCH_EVENT_BATCHES.batch_event_id = BATCH_EVENTS.id AND BATCH_EVENT_BATCHES.batch_id = ?)`,
        );
        params.push(batch_id);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    return executeSQLQueryParameterized(
        `SELECT BATCH_EVENTS.* FROM BATCH_EVENTS ${where} ORDER BY BATCH_EVENTS.start_at DESC`,
        params,
    )
        .then(async (events) => {
            for (const event of events) {
                event.batch_ids = await getBatchIdsByBatchEventId({ batch_event_id: event.id });
            }
            return events;
        })
        .catch((error) => {
            logger.error(`getAllBatchEvents: ${error}`);
            return [];
        });
}

function getBatchEventsForUserBatchesOnDay({ batch_ids, day_start, day_end }) {
    if (!batch_ids?.length) return Promise.resolve([]);

    const placeholders = batch_ids.map(() => "?").join(",");
    return executeSQLQueryParameterized(
        `SELECT DISTINCT BATCH_EVENTS.*, BATCHES.id AS batch_id, BATCHES.title AS batch_title
         FROM BATCH_EVENTS
         INNER JOIN BATCH_EVENT_BATCHES ON BATCH_EVENT_BATCHES.batch_event_id = BATCH_EVENTS.id
         INNER JOIN BATCHES ON BATCHES.id = BATCH_EVENT_BATCHES.batch_id
         WHERE BATCH_EVENT_BATCHES.batch_id IN (${placeholders})
           AND BATCH_EVENTS.start_at < ?
           AND BATCH_EVENTS.end_at > ?
         ORDER BY BATCH_EVENTS.start_at ASC`,
        [...batch_ids, day_end, day_start],
    ).catch((error) => {
        logger.error(`getBatchEventsForUserBatchesOnDay: ${error}`);
        return [];
    });
}

function addBatchEvent({ title, description = null, start_at, end_at, branch_id = null, cancelled = false, created_by = null }) {
    return executeSQLQueryParameterized(
        `INSERT INTO BATCH_EVENTS (title, description, start_at, end_at, branch_id, cancelled, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [title, description, start_at, end_at, branch_id, cancelled, created_by],
    )
        .then((result) => result.insertId)
        .catch((error) => logger.error(`addBatchEvent: ${error}`));
}

function setBatchEventBatches({ batch_event_id, batch_ids = [] }) {
    return executeSQLQueryParameterized(`DELETE FROM BATCH_EVENT_BATCHES WHERE batch_event_id = ?`, [batch_event_id])
        .then(async () => {
            for (const batch_id of batch_ids) {
                await executeSQLQueryParameterized(
                    `INSERT INTO BATCH_EVENT_BATCHES (batch_event_id, batch_id) VALUES (?, ?)`,
                    [batch_event_id, batch_id],
                );
            }
            return true;
        })
        .catch((error) => {
            logger.error(`setBatchEventBatches: ${error}`);
            return false;
        });
}

function updateBatchEventById({ id, title, description = null, start_at, end_at, branch_id = null, cancelled = false }) {
    return executeSQLQueryParameterized(
        `UPDATE BATCH_EVENTS SET title=?, description=?, start_at=?, end_at=?, branch_id=?, cancelled=? WHERE id=?`,
        [title, description, start_at, end_at, branch_id, cancelled, id],
    ).catch((error) => logger.error(`updateBatchEventById: ${error}`));
}

function deleteBatchEventById({ id }) {
    return executeSQLQueryParameterized(`DELETE FROM BATCH_EVENT_BATCHES WHERE batch_event_id = ?`, [id])
        .then(() => executeSQLQueryParameterized(`DELETE FROM BATCH_EVENTS WHERE id = ?`, [id]))
        .catch((error) => logger.error(`deleteBatchEventById: ${error}`));
}

module.exports = {
    getBatchEventById,
    getAllBatchEvents,
    getBatchEventsForUserBatchesOnDay,
    addBatchEvent,
    setBatchEventBatches,
    updateBatchEventById,
    deleteBatchEventById,
};
