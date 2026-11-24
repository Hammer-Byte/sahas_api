const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

//freeze
function getAllCourses() {
    return executeSQLQueryParameterized(`SELECT * FROM COURSES ORDER BY view_index ASC ,updated_at DESC`).catch((error) => {
        logger.error(`getAllCourses: ${error}`);
        return [];
    });
}

//freeze
function getCoursesByCategoryId({ category_id, include_inactive = false }) {
    const activeClause = include_inactive ? "" : " AND active = TRUE";
    return executeSQLQueryParameterized(
        `SELECT * FROM COURSES WHERE category_id=?${activeClause} ORDER BY view_index ASC ,updated_at DESC`,
        [category_id],
    ).catch((error) => {
        logger.error(`getCoursesByCategoryId: ${error}`);
        return [];
    });
}

//freeze
function addCourse({
    category_id,
    title,
    description,
    image,
    fees,
    whatsapp_group = null,
    view_index,
    is_bundle = false,
    active = false,
}) {
    return executeSQLQueryParameterized(
        `INSERT INTO COURSES(category_id, title, description, image, fees, whatsapp_group, view_index, is_bundle, active) VALUES(?,?,?,?,?,?,?,?,?)`,
        [category_id, title, description, image, fees, whatsapp_group, view_index, is_bundle, !!active],
    )
        .then((result) => result.insertId)
        .catch((error) => {
            logger.error(`addCourse: ${error}`);
        });
}

//freeze
function getCourseByCategoryIdAndTitle({ category_id, title }) {
    return executeSQLQueryParameterized(`SELECT title from COURSES WHERE category_id=? AND title=?`, [category_id, title])
        .then((result) => (result.length > 0 ? result[0] : false))
        .catch((error) => logger.error(`getCourseByCategoryIdAndTitle: ${error}`));
}

//freeze
function getCourseById({ id }) {
    return executeSQLQueryParameterized(`SELECT * FROM COURSES WHERE id=?`, [id])
        .then((result) => (result?.length ? result[0] : false))
        .catch((error) => {
            logger.error(`getCourseById: ${error}`);
        });
}

//freeze
function deleteCourseById({ id }) {
    return executeSQLQueryParameterized(`DELETE FROM COURSES WHERE id=?`, [id]).catch((error) => {
        logger.error(`deleteCourseById: ${error}`);
    });
}

//freeze
function updateCourseViewIndexById({ id, view_index }) {
    return executeSQLQueryParameterized("UPDATE COURSES SET view_index=? WHERE id=?", [view_index, id]).catch((error) =>
        logger.error(`updateCourseViewIndexById: ${error}`),
    );
}

//freeze
function updateCourseById({ id, title, description, image, fees, whatsapp_group = null, is_bundle = false, active = false }) {
    return executeSQLQueryParameterized(
        "UPDATE COURSES SET title=?,description=?,image=?,fees=?,whatsapp_group=?,is_bundle=?,active=? WHERE id=?",
        [title, description, image, fees, whatsapp_group, is_bundle, !!active, id],
    ).catch((error) => logger.error(`updateCourse: ${error}`));
}

module.exports = {
    getAllCourses,
    getCoursesByCategoryId,
    addCourse,
    getCourseById,
    deleteCourseById,
    updateCourseViewIndexById,
    updateCourseById,
    getCourseByCategoryIdAndTitle,
};
