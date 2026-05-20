const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

function getExamQuestionsByExamId({ exam_id }) {
    return executeSQLQueryParameterized(`SELECT * FROM EXAM_QUESTIONS WHERE exam_id=? ORDER BY id ASC`, [exam_id]).catch((error) => {
        logger.error(`getExamQuestionsByExamId: ${error}`);
        return [];
    });
}

function getExamQuestionById({ id }) {
    return executeSQLQueryParameterized(`SELECT * FROM EXAM_QUESTIONS WHERE id=?`, [id])
        .then((result) => (result.length > 0 ? result[0] : false))
        .catch((error) => logger.error(`getExamQuestionById: ${error}`));
}

function addExamQuestion({
    exam_id,
    question,
    choice_one,
    choice_two,
    choice_three,
    choice_four,
    correct_choice,
    media_url = null,
    created_by = null,
}) {
    return executeSQLQueryParameterized(
        `INSERT INTO EXAM_QUESTIONS (exam_id, question, choice_one, choice_two, choice_three, choice_four, correct_choice, media_url, created_by, updated_by)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [exam_id, question, choice_one, choice_two, choice_three, choice_four, correct_choice, media_url, created_by, created_by],
    )
        .then((result) => result.insertId)
        .catch((error) => logger.error(`addExamQuestion: ${error}`));
}

function updateExamQuestionById({
    id,
    question,
    choice_one,
    choice_two,
    choice_three,
    choice_four,
    correct_choice,
    media_url = null,
    updated_by = null,
}) {
    return executeSQLQueryParameterized(
        `UPDATE EXAM_QUESTIONS
         SET question=?, choice_one=?, choice_two=?, choice_three=?, choice_four=?, correct_choice=?, media_url=?, updated_by=?
         WHERE id=?`,
        [question, choice_one, choice_two, choice_three, choice_four, correct_choice, media_url, updated_by, id],
    ).catch((error) => logger.error(`updateExamQuestionById: ${error}`));
}

function deleteExamQuestionById({ id }) {
    return executeSQLQueryParameterized("DELETE FROM EXAM_QUESTIONS WHERE id=?", [id]).catch((error) => logger.error(`deleteExamQuestionById: ${error}`));
}

module.exports = {
    getExamQuestionsByExamId,
    getExamQuestionById,
    addExamQuestion,
    updateExamQuestionById,
    deleteExamQuestionById,
};
