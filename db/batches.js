const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");
const { deleteBatchGlobalNoteHistoryByBatchId } = require("./batch_global_note_history");

function getAllBatches() {
    return executeSQLQueryParameterized(
        `SELECT BATCHES.*, BRANCHES.title AS branch_title
         FROM BATCHES
         LEFT JOIN BRANCHES ON BATCHES.branch_id = BRANCHES.id
         ORDER BY BATCHES.id DESC`,
    ).catch((error) => {
        logger.error(`getAllBatches: ${error}`);
        return [];
    });
}

function getBatchesByBranchId({ branch_id }) {
    return executeSQLQueryParameterized(
        `SELECT BATCHES.*, BRANCHES.title AS branch_title
         FROM BATCHES
         LEFT JOIN BRANCHES ON BATCHES.branch_id = BRANCHES.id
         WHERE BATCHES.branch_id = ?
         ORDER BY BATCHES.id DESC`,
        [branch_id],
    ).catch((error) => {
        logger.error(`getBatchesByBranchId: ${error}`);
        return [];
    });
}

function getBatchesByControllerUserId({ user_id }) {
    return executeSQLQueryParameterized(
        `SELECT DISTINCT BATCHES.*, BRANCHES.title AS branch_title
         FROM BATCHES
         LEFT JOIN BRANCHES ON BATCHES.branch_id = BRANCHES.id
         WHERE BATCHES.id IN (SELECT batch_id FROM BATCH_CONTROLLERS WHERE user_id = ?)
            OR BATCHES.id IN (
                SELECT BATCH_TESTS.batch_id
                FROM BATCH_TESTS
                INNER JOIN BATCH_TEST_SUPERVISORS ON BATCH_TEST_SUPERVISORS.test_id = BATCH_TESTS.id
                WHERE BATCH_TEST_SUPERVISORS.user_id = ?
            )
         ORDER BY BATCHES.id DESC`,
        [user_id, user_id],
    ).catch((error) => {
        logger.error(`getBatchesByControllerUserId: ${error}`);
        return [];
    });
}

function isBatchController({ batch_id, user_id }) {
    return executeSQLQueryParameterized(`SELECT id FROM BATCH_CONTROLLERS WHERE batch_id = ? AND user_id = ?`, [batch_id, user_id])
        .then((result) => result.length > 0)
        .catch((error) => {
            logger.error(`isBatchController: ${error}`);
            return false;
        });
}

function addBatchController({ batch_id, user_id, created_by = null }) {
    return executeSQLQueryParameterized(`INSERT INTO BATCH_CONTROLLERS (batch_id, user_id, created_by) VALUES (?,?,?)`, [
        batch_id,
        user_id,
        created_by,
    ])
        .then((result) => result.insertId)
        .catch((error) => logger.error(`addBatchController: ${error}`));
}

function getBatchControllers({ batch_id }) {
    return executeSQLQueryParameterized(
        `SELECT BATCH_CONTROLLERS.id, BATCH_CONTROLLERS.batch_id, BATCH_CONTROLLERS.user_id, BATCH_CONTROLLERS.created_on,
                USERS.full_name, USERS.email, USERS.phone
         FROM BATCH_CONTROLLERS
         INNER JOIN USERS ON USERS.id = BATCH_CONTROLLERS.user_id
         WHERE BATCH_CONTROLLERS.batch_id = ?
         ORDER BY BATCH_CONTROLLERS.id ASC`,
        [batch_id],
    ).catch((error) => {
        logger.error(`getBatchControllers: ${error}`);
        return [];
    });
}

function deleteBatchController({ batch_id, user_id }) {
    return executeSQLQueryParameterized(`DELETE FROM BATCH_CONTROLLERS WHERE batch_id = ? AND user_id = ?`, [batch_id, user_id])
        .then((result) => result.affectedRows > 0)
        .catch((error) => {
            logger.error(`deleteBatchController: ${error}`);
            return false;
        });
}

function countBatchControllers({ batch_id }) {
    return executeSQLQueryParameterized(`SELECT COUNT(*) AS count FROM BATCH_CONTROLLERS WHERE batch_id = ?`, [batch_id])
        .then((rows) => Number(rows?.[0]?.count) || 0)
        .catch((error) => {
            logger.error(`countBatchControllers: ${error}`);
            return 0;
        });
}

function getBatchById({ id }) {
    return executeSQLQueryParameterized(
        `SELECT BATCHES.*, BRANCHES.title AS branch_title
         FROM BATCHES
         LEFT JOIN BRANCHES ON BATCHES.branch_id = BRANCHES.id
         WHERE BATCHES.id = ?`,
        [id],
    )
        .then((result) => (result.length > 0 ? result[0] : false))
        .catch((error) => {
            logger.error(`getBatchById: ${error}`);
            return false;
        });
}

