const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

const BATCH_TEST_SELECT = `SELECT BATCH_TESTS.*,
            SUBJECTS.title AS subject_title,
            CREATOR.full_name AS created_by_full_name,
            (SELECT COUNT(*) FROM BATCH_USERS WHERE BATCH_USERS.batch_id = BATCH_TESTS.batch_id) AS student_count,
            (SELECT COUNT(*) FROM BATCH_TEST_RECORDS WHERE BATCH_TEST_RECORDS.test_id = BATCH_TESTS.id AND BATCH_TEST_RECORDS.attendance_status = 'PRESENT') AS present_count,
            (SELECT COUNT(*) FROM BATCH_TEST_RECORDS WHERE BATCH_TEST_RECORDS.test_id = BATCH_TESTS.id AND BATCH_TEST_RECORDS.attendance_status = 'ABSENT') AS absent_count,
            (SELECT COUNT(*) FROM BATCH_TEST_RECORDS WHERE BATCH_TEST_RECORDS.test_id = BATCH_TESTS.id AND BATCH_TEST_RECORDS.marks_obtained IS NOT NULL) AS marks_entered_count
     FROM BATCH_TESTS
     LEFT JOIN SUBJECTS ON SUBJECTS.id = BATCH_TESTS.subject_id
     LEFT JOIN USERS CREATOR ON CREATOR.id = BATCH_TESTS.created_by`;

function getBatchTestsByBatchId({ batch_id }) {
    return executeSQLQueryParameterized(`${BATCH_TEST_SELECT} WHERE BATCH_TESTS.batch_id = ? ORDER BY BATCH_TESTS.test_date DESC, BATCH_TESTS.id DESC`, [
        batch_id,
    ]).catch((error) => {
        logger.error(`getBatchTestsByBatchId: ${error}`);
        return [];
    });
}

function getBatchTestById({ id }) {
    return executeSQLQueryParameterized(`${BATCH_TEST_SELECT} WHERE BATCH_TESTS.id = ?`, [id])
        .then((result) => (result.length > 0 ? result[0] : false))
        .catch((error) => {
            logger.error(`getBatchTestById: ${error}`);
            return false;
        });
}

function addBatchTest({ batch_id, subject_id, test_date, total_marks, start_time = null, end_time = null, comment = null, created_by = null }) {
    return executeSQLQueryParameterized(
        `INSERT INTO BATCH_TESTS (batch_id, subject_id, test_date, total_marks, start_time, end_time, comment, created_by)
         VALUES (?,?,?,?,?,?,?,?)`,
        [batch_id, subject_id, test_date, total_marks, start_time, end_time, comment, created_by],
    )
        .then((result) => result.insertId)
        .catch((error) => logger.error(`addBatchTest: ${error}`));
}

function updateBatchTestById({ id, subject_id, test_date, total_marks, start_time = null, end_time = null, comment = null }) {
    return executeSQLQueryParameterized(
        `UPDATE BATCH_TESTS
         SET subject_id=?, test_date=?, total_marks=?, start_time=?, end_time=?, comment=?
         WHERE id=?`,
        [subject_id, test_date, total_marks, start_time, end_time, comment, id],
    ).catch((error) => logger.error(`updateBatchTestById: ${error}`));
}

function deleteBatchTestById({ id }) {
    return executeSQLQueryParameterized(`DELETE FROM BATCH_TEST_PAPERS WHERE test_id=?`, [id])
        .then(() => executeSQLQueryParameterized(`DELETE FROM BATCH_TEST_RECORDS WHERE test_id=?`, [id]))
        .then(() => executeSQLQueryParameterized(`DELETE FROM BATCH_TEST_SUPERVISORS WHERE test_id=?`, [id]))
        .then(() => executeSQLQueryParameterized(`DELETE FROM BATCH_TESTS WHERE id=?`, [id]))
        .catch((error) => logger.error(`deleteBatchTestById: ${error}`));
}

