const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

function getExamSeriesResultRowsByUserIdAndExamSeriesId({ user_id, exam_series_id }) {
    return executeSQLQueryParameterized(
        `SELECT EXAMS.id AS exam_id,
                EXAMS.exam_series_id,
                EXAMS.subject_id,
                EXAMS.start_at,
                EXAMS.end_at,
                SUBJECTS.title AS subject_title,
                EXAM_QUESTIONS.id AS question_id,
                EXAM_QUESTIONS.question,
                EXAM_QUESTIONS.correct_choice,
                EXAM_SUBMISSIONS.submitted_answer,
                EXAM_SUBMISSIONS.marks
         FROM EXAMS
         LEFT JOIN SUBJECTS ON SUBJECTS.id = EXAMS.subject_id
         LEFT JOIN EXAM_QUESTIONS ON EXAM_QUESTIONS.exam_id = EXAMS.id
         LEFT JOIN EXAM_SUBMISSIONS ON EXAM_SUBMISSIONS.exam_id = EXAMS.id
            AND EXAM_SUBMISSIONS.question_id = EXAM_QUESTIONS.id
            AND EXAM_SUBMISSIONS.user_id = ?
         WHERE EXAMS.exam_series_id = ?
         ORDER BY EXAMS.start_at ASC, EXAM_QUESTIONS.id ASC`,
        [user_id, exam_series_id],
    ).catch((error) => {
        logger.error(`getExamSeriesResultRowsByUserIdAndExamSeriesId: ${error}`);
        return [];
    });
}

module.exports = {
    getExamSeriesResultRowsByUserIdAndExamSeriesId,
};
