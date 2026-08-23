const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

function getCourseDialogContentsByCourseId({ course_id }) {
    return executeSQLQueryParameterized(
        `SELECT * FROM COURSE_DIALOG_CONTENTS WHERE course_id=? ORDER BY view_index ASC, id ASC`,
        [course_id],
    ).catch((error) => {
        logger.error(`getCourseDialogContentsByCourseId: ${error}`);
        return [];
    });
}

function getCourseDialogContentById({ id }) {
    return executeSQLQueryParameterized(`SELECT * FROM COURSE_DIALOG_CONTENTS WHERE id=?`, [id])
        .then((result) => (result.length > 0 ? result[0] : false))
        .catch((error) => {
            logger.error(`getCourseDialogContentById: ${error}`);
            return false;
        });
}

function getEligibleCourseDialogContentsByCourseId({ course_id, user_id }) {
    return executeSQLQueryParameterized(
        `SELECT c.*
        FROM COURSE_DIALOG_CONTENTS c
        WHERE c.course_id = ?
          AND c.active = TRUE
          AND CURDATE() BETWEEN c.start_date AND c.end_date
          AND (
            SELECT COUNT(*)
            FROM COURSE_DIALOG_CONTENT_VIEWS v
            WHERE v.user_id = ?
              AND v.content_id = c.id
              AND (c.daily = FALSE OR DATE(v.created_at) = CURDATE())
          ) < c.frequency
        ORDER BY c.view_index ASC, c.id ASC`,
        [course_id, user_id],
    ).catch((error) => {
        logger.error(`getEligibleCourseDialogContentsByCourseId: ${error}`);
        return [];
    });
}

function addCourseDialogContent({
    course_id,
    content,
    start_date,
    end_date,
    daily = false,
    frequency,
    active = true,
    view_index = 0,
}) {
    return executeSQLQueryParameterized(
        `INSERT INTO COURSE_DIALOG_CONTENTS (course_id, content, start_date, end_date, daily, frequency, active, view_index)
        VALUES (?,?,?,?,?,?,?,?)`,
        [course_id, content, start_date, end_date, daily, frequency, active, view_index],
    )
        .then((result) => result.insertId)
        .catch((error) => logger.error(`addCourseDialogContent: ${error}`));
}

function updateCourseDialogContentById({
    id,
    content,
    start_date,
    end_date,
    daily,
    frequency,
    active,
    view_index,
}) {
    return executeSQLQueryParameterized(
        `UPDATE COURSE_DIALOG_CONTENTS
        SET content=?, start_date=?, end_date=?, daily=?, frequency=?, active=?, view_index=?
        WHERE id=?`,
        [content, start_date, end_date, daily, frequency, active, view_index, id],
    ).catch((error) => logger.error(`updateCourseDialogContentById: ${error}`));
}

function deleteCourseDialogContentViewsByContentId({ content_id }) {
    return executeSQLQueryParameterized(`DELETE FROM COURSE_DIALOG_CONTENT_VIEWS WHERE content_id=?`, [content_id]).catch((error) =>
        logger.error(`deleteCourseDialogContentViewsByContentId: ${error}`),
    );
}

function deleteCourseDialogContentById({ id }) {
    return deleteCourseDialogContentViewsByContentId({ content_id: id })
        .then(() => executeSQLQueryParameterized(`DELETE FROM COURSE_DIALOG_CONTENTS WHERE id=?`, [id]))
        .catch((error) => logger.error(`deleteCourseDialogContentById: ${error}`));
}

function addCourseDialogContentView({ user_id, content_id }) {
    return executeSQLQueryParameterized(`INSERT INTO COURSE_DIALOG_CONTENT_VIEWS (user_id, content_id) VALUES (?,?)`, [user_id, content_id])
        .then((result) => result.insertId)
        .catch((error) => logger.error(`addCourseDialogContentView: ${error}`));
}

function updateCourseDialogContentViewIndexById({ id, view_index }) {
    return executeSQLQueryParameterized(`UPDATE COURSE_DIALOG_CONTENTS SET view_index=? WHERE id=?`, [view_index, id]).catch((error) =>
        logger.error(`updateCourseDialogContentViewIndexById: ${error}`),
    );
}

function getAllCoursesWithDialogContents() {
    return executeSQLQueryParameterized(
        `SELECT
            c.id,
            c.title,
            c.category_id,
            c.view_index AS course_view_index,
            cc.title AS category_title,
            cc.view_index AS category_view_index,
            dc.id AS content_id,
            dc.content,
            dc.start_date,
            dc.end_date,
            dc.daily,
            dc.frequency,
            dc.active,
            dc.view_index AS content_view_index,
            dc.created_at,
            dc.updated_at
        FROM COURSES c
        LEFT JOIN COURSE_CATEGORIES cc ON cc.id = c.category_id
        LEFT JOIN COURSE_DIALOG_CONTENTS dc ON dc.course_id = c.id
        ORDER BY cc.view_index ASC, c.view_index ASC, dc.view_index ASC, dc.id ASC`,
    )
        .then((rows) => {
            const coursesMap = new Map();

            for (const row of rows) {
                if (!coursesMap.has(row.id)) {
                    coursesMap.set(row.id, {
                        id: row.id,
                        title: row.title,
                        category_id: row.category_id,
                        category_title: row.category_title,
                        dialog_contents: [],
                    });
                }

                if (row.content_id) {
                    coursesMap.get(row.id).dialog_contents.push({
                        id: row.content_id,
                        course_id: row.id,
                        content: row.content,
                        start_date: row.start_date,
                        end_date: row.end_date,
                        daily: row.daily,
                        frequency: row.frequency,
                        active: row.active,
                        view_index: row.content_view_index,
                        created_at: row.created_at,
                        updated_at: row.updated_at,
                    });
                }
            }

            return Array.from(coursesMap.values());
        })
        .catch((error) => {
            logger.error(`getAllCoursesWithDialogContents: ${error}`);
            return [];
        });
}

module.exports = {
    getCourseDialogContentsByCourseId,
    getCourseDialogContentById,
    getEligibleCourseDialogContentsByCourseId,
    getAllCoursesWithDialogContents,
    addCourseDialogContent,
    updateCourseDialogContentById,
    updateCourseDialogContentViewIndexById,
    deleteCourseDialogContentById,
    addCourseDialogContentView,
};
