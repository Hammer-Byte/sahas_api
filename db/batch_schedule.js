const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

function getBatchScheduleByBatchId({ batch_id }) {
    return executeSQLQueryParameterized(
        `SELECT * FROM BATCH_SCHEDULE WHERE batch_id = ? ORDER BY weekday ASC`,
        [batch_id],
    ).catch((error) => {
        logger.error(`getBatchScheduleByBatchId: ${error}`);
        return [];
    });
}

function getBatchSchedulesByBatchIdsAndWeekday({ batch_ids, weekday }) {
    if (!batch_ids?.length) return Promise.resolve([]);

    const placeholders = batch_ids.map(() => "?").join(",");
    return executeSQLQueryParameterized(
        `SELECT BATCH_SCHEDULE.*, BATCHES.title AS batch_title, BATCHES.start_date, BATCHES.end_date, BATCHES.active
         FROM BATCH_SCHEDULE
         INNER JOIN BATCHES ON BATCHES.id = BATCH_SCHEDULE.batch_id
         WHERE BATCH_SCHEDULE.batch_id IN (${placeholders})
           AND BATCH_SCHEDULE.weekday = ?
           AND BATCH_SCHEDULE.start_time IS NOT NULL
           AND BATCH_SCHEDULE.end_time IS NOT NULL`,
        [...batch_ids, weekday],
    ).catch((error) => {
        logger.error(`getBatchSchedulesByBatchIdsAndWeekday: ${error}`);
        return [];
    });
}

async function upsertBatchSchedule({ batch_id, days = [] }) {
    try {
        for (const day of days) {
            const weekday = Number(day.weekday);
            const start_time = day.start_time || null;
            const end_time = day.end_time || null;

            await executeSQLQueryParameterized(
                `INSERT INTO BATCH_SCHEDULE (batch_id, weekday, start_time, end_time)
                 VALUES (?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE start_time = VALUES(start_time), end_time = VALUES(end_time)`,
                [batch_id, weekday, start_time, end_time],
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
    upsertBatchSchedule,
};
