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

module.exports = {
    addExamSeriesEnrollment,
    getExamSeriesEnrollmentByUserIdAndExamSeriesId,
};
