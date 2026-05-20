const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

function getExamsByExamSeriesId({ exam_series_id }) {
    return executeSQLQueryParameterized(
        `SELECT EXAMS.*, SUBJECTS.title AS subject_title
         FROM EXAMS
         INNER JOIN SUBJECTS ON SUBJECTS.id = EXAMS.subject_id
         WHERE EXAMS.exam_series_id = ?
         ORDER BY EXAMS.start_at ASC`,
        [exam_series_id],
    ).catch((error) => {
        logger.error(`getExamsByExamSeriesId: ${error}`);
        return [];
    });
}

function getExamById({ id }) {
    return executeSQLQueryParameterized(
        `SELECT EXAMS.*, SUBJECTS.title AS subject_title
         FROM EXAMS
         INNER JOIN SUBJECTS ON SUBJECTS.id = EXAMS.subject_id
         WHERE EXAMS.id = ?`,
        [id],
    )
        .then((result) => (result.length > 0 ? result[0] : false))
        .catch((error) => logger.error(`getExamById: ${error}`));
}

module.exports = {
    getExamsByExamSeriesId,
    getExamById,
};
