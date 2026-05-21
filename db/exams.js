const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

function getAvailableExamsByCourseId({ course_id }) {
    return executeSQLQueryParameterized(
        `SELECT EXAMS.*,
                SUBJECTS.title AS subject_title,
                EXAM_SERIES.title AS exam_series_title,
                EXAM_SERIES.start_at AS exam_series_start_at,
                EXAM_SERIES.end_at AS exam_series_end_at
         FROM EXAMS
         INNER JOIN EXAM_SERIES ON EXAM_SERIES.id = EXAMS.exam_series_id
         LEFT JOIN SUBJECTS ON SUBJECTS.id = EXAMS.subject_id
         WHERE EXAM_SERIES.course_id = ?
           AND EXAM_SERIES.active = TRUE
           AND NOW() < EXAM_SERIES.end_at
         ORDER BY EXAMS.start_at ASC`,
        [course_id],
    ).catch((error) => {
        logger.error(`getAvailableExamsByCourseId: ${error}`);
        return [];
    });
}

function getExamsByExamSeriesId({ exam_series_id }) {
    return executeSQLQueryParameterized(
        `SELECT EXAMS.*, SUBJECTS.title AS subject_title
         FROM EXAMS
         LEFT JOIN SUBJECTS ON SUBJECTS.id = EXAMS.subject_id
         WHERE EXAMS.exam_series_id = ?
         ORDER BY EXAMS.start_at ASC`,
        [exam_series_id],
    ).catch((error) => {
        logger.error(`getExamsByExamSeriesId: ${error}`);
        return [];
    });
}

function addExam({ exam_series_id, subject_id, start_at, end_at }) {
    return executeSQLQueryParameterized(
        `INSERT INTO EXAMS (exam_series_id, subject_id, start_at, end_at) VALUES (?,?,?,?)`,
        [exam_series_id, subject_id, start_at, end_at],
    )
        .then((result) => result.insertId)
        .catch((error) => logger.error(`addExam: ${error}`));
}

function deleteExamById({ id }) {
    return executeSQLQueryParameterized("DELETE FROM EXAMS WHERE id=?", [id]).catch((error) => logger.error(`deleteExamById: ${error}`));
}

function updateExamById({ id, subject_id, start_at, end_at }) {
    return executeSQLQueryParameterized("UPDATE EXAMS SET subject_id=?, start_at=?, end_at=? WHERE id=?", [subject_id, start_at, end_at, id]).catch(
        (error) => logger.error(`updateExamById: ${error}`),
    );
}

function getExamById({ id }) {
    return executeSQLQueryParameterized(
        `SELECT EXAMS.*, SUBJECTS.title AS subject_title
         FROM EXAMS
         LEFT JOIN SUBJECTS ON SUBJECTS.id = EXAMS.subject_id
         WHERE EXAMS.id = ?`,
        [id],
    )
        .then((result) => (result.length > 0 ? result[0] : false))
        .catch((error) => logger.error(`getExamById: ${error}`));
}

module.exports = {
    getAvailableExamsByCourseId,
    getExamsByExamSeriesId,
    addExam,
    updateExamById,
    deleteExamById,
    getExamById,
};
