const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

function getExamDialogContentsByCourseId({ course_id }) {
    return executeSQLQueryParameterized(
        `SELECT * FROM EXAM_DIALOG_CONTENTS WHERE course_id=? ORDER BY view_index ASC, id ASC`,
        [course_id],
    ).catch((error) => {
        logger.error(`getExamDialogContentsByCourseId: ${error}`);
        return [];
    });
}

function getExamDialogContentById({ id }) {
    return executeSQLQueryParameterized(`SELECT * FROM EXAM_DIALOG_CONTENTS WHERE id=?`, [id])
        .then((result) => (result.length > 0 ? result[0] : false))
        .catch((error) => {
            logger.error(`getExamDialogContentById: ${error}`);
            return false;
        });
}

function getEligibleExamDialogContentsByCourseId({ course_id, user_id }) {
    return executeSQLQueryParameterized(
        `SELECT c.*
        FROM EXAM_DIALOG_CONTENTS c
        WHERE c.course_id = ?
          AND c.active = TRUE
          AND CURDATE() BETWEEN c.start_date AND c.end_date
          AND (
            SELECT COUNT(*)
            FROM EXAM_DIALOG_CONTENT_VIEWS v
            WHERE v.user_id = ?
              AND v.content_id = c.id
              AND (c.daily = FALSE OR DATE(v.created_at) = CURDATE())
          ) < c.frequency
        ORDER BY c.view_index ASC, c.id ASC`,
        [course_id, user_id],
    ).catch((error) => {
        logger.error(`getEligibleExamDialogContentsByCourseId: ${error}`);
        return [];
    });
}

function addExamDialogContent({
    course_id,
    content,
    redirect_url = null,
    start_date,
    end_date,
    daily = false,
    frequency,
    active = true,
    view_index = 0,
    interval = 0,
}) {
    return executeSQLQueryParameterized(
        `INSERT INTO EXAM_DIALOG_CONTENTS (course_id, content, redirect_url, start_date, end_date, daily, frequency, active, view_index, \`interval\`)
        VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [course_id, content, redirect_url ?? null, start_date, end_date, daily, frequency, active, view_index, interval ?? 0],
    )
        .then((result) => result.insertId)
        .catch((error) => {
            logger.error(`addExamDialogContent: ${error}`);
            throw error;
        });
}

function updateExamDialogContentById({
    id,
    content,
    redirect_url = null,
    start_date,
    end_date,
    daily,
    frequency,
    active,
    view_index,
    interval = 0,
}) {
    return executeSQLQueryParameterized(
        `UPDATE EXAM_DIALOG_CONTENTS
        SET content=?, redirect_url=?, start_date=?, end_date=?, daily=?, frequency=?, active=?, view_index=?, \`interval\`=?
        WHERE id=?`,
        [content, redirect_url ?? null, start_date, end_date, daily, frequency, active, view_index, interval ?? 0, id],
    ).catch((error) => logger.error(`updateExamDialogContentById: ${error}`));
}

function deleteExamDialogContentViewsByContentId({ content_id }) {
    return executeSQLQueryParameterized(`DELETE FROM EXAM_DIALOG_CONTENT_VIEWS WHERE content_id=?`, [content_id]).catch((error) =>
        logger.error(`deleteExamDialogContentViewsByContentId: ${error}`),
    );
}

function deleteExamDialogContentById({ id }) {
    return deleteExamDialogContentViewsByContentId({ content_id: id })
        .then(() => executeSQLQueryParameterized(`DELETE FROM EXAM_DIALOG_CONTENTS WHERE id=?`, [id]))
        .catch((error) => logger.error(`deleteExamDialogContentById: ${error}`));
}

function addExamDialogContentView({ user_id, content_id }) {
    return executeSQLQueryParameterized(`INSERT INTO EXAM_DIALOG_CONTENT_VIEWS (user_id, content_id) VALUES (?,?)`, [user_id, content_id])
        .then((result) => result.insertId)
        .catch((error) => logger.error(`addExamDialogContentView: ${error}`));
}

function updateExamDialogContentViewIndexById({ id, view_index }) {
    return executeSQLQueryParameterized(`UPDATE EXAM_DIALOG_CONTENTS SET view_index=? WHERE id=?`, [view_index, id]).catch((error) =>
        logger.error(`updateExamDialogContentViewIndexById: ${error}`),
    );
}

module.exports = {
    getExamDialogContentsByCourseId,
    getExamDialogContentById,
    getEligibleExamDialogContentsByCourseId,
    addExamDialogContent,
    updateExamDialogContentById,
    updateExamDialogContentViewIndexById,
    deleteExamDialogContentById,
    addExamDialogContentView,
};
