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

function getExamSeriesEnrollmentById({ id }) {
    return executeSQLQueryParameterized(`SELECT * FROM EXAM_SERIES_ENROLLMENTS WHERE id = ?`, [id])
        .then((result) => (result.length > 0 ? result[0] : false))
        .catch((error) => {
            logger.error(`getExamSeriesEnrollmentById: ${error}`);
            return false;
        });
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

function deleteExamSeriesEnrollmentById({ id }) {
    return executeSQLQueryParameterized(`DELETE FROM EXAM_SERIES_ENROLLMENTS WHERE id=?`, [id]).catch((error) =>
        logger.error(`deleteExamSeriesEnrollmentById: ${error}`),
    );
}

function getGivenExamSeriesByUserId({ user_id }) {
    return executeSQLQueryParameterized(
        `SELECT EXAM_SERIES.id,
                EXAM_SERIES.title,
                EXAM_SERIES.course_id,
                EXAM_SERIES.fees,
                EXAM_SERIES.start_at,
                EXAM_SERIES.end_at,
                EXAM_SERIES.active,
                COURSES.title AS course_title,
                EXAM_SERIES_ENROLLMENTS.created_on AS enrolled_at,
                COUNT(DISTINCT EXAM_SUBMISSIONS.exam_id) AS exams_attempted,
                COALESCE(SUM(EXAM_SUBMISSIONS.marks), 0) AS total_marks
         FROM EXAM_SERIES_ENROLLMENTS
         INNER JOIN EXAM_SERIES ON EXAM_SERIES.id = EXAM_SERIES_ENROLLMENTS.exam_series_id
         INNER JOIN COURSES ON COURSES.id = EXAM_SERIES.course_id
         INNER JOIN EXAMS ON EXAMS.exam_series_id = EXAM_SERIES.id
         INNER JOIN EXAM_SUBMISSIONS ON EXAM_SUBMISSIONS.exam_id = EXAMS.id
            AND EXAM_SUBMISSIONS.user_id = EXAM_SERIES_ENROLLMENTS.user_id
         WHERE EXAM_SERIES_ENROLLMENTS.user_id = ?
         GROUP BY EXAM_SERIES.id,
                  EXAM_SERIES.title,
                  EXAM_SERIES.course_id,
                  EXAM_SERIES.fees,
                  EXAM_SERIES.start_at,
                  EXAM_SERIES.end_at,
                  EXAM_SERIES.active,
                  COURSES.title,
                  EXAM_SERIES_ENROLLMENTS.created_on
         ORDER BY EXAM_SERIES.end_at DESC, EXAM_SERIES.id DESC`,
        [user_id],
    ).catch((error) => {
        logger.error(`getGivenExamSeriesByUserId: ${error}`);
        return [];
    });
}

module.exports = {
    addExamSeriesEnrollment,
    getExamSeriesEnrollmentById,
    getExamSeriesEnrollmentByUserIdAndExamSeriesId,
    getExamSeriesEnrollmentsByExamSeriesId,
    deleteExamSeriesEnrollmentById,
    userHasExamAccessViaSeriesEnrollment,
    getGivenExamSeriesByUserId,
};
