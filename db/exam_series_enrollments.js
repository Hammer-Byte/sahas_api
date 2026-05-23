const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

function addExamSeriesEnrollment({ user_id, exam_series_id }) {
    return executeSQLQueryParameterized(`INSERT INTO EXAM_SERIES_ENROLLMENTS (user_id, exam_series_id) VALUES (?,?)`, [
        user_id,
        exam_series_id,
    ])
        .then((result) => result.insertId)
        .catch((error) => logger.error(`addExamSeriesEnrollment: ${error}`));
}

function getExamSeriesEnrollmentByUserIdAndExamSeriesId({ user_id, exam_series_id }) {
    return executeSQLQueryParameterized(`SELECT * FROM EXAM_SERIES_ENROLLMENTS WHERE user_id = ? AND exam_series_id = ?`, [
        user_id,
        exam_series_id,
    ])
        .then((result) => (result.length > 0 ? result[0] : false))
        .catch((error) => logger.error(`getExamSeriesEnrollmentByUserIdAndExamSeriesId: ${error}`));
}

function getExamSeriesEnrollmentsByExamSeriesId({ exam_series_id }) {
    return executeSQLQueryParameterized(
        `SELECT EXAM_SERIES_ENROLLMENTS.id,
                EXAM_SERIES_ENROLLMENTS.user_id,
                EXAM_SERIES_ENROLLMENTS.exam_series_id,
                EXAM_SERIES_ENROLLMENTS.created_on,
                USERS.full_name,
                USERS.email,
                USERS.phone
         FROM EXAM_SERIES_ENROLLMENTS
         INNER JOIN USERS ON USERS.id = EXAM_SERIES_ENROLLMENTS.user_id
         WHERE EXAM_SERIES_ENROLLMENTS.exam_series_id = ?
         ORDER BY EXAM_SERIES_ENROLLMENTS.created_on DESC`,
        [exam_series_id],
    ).catch((error) => {
        logger.error(`getExamSeriesEnrollmentsByExamSeriesId: ${error}`);
        return [];
    });
}

function userHasExamAccessViaSeriesEnrollment({ user_id, exam_id }) {
    return executeSQLQueryParameterized(
        `SELECT EXAM_SERIES_ENROLLMENTS.id
         FROM EXAM_SERIES_ENROLLMENTS
         INNER JOIN EXAMS ON EXAMS.exam_series_id = EXAM_SERIES_ENROLLMENTS.exam_series_id
         WHERE EXAM_SERIES_ENROLLMENTS.user_id = ?
           AND EXAMS.id = ?
         LIMIT 1`,
        [user_id, exam_id],
    )
        .then((result) => result.length > 0)
        .catch((error) => {
            logger.error(`userHasExamAccessViaSeriesEnrollment: ${error}`);
            return false;
        });
}

module.exports = {
    addExamSeriesEnrollment,
    getExamSeriesEnrollmentByUserIdAndExamSeriesId,
    getExamSeriesEnrollmentsByExamSeriesId,
    userHasExamAccessViaSeriesEnrollment,
};
