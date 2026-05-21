const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

function getExamSeriesByCourseId({ course_id }) {
    return executeSQLQueryParameterized(
        `SELECT EXAM_SERIES.*, COURSES.title AS course_title
         FROM EXAM_SERIES
         INNER JOIN COURSES ON COURSES.id = EXAM_SERIES.course_id
         WHERE EXAM_SERIES.course_id = ?
           AND EXAM_SERIES.active = TRUE
         ORDER BY EXAM_SERIES.start_at DESC`,
        [course_id],
    ).catch((error) => {
        logger.error(`getExamSeriesByCourseId: ${error}`);
        return [];
    });
}

function getAllExamSeries() {
    return executeSQLQueryParameterized(
        `SELECT EXAM_SERIES.*, COURSES.title AS course_title
         FROM EXAM_SERIES
         INNER JOIN COURSES ON COURSES.id = EXAM_SERIES.course_id
         ORDER BY EXAM_SERIES.start_at DESC`,
    ).catch((error) => {
        logger.error(`getAllExamSeries: ${error}`);
        return [];
    });
}

function getExamSeriesById({ id }) {
    return executeSQLQueryParameterized(
        `SELECT EXAM_SERIES.*, COURSES.title AS course_title
         FROM EXAM_SERIES
         INNER JOIN COURSES ON COURSES.id = EXAM_SERIES.course_id
         WHERE EXAM_SERIES.id = ?`,
        [id],
    )
        .then((result) => (result.length > 0 ? result[0] : false))
        .catch((error) => logger.error(`getExamSeriesById: ${error}`));
}

function getExamSeriesByTitle({ title }) {
    return executeSQLQueryParameterized(`SELECT id FROM EXAM_SERIES WHERE title=?`, [title])
        .then((result) => (result.length > 0 ? result[0] : false))
        .catch((error) => logger.error(`getExamSeriesByTitle: ${error}`));
}

function addExamSeries({ title, course_id, fees, start_at, end_at, active }) {
    return executeSQLQueryParameterized(
        `INSERT INTO EXAM_SERIES (title, course_id, fees, start_at, end_at, active) VALUES (?,?,?,?,?,?)`,
        [title, course_id, fees, start_at, end_at, active],
    )
        .then((result) => result.insertId)
        .catch((error) => logger.error(`addExamSeries: ${error}`));
}

function updateExamSeriesById({ id, title, course_id, fees, start_at, end_at, active }) {
    return executeSQLQueryParameterized(
        "UPDATE EXAM_SERIES SET title=?, course_id=?, fees=?, start_at=?, end_at=?, active=? WHERE id=?",
        [title, course_id, fees, start_at, end_at, active, id],
    ).catch((error) => logger.error(`updateExamSeriesById: ${error}`));
}

module.exports = {
    getExamSeriesByCourseId,
    getAllExamSeries,
    getExamSeriesById,
    getExamSeriesByTitle,
    addExamSeries,
    updateExamSeriesById,
};