function addBatch({ title, description = null, branch_id = null, start_date = null, end_date = null, active = true, created_by = null }) {
    return executeSQLQueryParameterized(
        `INSERT INTO BATCHES (title, description, branch_id, start_date, end_date, active, created_by) VALUES (?,?,?,?,?,?,?)`,
        [title, description || null, branch_id || null, start_date || null, end_date || null, active !== false, created_by],
    )
        .then((result) => result.insertId)
        .catch((error) => logger.error(`addBatch: ${error}`));
}

function updateBatchById({ id, title, description = null, branch_id = null, start_date = null, end_date = null, active = true }) {
    return executeSQLQueryParameterized(
        `UPDATE BATCHES SET title=?, description=?, branch_id=?, start_date=?, end_date=?, active=? WHERE id=?`,
        [title, description || null, branch_id || null, start_date || null, end_date || null, !!active, id],
    ).catch((error) => logger.error(`updateBatchById: ${error}`));
}

function deleteBatchById({ id }) {
    return executeSQLQueryParameterized(`DELETE FROM BATCH_ATTENDANCE WHERE batch_id=?`, [id])
        .then(() => deleteBatchGlobalNoteHistoryByBatchId({ batch_id: id }))
        .then(() => executeSQLQueryParameterized(`DELETE FROM BATCH_USERS WHERE batch_id=?`, [id]))
        .then(() => executeSQLQueryParameterized(`DELETE FROM BATCH_CONTROLLERS WHERE batch_id=?`, [id]))
        .then(() => executeSQLQueryParameterized(`DELETE FROM BATCHES WHERE id=?`, [id]))
        .catch((error) => logger.error(`deleteBatchById: ${error}`));
}

function getBatchesByUserId({ user_id }) {
    return executeSQLQueryParameterized(
        `SELECT BATCHES.*, BRANCHES.title AS branch_title, BATCH_USERS.created_on AS assigned_on,
                BATCH_USERS.roll_no
         FROM BATCH_USERS
         INNER JOIN BATCHES ON BATCHES.id = BATCH_USERS.batch_id
         LEFT JOIN BRANCHES ON BATCHES.branch_id = BRANCHES.id
         WHERE BATCH_USERS.user_id = ?
         ORDER BY BATCHES.id DESC`,
        [user_id],
    ).catch((error) => {
        logger.error(`getBatchesByUserId: ${error}`);
        return [];
    });
}

const BATCH_USER_SELECT = `SELECT BATCH_USERS.id, BATCH_USERS.batch_id, BATCH_USERS.user_id, BATCH_USERS.roll_no,
                BATCH_USERS.level_id, BATCH_USERS.incharge_user_id,
                BATCH_USERS.is_left, BATCH_USERS.left_on,
                BATCH_USERS.created_on AS assigned_on,
                USERS.full_name, USERS.email, USERS.phone, USERS.active,
                LEVELS.title AS level_title, LEVELS.color AS level_color,
                INCHARGE.full_name AS incharge_full_name, INCHARGE.email AS incharge_email
         FROM BATCH_USERS
         INNER JOIN USERS ON USERS.id = BATCH_USERS.user_id
         LEFT JOIN LEVELS ON LEVELS.id = BATCH_USERS.level_id
         LEFT JOIN USERS INCHARGE ON INCHARGE.id = BATCH_USERS.incharge_user_id`;

async function getUsersByBatchId({ batch_id }) {
    try {
        const rows = await executeSQLQueryParameterized(
            `${BATCH_USER_SELECT} WHERE BATCH_USERS.batch_id = ? ORDER BY BATCH_USERS.roll_no ASC, BATCH_USERS.id ASC`,
            [batch_id],
        );
        const users = (rows || []).map((row) => ({ ...row, is_left: !!row.is_left }));
        if (!users.length) {
            return users;
        }

        const {
            getCareerInterestsByUserIds,
            getTargetResultsByUserIds,
        } = require("./user_career_goals");
        const userIds = users.map((user) => user.user_id);
        const [interests, targets] = await Promise.all([
            getCareerInterestsByUserIds({ user_ids: userIds }),
            getTargetResultsByUserIds({ user_ids: userIds }),
        ]);

        const interestByUserId = (interests || []).reduce((acc, row) => {
            acc[row.user_id] = row;
            return acc;
        }, {});
        const targetsByUserId = (targets || []).reduce((acc, row) => {
            if (!acc[row.user_id]) {
                acc[row.user_id] = [];
            }
            acc[row.user_id].push(row);
            return acc;
        }, {});

        return users.map((user) => ({
            ...user,
            career_interest: interestByUserId[user.user_id] || null,
            target_results: targetsByUserId[user.user_id] || [],
        }));
    } catch (error) {
        logger.error(`getUsersByBatchId: ${error}`);
        return [];
    }
}

