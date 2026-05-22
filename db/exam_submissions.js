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
        [user_id, exam_id, question_id, submitted_answer, marks ? 1 : 0],
    )
        .then((result) => result.insertId)
        .catch((error) => logger.error(`addExamSubmission: ${error}`));
}

module.exports = {
    getExamSubmissionsByUserIdAndExamId,
    userHasExamSubmissions,
    addExamSubmission,
};
