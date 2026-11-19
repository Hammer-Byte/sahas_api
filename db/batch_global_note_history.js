const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

function addBatchGlobalNoteHistory({ batch_id, note, type = null, attachment = null, created_by = null, user_ids = [] }) {
    return executeSQLQueryParameterized(
        `INSERT INTO BATCH_GLOBAL_NOTE_HISTORY (batch_id, note, type, attachment, created_by)
         VALUES (?, ?, ?, ?, ?)`,
        [batch_id, note, type, attachment, created_by],
    )
        .then(async (result) => {
            const history_id = result.insertId;
            if (!history_id) {
                return false;
            }

            for (const user_id of user_ids) {
                await executeSQLQueryParameterized(
                    `INSERT INTO BATCH_GLOBAL_NOTE_HISTORY_USERS (history_id, user_id) VALUES (?, ?)`,
                    [history_id, user_id],
                );
            }

            return history_id;
        })
        .catch((error) => {
            logger.error(`addBatchGlobalNoteHistory: ${error}`);
            return false;
        });
}

function getBatchGlobalNoteHistoryStudents({ history_id }) {
    return executeSQLQueryParameterized(
        `SELECT USERS.id AS user_id, USERS.full_name, USERS.email, USERS.phone
         FROM BATCH_GLOBAL_NOTE_HISTORY_USERS
         INNER JOIN USERS ON USERS.id = BATCH_GLOBAL_NOTE_HISTORY_USERS.user_id
         WHERE BATCH_GLOBAL_NOTE_HISTORY_USERS.history_id = ?
         ORDER BY USERS.full_name ASC, USERS.id ASC`,
        [history_id],
    ).catch((error) => {
        logger.error(`getBatchGlobalNoteHistoryStudents: ${error}`);
        return [];
    });
}

function getBatchGlobalNoteHistoryUserIds({ history_id }) {
    return getBatchGlobalNoteHistoryStudents({ history_id }).then((rows) => rows.map((row) => row.user_id));
}

function getBatchGlobalNoteHistoryByBatchId({ batch_id }) {
    return executeSQLQueryParameterized(
        `SELECT BATCH_GLOBAL_NOTE_HISTORY.*, USERS.full_name AS created_by_full_name
         FROM BATCH_GLOBAL_NOTE_HISTORY
         LEFT JOIN USERS ON USERS.id = BATCH_GLOBAL_NOTE_HISTORY.created_by
         WHERE BATCH_GLOBAL_NOTE_HISTORY.batch_id = ?
         ORDER BY BATCH_GLOBAL_NOTE_HISTORY.id DESC`,
        [batch_id],
    )
        .then(async (rows) => {
            for (const row of rows) {
                row.students = await getBatchGlobalNoteHistoryStudents({ history_id: row.id });
                row.user_ids = row.students.map((student) => student.user_id);
                row.student_count = row.students.length;
            }
            return rows;
        })
        .catch((error) => {
            logger.error(`getBatchGlobalNoteHistoryByBatchId: ${error}`);
            return [];
        });
}

function getBatchGlobalNoteHistoryById({ id }) {
    return executeSQLQueryParameterized(
        `SELECT BATCH_GLOBAL_NOTE_HISTORY.*, USERS.full_name AS created_by_full_name
         FROM BATCH_GLOBAL_NOTE_HISTORY
         LEFT JOIN USERS ON USERS.id = BATCH_GLOBAL_NOTE_HISTORY.created_by
         WHERE BATCH_GLOBAL_NOTE_HISTORY.id = ?`,
        [id],
    )
        .then(async (rows) => {
            if (!rows?.length) return false;
            const row = rows[0];
            row.students = await getBatchGlobalNoteHistoryStudents({ history_id: row.id });
            row.user_ids = row.students.map((student) => student.user_id);
            row.student_count = row.students.length;
            return row;
        })
        .catch((error) => {
            logger.error(`getBatchGlobalNoteHistoryById: ${error}`);
            return false;
        });
}

function deleteBatchGlobalNoteHistoryByBatchId({ batch_id }) {
    return executeSQLQueryParameterized(`SELECT id FROM BATCH_GLOBAL_NOTE_HISTORY WHERE batch_id = ?`, [batch_id])
        .then(async (rows) => {
            for (const row of rows) {
                await executeSQLQueryParameterized(`DELETE FROM BATCH_GLOBAL_NOTE_HISTORY_USERS WHERE history_id = ?`, [row.id]);
            }
            await executeSQLQueryParameterized(`DELETE FROM BATCH_GLOBAL_NOTE_HISTORY WHERE batch_id = ?`, [batch_id]);
            return true;
        })
        .catch((error) => {
            logger.error(`deleteBatchGlobalNoteHistoryByBatchId: ${error}`);
            return false;
        });
}

module.exports = {
    addBatchGlobalNoteHistory,
    getBatchGlobalNoteHistoryByBatchId,
    getBatchGlobalNoteHistoryById,
    getBatchGlobalNoteHistoryStudents,
    getBatchGlobalNoteHistoryUserIds,
    deleteBatchGlobalNoteHistoryByBatchId,
};