function getNextRollNo({ batch_id }) {
    return executeSQLQueryParameterized(`SELECT COALESCE(MAX(roll_no), 0) + 1 AS next_roll FROM BATCH_USERS WHERE batch_id = ?`, [batch_id])
        .then((result) => Number(result?.[0]?.next_roll) || 1)
        .catch((error) => {
            logger.error(`getNextRollNo: ${error}`);
            return 1;
        });
}

function updateBatchUserRollNoById({ id, roll_no }) {
    return executeSQLQueryParameterized("UPDATE BATCH_USERS SET roll_no=? WHERE id=?", [roll_no, id]).catch((error) =>
        logger.error(`updateBatchUserRollNoById: ${error}`),
    );
}

function updateBatchUserLevelById({ id, level_id = null, incharge_user_id = null }) {
    return executeSQLQueryParameterized("UPDATE BATCH_USERS SET level_id=?, incharge_user_id=? WHERE id=?", [
        level_id,
        incharge_user_id,
        id,
    ]).catch((error) => logger.error(`updateBatchUserLevelById: ${error}`));
}

function updateBatchUserLeftByUserId({ batch_id, user_id, is_left = true }) {
    const left = !!is_left;
    return executeSQLQueryParameterized(
        `UPDATE BATCH_USERS SET is_left=?, left_on=IF(?, CURRENT_TIMESTAMP, NULL) WHERE batch_id=? AND user_id=?`,
        [left, left, batch_id, user_id],
    ).catch((error) => logger.error(`updateBatchUserLeftByUserId: ${error}`));
}

function getBatchUserById({ id }) {
    return executeSQLQueryParameterized(`${BATCH_USER_SELECT} WHERE BATCH_USERS.id = ?`, [id])
        .then((result) => (result.length > 0 ? { ...result[0], is_left: !!result[0].is_left } : false))
        .catch((error) => {
            logger.error(`getBatchUserById: ${error}`);
            return false;
        });
}

function isUserAssignable({ user_id }) {
    return executeSQLQueryParameterized(`SELECT id FROM USERS WHERE id = ?`, [user_id])
        .then((result) => result.length > 0)
        .catch((error) => {
            logger.error(`isUserAssignable: ${error}`);
            return false;
        });
}

function isUserInBatch({ batch_id, user_id }) {
    return executeSQLQueryParameterized(`SELECT id FROM BATCH_USERS WHERE batch_id = ? AND user_id = ?`, [batch_id, user_id])
        .then((result) => (result.length > 0 ? result[0] : false))
        .catch((error) => {
            logger.error(`isUserInBatch: ${error}`);
            return false;
        });
}

function addUserToBatch({ batch_id, user_id, roll_no, created_by = null }) {
    return executeSQLQueryParameterized(`INSERT INTO BATCH_USERS (batch_id, user_id, roll_no, created_by) VALUES (?,?,?,?)`, [
        batch_id,
        user_id,
        roll_no,
        created_by,
    ])
        .then((result) => result.insertId)
        .catch((error) => logger.error(`addUserToBatch: ${error}`));
}

function removeUserFromBatch({ batch_id, user_id }) {
    return executeSQLQueryParameterized(`DELETE FROM BATCH_ATTENDANCE WHERE batch_id=? AND user_id=?`, [batch_id, user_id])
        .then(() => executeSQLQueryParameterized(`DELETE FROM BATCH_USERS WHERE batch_id=? AND user_id=?`, [batch_id, user_id]))
        .catch((error) => logger.error(`removeUserFromBatch: ${error}`));
}

function getBatchAttendanceByDate({ batch_id, attendance_date }) {
    return executeSQLQueryParameterized(
        `SELECT USERS.id AS user_id, USERS.full_name, BATCH_USERS.roll_no,
                BATCH_USERS.is_left, BATCH_USERS.left_on, BATCH_ATTENDANCE.status
         FROM BATCH_USERS
         INNER JOIN USERS ON USERS.id = BATCH_USERS.user_id
         LEFT JOIN BATCH_ATTENDANCE
           ON BATCH_ATTENDANCE.batch_id = BATCH_USERS.batch_id
          AND BATCH_ATTENDANCE.user_id = BATCH_USERS.user_id
          AND BATCH_ATTENDANCE.attendance_date = ?
         WHERE BATCH_USERS.batch_id = ?
         ORDER BY BATCH_USERS.roll_no ASC, BATCH_USERS.id ASC`,
        [attendance_date, batch_id],
    )
        .then((rows) => (rows || []).map((row) => ({ ...row, is_left: !!row.is_left })))
        .catch((error) => {
            logger.error(`getBatchAttendanceByDate: ${error}`);
            return [];
        });
}