function getBatchTestSupervisors({ test_id }) {
    return executeSQLQueryParameterized(
        `SELECT BATCH_TEST_SUPERVISORS.id, BATCH_TEST_SUPERVISORS.test_id, BATCH_TEST_SUPERVISORS.user_id,
                BATCH_TEST_SUPERVISORS.created_on, USERS.full_name, USERS.email, USERS.phone
         FROM BATCH_TEST_SUPERVISORS
         INNER JOIN USERS ON USERS.id = BATCH_TEST_SUPERVISORS.user_id
         WHERE BATCH_TEST_SUPERVISORS.test_id = ?
         ORDER BY USERS.full_name ASC`,
        [test_id],
    ).catch((error) => {
        logger.error(`getBatchTestSupervisors: ${error}`);
        return [];
    });
}

function deleteBatchTestSupervisorsByTestId({ test_id }) {
    return executeSQLQueryParameterized(`DELETE FROM BATCH_TEST_SUPERVISORS WHERE test_id=?`, [test_id]).catch((error) =>
        logger.error(`deleteBatchTestSupervisorsByTestId: ${error}`),
    );
}

function addBatchTestSupervisor({ test_id, user_id, created_by = null }) {
    return executeSQLQueryParameterized(`INSERT INTO BATCH_TEST_SUPERVISORS (test_id, user_id, created_by) VALUES (?,?,?)`, [
        test_id,
        user_id,
        created_by,
    ])
        .then((result) => result.insertId)
        .catch((error) => logger.error(`addBatchTestSupervisor: ${error}`));
}

async function setBatchTestSupervisors({ test_id, user_ids = [], created_by = null }) {
    await deleteBatchTestSupervisorsByTestId({ test_id });
    const uniqueIds = [...new Set((user_ids || []).map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0))];
    for (const user_id of uniqueIds) {
        await addBatchTestSupervisor({ test_id, user_id, created_by });
    }
    return getBatchTestSupervisors({ test_id });
}

function isBatchTestSupervisor({ test_id, user_id }) {
    return executeSQLQueryParameterized(`SELECT id FROM BATCH_TEST_SUPERVISORS WHERE test_id = ? AND user_id = ? LIMIT 1`, [test_id, user_id])
        .then((result) => result.length > 0)
        .catch((error) => {
            logger.error(`isBatchTestSupervisor: ${error}`);
            return false;
        });
}

function isUserSupervisorOfAnyBatchTest({ batch_id, user_id }) {
    return executeSQLQueryParameterized(
        `SELECT BATCH_TEST_SUPERVISORS.id
         FROM BATCH_TEST_SUPERVISORS
         INNER JOIN BATCH_TESTS ON BATCH_TESTS.id = BATCH_TEST_SUPERVISORS.test_id
         WHERE BATCH_TESTS.batch_id = ? AND BATCH_TEST_SUPERVISORS.user_id = ?
         LIMIT 1`,
        [batch_id, user_id],
    )
        .then((result) => result.length > 0)
        .catch((error) => {
            logger.error(`isUserSupervisorOfAnyBatchTest: ${error}`);
            return false;
        });
}

function getSupervisedTestIdsByBatchAndUser({ batch_id, user_id }) {
    return executeSQLQueryParameterized(
        `SELECT BATCH_TEST_SUPERVISORS.test_id
         FROM BATCH_TEST_SUPERVISORS
         INNER JOIN BATCH_TESTS ON BATCH_TESTS.id = BATCH_TEST_SUPERVISORS.test_id
         WHERE BATCH_TESTS.batch_id = ? AND BATCH_TEST_SUPERVISORS.user_id = ?`,
        [batch_id, user_id],
    )
        .then((rows) => rows.map((row) => Number(row.test_id)))
        .catch((error) => {
            logger.error(`getSupervisedTestIdsByBatchAndUser: ${error}`);
            return [];
        });
}

function getBatchTestRecords({ test_id, batch_id }) {
    return executeSQLQueryParameterized(
        `SELECT BATCH_USERS.user_id, BATCH_USERS.roll_no, BATCH_USERS.is_left, BATCH_USERS.left_on,
                USERS.full_name, USERS.email, USERS.phone, USERS.active,
                BATCH_TEST_RECORDS.id AS record_id,
                COALESCE(BATCH_TEST_RECORDS.attendance_status, 'ABSENT') AS attendance_status,
                BATCH_TEST_RECORDS.marks_obtained,
                BATCH_TEST_RECORDS.comment
         FROM BATCH_USERS
         INNER JOIN USERS ON USERS.id = BATCH_USERS.user_id
         LEFT JOIN BATCH_TEST_RECORDS
            ON BATCH_TEST_RECORDS.test_id = ? AND BATCH_TEST_RECORDS.user_id = BATCH_USERS.user_id
         WHERE BATCH_USERS.batch_id = ?
         ORDER BY BATCH_USERS.roll_no ASC, BATCH_USERS.id ASC`,
        [test_id, batch_id],
    )
        .then((rows) => (rows || []).map((row) => ({ ...row, is_left: !!row.is_left })))
        .catch((error) => {
            logger.error(`getBatchTestRecords: ${error}`);
            return [];
        });
}

