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
        `INSERT INTO COURSE_DIALOG_CONTENTS (course_id, content, redirect_url, start_date, end_date, daily, frequency, active, view_index, \`interval\`)
        VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [course_id, content, redirect_url ?? null, start_date, end_date, daily, frequency, active, view_index, interval ?? 0],
    )
        .then((result) => result.insertId)
        .catch((error) => {
            logger.error(`addCourseDialogContent: ${error}`);
            throw error;
        });
}

function updateCourseDialogContentById({
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
        `UPDATE COURSE_DIALOG_CONTENTS
        SET content=?, redirect_url=?, start_date=?, end_date=?, daily=?, frequency=?, active=?, view_index=?, \`interval\`=?
        WHERE id=?`,
        [content, redirect_url ?? null, start_date, end_date, daily, frequency, active, view_index, interval ?? 0, id],
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

function getNonBundleCoursesForPromoDialogAdmin() {
    return executeSQLQueryParameterized(
        `SELECT
            c.id,
            c.title,
            c.category_id,
            cc.title AS category_title
        FROM COURSES c
        LEFT JOIN COURSE_CATEGORIES cc ON cc.id = c.category_id
        WHERE c.is_bundle = FALSE
        ORDER BY cc.view_index ASC, c.view_index ASC, c.id ASC`,
    ).catch((error) => {
        logger.error(`getNonBundleCoursesForPromoDialogAdmin: ${error}`);
        throw error;
    });
}

module.exports = {
    getCourseDialogContentsByCourseId,
    getCourseDialogContentById,
    getEligibleCourseDialogContentsByCourseId,
    getNonBundleCoursesForPromoDialogAdmin,
    addCourseDialogContent,
    updateCourseDialogContentById,
    updateCourseDialogContentViewIndexById,
    deleteCourseDialogContentById,
    addCourseDialogContentView,
};