function getUserBatchAttendanceByDateRange({ user_id, batch_id, start_date, end_date }) {
    return executeSQLQueryParameterized(
        `SELECT batch_id, user_id, attendance_date, status
         FROM BATCH_ATTENDANCE
         WHERE user_id = ? AND batch_id = ? AND attendance_date BETWEEN ? AND ?
         ORDER BY attendance_date ASC`,
        [user_id, batch_id, start_date, end_date],
    ).catch((error) => {
        logger.error(`getUserBatchAttendanceByDateRange: ${error}`);
        return [];
    });
}

function deleteBatchAttendanceByDate({ batch_id, attendance_date, user_ids = null }) {
    if (Array.isArray(user_ids)) {
        if (!user_ids.length) {
            return Promise.resolve();
        }
        const placeholders = user_ids.map(() => "?").join(",");
        return executeSQLQueryParameterized(
            `DELETE FROM BATCH_ATTENDANCE WHERE batch_id=? AND attendance_date=? AND user_id IN (${placeholders})`,
            [batch_id, attendance_date, ...user_ids],
        ).catch((error) => logger.error(`deleteBatchAttendanceByDate: ${error}`));
    }

    return executeSQLQueryParameterized(`DELETE FROM BATCH_ATTENDANCE WHERE batch_id=? AND attendance_date=?`, [batch_id, attendance_date]).catch((error) =>
        logger.error(`deleteBatchAttendanceByDate: ${error}`),
    );
}

function addBatchAttendanceRecords({ batch_id, attendance_date, records, created_by = null }) {
    if (!records?.length) {
        return Promise.resolve();
    }

    const placeholders = records.map(() => "(?,?,?,?,?)").join(",");
    const parameters = [];

    for (const record of records) {
        parameters.push(batch_id, record.user_id, attendance_date, record.status, created_by);
    }

    return executeSQLQueryParameterized(
        `INSERT INTO BATCH_ATTENDANCE (batch_id, user_id, attendance_date, status, created_by) VALUES ${placeholders}`,
        parameters,
    ).catch((error) => logger.error(`addBatchAttendanceRecords: ${error}`));
}

function getBatchUserIds({ batch_id, include_left = true }) {
    const leftClause = include_left ? "" : " AND is_left = FALSE";
    return executeSQLQueryParameterized(`SELECT user_id FROM BATCH_USERS WHERE batch_id = ?${leftClause}`, [batch_id])
        .then((result) => result.map((row) => row.user_id))
        .catch((error) => {
            logger.error(`getBatchUserIds: ${error}`);
            return [];
        });
}

function getBatchLeftUserIds({ batch_id }) {
    return executeSQLQueryParameterized(`SELECT user_id FROM BATCH_USERS WHERE batch_id = ? AND is_left = TRUE`, [batch_id])
        .then((result) => result.map((row) => Number(row.user_id)))
        .catch((error) => {
            logger.error(`getBatchLeftUserIds: ${error}`);
            return [];
        });
}

function getAssignableBatchesForUser({ user_id }) {
    return executeSQLQueryParameterized(
        `SELECT BATCHES.*, BRANCHES.title AS branch_title
         FROM BATCHES
         LEFT JOIN BRANCHES ON BATCHES.branch_id = BRANCHES.id
         WHERE BATCHES.id NOT IN (SELECT batch_id FROM BATCH_USERS WHERE user_id = ?)
         ORDER BY BATCHES.id DESC`,
        [user_id],
    ).catch((error) => {
        logger.error(`getAssignableBatchesForUser: ${error}`);
        return [];
    });
}

module.exports = {
    getAllBatches,
    getBatchesByBranchId,
    getBatchesByControllerUserId,
    getBatchById,
    addBatch,
    updateBatchById,
    deleteBatchById,
    getBatchesByUserId,
    getUsersByBatchId,
    getBatchUserById,
    getAssignableBatchesForUser,
    isUserAssignable,
    isUserInBatch,
    isBatchController,
    addBatchController,
    getBatchControllers,
    deleteBatchController,
    countBatchControllers,
    getNextRollNo,
    addUserToBatch,
    updateBatchUserRollNoById,
    updateBatchUserLevelById,
    updateBatchUserLeftByUserId,
    removeUserFromBatch,
    getBatchAttendanceByDate,
    getUserBatchAttendanceByDateRange,
    deleteBatchAttendanceByDate,
    addBatchAttendanceRecords,
    getBatchUserIds,
    getBatchLeftUserIds,
};
