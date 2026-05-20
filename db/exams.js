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

module.exports = {
    getAllExams,
    getExamById,
};