function deleteBatchTestRecordsByTestId({ test_id }) {
    return executeSQLQueryParameterized(`DELETE FROM BATCH_TEST_RECORDS WHERE test_id=?`, [test_id]).catch((error) =>
        logger.error(`deleteBatchTestRecordsByTestId: ${error}`),
    );
}

function addBatchTestRecord({ test_id, user_id, attendance_status, marks_obtained = null, comment = null, created_by = null }) {
    return executeSQLQueryParameterized(
        `INSERT INTO BATCH_TEST_RECORDS (test_id, user_id, attendance_status, marks_obtained, comment, created_by)
         VALUES (?,?,?,?,?,?)`,
        [test_id, user_id, attendance_status, marks_obtained, comment, created_by],
    )
        .then((result) => result.insertId)
        .catch((error) => logger.error(`addBatchTestRecord: ${error}`));
}

async function setBatchTestRecords({ test_id, records = [], created_by = null }) {
    await deleteBatchTestRecordsByTestId({ test_id });
    for (const record of records) {
        await addBatchTestRecord({
            test_id,
            user_id: record.user_id,
            attendance_status: record.attendance_status,
            marks_obtained: record.marks_obtained,
            comment: record.comment,
            created_by,
        });
    }
}

function getBatchTestPapers({ test_id }) {
    return executeSQLQueryParameterized(
        `SELECT BATCH_TEST_PAPERS.*, USERS.full_name AS created_by_full_name
         FROM BATCH_TEST_PAPERS
         LEFT JOIN USERS ON USERS.id = BATCH_TEST_PAPERS.created_by
         WHERE BATCH_TEST_PAPERS.test_id = ?
         ORDER BY FIELD(BATCH_TEST_PAPERS.paper_type, 'PAPER', 'SOLUTION', 'TOPPERS')`,
        [test_id],
    ).catch((error) => {
        logger.error(`getBatchTestPapers: ${error}`);
        return [];
    });
}

function upsertBatchTestPaper({ test_id, paper_type, file_path, created_by = null }) {
    return executeSQLQueryParameterized(
        `INSERT INTO BATCH_TEST_PAPERS (test_id, paper_type, file_path, created_by)
         VALUES (?,?,?,?)
         ON DUPLICATE KEY UPDATE file_path=VALUES(file_path), created_by=VALUES(created_by)`,
        [test_id, paper_type, file_path, created_by],
    ).catch((error) => logger.error(`upsertBatchTestPaper: ${error}`));
}

function deleteBatchTestPaper({ test_id, paper_type }) {
    return executeSQLQueryParameterized(`DELETE FROM BATCH_TEST_PAPERS WHERE test_id=? AND paper_type=?`, [test_id, paper_type]).catch((error) =>
        logger.error(`deleteBatchTestPaper: ${error}`),
    );
}

async function getBatchTestDetail({ id }) {
    const test = await getBatchTestById({ id });
    if (!test) {
        return false;
    }

    const [supervisors, records, papers] = await Promise.all([
        getBatchTestSupervisors({ test_id: id }),
        getBatchTestRecords({ test_id: id, batch_id: test.batch_id }),
        getBatchTestPapers({ test_id: id }),
    ]);

    return { ...test, supervisors, records, papers };
}

module.exports = {
    getBatchTestsByBatchId,
    getBatchTestById,
    addBatchTest,
    updateBatchTestById,
    deleteBatchTestById,
    getBatchTestSupervisors,
    setBatchTestSupervisors,
    isBatchTestSupervisor,
    isUserSupervisorOfAnyBatchTest,
    getSupervisedTestIdsByBatchAndUser,
    getBatchTestRecords,
    setBatchTestRecords,
    getBatchTestPapers,
    upsertBatchTestPaper,
    deleteBatchTestPaper,
    getBatchTestDetail,
};
