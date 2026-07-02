const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

function getExamSubmissionsByUserIdAndExamId({ user_id, exam_id }) {
    return executeSQLQueryParameterized(
        `SELECT id, user_id, exam_id, question_id, submitted_answer, marks
         FROM EXAM_SUBMISSIONS
         WHERE user_id = ? AND exam_id = ?`,
        [user_id, exam_id],
    ).catch((error) => {
        logger.error(`getExamSubmissionsByUserIdAndExamId: ${error}`);
        return [];
    });
}

function userHasExamSubmissions({ user_id, exam_id }) {
    return executeSQLQueryParameterized(`SELECT id FROM EXAM_SUBMISSIONS WHERE user_id = ? AND exam_id = ? LIMIT 1`, [
        user_id,
        exam_id,
    ])
        .then((result) => result.length > 0)
        .catch((error) => {
            logger.error(`userHasExamSubmissions: ${error}`);
            return false;
        });
}

function addExamSubmission({ user_id, exam_id, question_id, submitted_answer, marks }) {
    return executeSQLQueryParameterized(
        `INSERT INTO EXAM_SUBMISSIONS (user_id, exam_id, question_id, submitted_answer, marks) VALUES (?,?,?,?,?)`,
        [user_id, exam_id, question_id, submitted_answer, marks],
    )
        .then((result) => result.insertId)
        .catch((error) => logger.error(`addExamSubmission: ${error}`));
}

function getExamSubmissionsByUserIdAndExamSeriesId({ user_id, exam_series_id }) {
    return executeSQLQueryParameterized(
        `SELECT EXAM_SUBMISSIONS.id,
                EXAM_SUBMISSIONS.user_id,
                EXAM_SUBMISSIONS.exam_id,
                EXAM_SUBMISSIONS.question_id,
                EXAM_SUBMISSIONS.submitted_answer,
                EXAM_SUBMISSIONS.marks,
                EXAM_SUBMISSIONS.created_on
         FROM EXAM_SUBMISSIONS
         INNER JOIN EXAMS ON EXAMS.id = EXAM_SUBMISSIONS.exam_id
         WHERE EXAM_SUBMISSIONS.user_id = ?
           AND EXAMS.exam_series_id = ?
         ORDER BY EXAM_SUBMISSIONS.exam_id ASC, EXAM_SUBMISSIONS.id ASC`,
        [user_id, exam_series_id],
    ).catch((error) => {
        logger.error(`getExamSubmissionsByUserIdAndExamSeriesId: ${error}`);
        return [];
    });
}

function getExamSubmissionMarksByExamSeriesId({ exam_series_id }) {
    return executeSQLQueryParameterized(
        `SELECT EXAM_SUBMISSIONS.user_id,
                USERS.full_name,
                EXAM_SUBMISSIONS.exam_id,
                SUM(EXAM_SUBMISSIONS.marks) AS exam_marks
         FROM EXAM_SUBMISSIONS
         INNER JOIN EXAMS ON EXAMS.id = EXAM_SUBMISSIONS.exam_id
         INNER JOIN USERS ON USERS.id = EXAM_SUBMISSIONS.user_id
         WHERE EXAMS.exam_series_id = ?
         GROUP BY EXAM_SUBMISSIONS.user_id, USERS.full_name, EXAM_SUBMISSIONS.exam_id`,
        [exam_series_id],
    ).catch((error) => {
        logger.error(`getExamSubmissionMarksByExamSeriesId: ${error}`);
        return [];
    });
}

module.exports = {
    getExamSubmissionsByUserIdAndExamId,
    userHasExamSubmissions,
    addExamSubmission,
    getExamSubmissionsByUserIdAndExamSeriesId,
    getExamSubmissionMarksByExamSeriesId,
};
