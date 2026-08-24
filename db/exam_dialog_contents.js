const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

function getExamDialogContentsBySubjectId({ subject_id }) {
    return executeSQLQueryParameterized(
        `SELECT * FROM EXAM_DIALOG_CONTENTS WHERE subject_id=? ORDER BY view_index ASC, id ASC`,
        [subject_id],
    ).catch((error) => {
        logger.error(`getExamDialogContentsBySubjectId: ${error}`);
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

function getEligibleExamDialogContentsBySubjectId({ subject_id, user_id }) {
    return executeSQLQueryParameterized(
        `SELECT c.*
        FROM EXAM_DIALOG_CONTENTS c
        WHERE c.subject_id = ?
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
        [subject_id, user_id],
    ).catch((error) => {
        logger.error(`getEligibleExamDialogContentsBySubjectId: ${error}`);
        return [];
    });
}

function addExamDialogContent({
    subject_id,
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
        `INSERT INTO EXAM_DIALOG_CONTENTS (subject_id, content, redirect_url, start_date, end_date, daily, frequency, active, view_index, \`interval\`)
        VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [subject_id, content, redirect_url ?? null, start_date, end_date, daily, frequency, active, view_index, interval ?? 0],
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

function getAllSubjectsWithDialogContents() {
    return executeSQLQueryParameterized(
        `SELECT
            s.id,
            s.title,
            s.active,
            dc.id AS content_id,
            dc.content,
            dc.redirect_url,
            dc.start_date,
            dc.end_date,
            dc.daily,
            dc.frequency,
            dc.active AS content_active,
            dc.view_index AS content_view_index,
            dc.\`interval\` AS content_interval,
            dc.created_at,
            dc.updated_at
        FROM SUBJECTS s
        LEFT JOIN EXAM_DIALOG_CONTENTS dc ON dc.subject_id = s.id
        ORDER BY s.title ASC, dc.view_index ASC, dc.id ASC`,
    )
        .then((rows) => {
            const subjectsMap = new Map();

            for (const row of rows) {
                if (!subjectsMap.has(row.id)) {
                    subjectsMap.set(row.id, {
                        id: row.id,
                        title: row.title,
                        active: row.active,
                        dialog_contents: [],
                    });
                }

                if (row.content_id) {
                    subjectsMap.get(row.id).dialog_contents.push({
                        id: row.content_id,
                        subject_id: row.id,
                        content: row.content,
                        redirect_url: row.redirect_url,
                        start_date: row.start_date,
                        end_date: row.end_date,
                        daily: row.daily,
                        frequency: row.frequency,
                        active: row.content_active,
                        view_index: row.content_view_index,
                        interval: row.content_interval,
                        created_at: row.created_at,
                        updated_at: row.updated_at,
                    });
                }
            }

            return Array.from(subjectsMap.values());
        })
        .catch((error) => {
            logger.error(`getAllSubjectsWithDialogContents: ${error}`);
            throw error;
        });
}

module.exports = {
    getExamDialogContentsBySubjectId,
    getExamDialogContentById,
    getEligibleExamDialogContentsBySubjectId,
    getAllSubjectsWithDialogContents,
    addExamDialogContent,
    updateExamDialogContentById,
    updateExamDialogContentViewIndexById,
    deleteExamDialogContentById,
    addExamDialogContentView,
};
