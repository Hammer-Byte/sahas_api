const { executeSQLQueryParameterized, executeSQLQueryRaw } = require("../libs/db");
const { logger } = require("sahas_utils");

let scheduleColumnsReady = false;

async function ensureScheduleColumns() {
    if (scheduleColumnsReady) return true;

    const alters = [
        `ALTER TABLE BATCH_SCHEDULE ADD COLUMN subject VARCHAR(128) NULL`,
        `ALTER TABLE BATCH_SCHEDULE ADD COLUMN event_handler INT NULL`,
        `ALTER TABLE BATCH_SCHEDULE ADD INDEX idx_batch_schedule_handler (event_handler)`,
    ];

    for (const query of alters) {
        try {
            await executeSQLQueryRaw(query);
        } catch (error) {
            if (
                error?.code !== "ER_DUP_FIELDNAME" &&
                error?.code !== "ER_DUP_KEYNAME" &&
                error?.errno !== 1060 &&
                error?.errno !== 1061
            ) {
                logger.error(`ensureScheduleColumns failed: ${query} - ${error}`);
                return false;
            }
        }
    }

    scheduleColumnsReady = true;
    return true;
}

function getBatchScheduleByBatchId({ batch_id }) {
    return ensureScheduleColumns()
        .then(() =>
            executeSQLQueryParameterized(
                `SELECT BATCH_SCHEDULE.*, USERS.full_name AS event_handler_name
                 FROM BATCH_SCHEDULE
                 LEFT JOIN USERS ON USERS.id = BATCH_SCHEDULE.event_handler
                 WHERE BATCH_SCHEDULE.batch_id = ?
                 ORDER BY BATCH_SCHEDULE.weekday ASC`,
                [batch_id],
            ),
        )
        .catch((error) => {
            logger.error(`getBatchScheduleByBatchId: ${error}`);
            return [];
        });
}

function getBatchSchedulesByBatchIdsAndWeekday({ batch_ids, weekday }) {
    if (!batch_ids?.length) return Promise.resolve([]);

    const placeholders = batch_ids.map(() => "?").join(",");
    return ensureScheduleColumns()
        .then(() =>
            executeSQLQueryParameterized(
                `SELECT BATCH_SCHEDULE.*, BATCHES.title AS batch_title, BATCHES.start_date, BATCHES.end_date, BATCHES.active,
                        USERS.full_name AS event_handler_name
                 FROM BATCH_SCHEDULE
                 INNER JOIN BATCHES ON BATCHES.id = BATCH_SCHEDULE.batch_id
                 LEFT JOIN USERS ON USERS.id = BATCH_SCHEDULE.event_handler
                 WHERE BATCH_SCHEDULE.batch_id IN (${placeholders})
                   AND BATCH_SCHEDULE.weekday = ?
                   AND BATCH_SCHEDULE.start_time IS NOT NULL
                   AND BATCH_SCHEDULE.end_time IS NOT NULL`,
                [...batch_ids, weekday],
            ),
        )
        .catch((error) => {
            logger.error(`getBatchSchedulesByBatchIdsAndWeekday: ${error}`);
            return [];
        });
}

function getBatchSchedulesByEventHandlerAndWeekday({ user_id, weekday }) {
    return ensureScheduleColumns()
        .then(() =>
            executeSQLQueryParameterized(
                `SELECT BATCH_SCHEDULE.*, BATCHES.title AS batch_title, BATCHES.start_date, BATCHES.end_date, BATCHES.active,
                        USERS.full_name AS event_handler_name
                 FROM BATCH_SCHEDULE
                 INNER JOIN BATCHES ON BATCHES.id = BATCH_SCHEDULE.batch_id
                 LEFT JOIN USERS ON USERS.id = BATCH_SCHEDULE.event_handler
                 WHERE BATCH_SCHEDULE.event_handler = ?
                   AND BATCH_SCHEDULE.weekday = ?
                   AND BATCH_SCHEDULE.start_time IS NOT NULL
                   AND BATCH_SCHEDULE.end_time IS NOT NULL`,
                [user_id, weekday],
            ),
        )
        .catch((error) => {
            logger.error(`getBatchSchedulesByEventHandlerAndWeekday: ${error}`);
            return [];
        });
}

async function upsertBatchSchedule({ batch_id, days = [] }) {
    try {
        const ready = await ensureScheduleColumns();
        if (!ready) {
            logger.error("upsertBatchSchedule: schedule columns are not ready");
            return false;
        }

        for (const day of days) {
            const weekday = Number(day.weekday);
            const start_time = day.start_time || null;
            const end_time = day.end_time || null;
            const subject = day.subject ? String(day.subject).trim() : null;
            const event_handler =
                day.event_handler != null && day.event_handler !== "" ? Number(day.event_handler) : null;

            await executeSQLQueryParameterized(
                `INSERT INTO BATCH_SCHEDULE (batch_id, weekday, start_time, end_time, subject, event_handler)
                 VALUES (?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                   start_time = VALUES(start_time),
                   end_time = VALUES(end_time),
                   subject = VALUES(subject),
                   event_handler = VALUES(event_handler)`,
                [batch_id, weekday, start_time, end_time, subject, Number.isFinite(event_handler) ? event_handler : null],
            );
        }
        return true;
    } catch (error) {
        logger.error(`upsertBatchSchedule: ${error}`);
        return false;
    }
}

module.exports = {
    getBatchScheduleByBatchId,
    getBatchSchedulesByBatchIdsAndWeekday,
    getBatchSchedulesByEventHandlerAndWeekday,
    upsertBatchSchedule,
    ensureScheduleColumns,
};
