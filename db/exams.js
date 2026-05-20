const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

function getAllExams() {
    return executeSQLQueryParameterized(
        `SELECT EXAMS.*, COURSES.title AS course_title
         FROM EXAMS
         INNER JOIN COURSES ON COURSES.id = EXAMS.course_id
         ORDER BY EXAMS.start_at DESC`,
    ).catch((error) => {
        logger.error(`getAllExams: ${error}`);
        return [];
    });
}

function getExamById({ id }) {
    return executeSQLQueryParameterized(
        `SELECT EXAMS.*, COURSES.title AS course_title
         FROM EXAMS
         INNER JOIN COURSES ON COURSES.id = EXAMS.course_id
         WHERE EXAMS.id = ?`,
        [id],
    )
        .then((result) => (result.length > 0 ? result[0] : false))
        .catch((error) => logger.error(`getExamById: ${error}`));
}

function getExamByTitle({ title }) {
    return executeSQLQueryParameterized(`SELECT id FROM EXAMS WHERE title=?`, [title])
        .then((result) => (result.length > 0 ? result[0] : false))
        .catch((error) => logger.error(`getExamByTitle: ${error}`));
}

function addExam({ title, course_id, fees, start_at, end_at, active }) {
    return executeSQLQueryParameterized(`INSERT INTO EXAMS (title, course_id, fees, start_at, end_at, active) VALUES (?,?,?,?,?,?)`, [
        title,
        course_id,
        fees,
        start_at,
        end_at,
        active,
    ])
        .then((result) => result.insertId)
        .catch((error) => logger.error(`addExam: ${error}`));
}

function updateExamById({ id, title, course_id, fees, start_at, end_at, active }) {
    return executeSQLQueryParameterized(
        "UPDATE EXAMS SET title=?, course_id=?, fees=?, start_at=?, end_at=?, active=? WHERE id=?",
        [title, course_id, fees, start_at, end_at, active, id],
    ).catch((error) => logger.error(`updateExamById: ${error}`));
}

module.exports = {
    getAllExams,
    getExamById,
    getExamByTitle,
    addExam,
    updateExamById,
};
