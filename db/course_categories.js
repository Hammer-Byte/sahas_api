const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

//freeze
function getAllCourseCategories() {
    return executeSQLQueryParameterized(`SELECT COURSE_CATEGORIES.*, COUNT(COURSES.id) AS courses_count FROM COURSE_CATEGORIES LEFT JOIN COURSES ON COURSES.category_id = COURSE_CATEGORIES.id GROUP BY COURSE_CATEGORIES.id ORDER BY COURSE_CATEGORIES.view_index;
`).catch((error) => logger.error(`getAllCourseCategories: ${error}`));
}

//freeze
function getCourseCategoryById({ id }) {
    return executeSQLQueryParameterized(
        `SELECT COURSE_CATEGORIES.*, COUNT(COURSES.id) AS courses_count FROM COURSE_CATEGORIES LEFT JOIN COURSES ON COURSES.category_id = COURSE_CATEGORIES.id WHERE COURSE_CATEGORIES.id = ? GROUP BY COURSE_CATEGORIES.id ORDER BY COURSE_CATEGORIES.view_index`,
        [id]
    )
        .then((result) => (result.length > 0 ? result[0] : false))
        .catch((error) => logger.error(`getCourseCategoryById: ${error}`));
}

//freeze
function getCourseCategoryByTitle({ title }) {
    return executeSQLQueryParameterized(`SELECT id, title from COURSE_CATEGORIES WHERE title=?`, [title])
        .then((result) => (result.length > 0 ? result[0] : false))
        .catch((error) => logger.error(`getCourseCategoryByTitle: ${error}`));
}

//freeze
function addCourseCategory({ title, image, view_index }) {
    return executeSQLQueryParameterized(`INSERT INTO COURSE_CATEGORIES(title,image,view_index) VALUES(?,?,?)`, [title, image, view_index])
        .then((result) => result.insertId)
        .catch((error) => logger.error(`addCourseCategory: ${error}`));
}

//freeze
function deleteCourseCategoryById({ id }) {
    return executeSQLQueryParameterized("DELETE FROM COURSE_CATEGORIES WHERE id=?", [id]).catch((error) => {
        logger.error(`deleteCourseCategoryById: ${error}`);
    });
}

function getCourseCategoryByTitleAndNotId({ title, id }) {
    return executeSQLQueryParameterized(`SELECT id, title from COURSE_CATEGORIES WHERE title=? AND id!=?`, [title, id])
        .then((result) => (result.length > 0 ? result[0] : false))
        .catch((error) => logger.error(`getCourseCategoryByTitleAndNotId: ${error}`));
}

//freeze
function updateCourseCategoryById({ id, title, image }) {
    return executeSQLQueryParameterized("UPDATE COURSE_CATEGORIES SET title=?, image=? WHERE id=?", [title, image, id]).catch((error) => {
        logger.error(`updateCourseCategoryById: ${error}`);
    });
}

//freeze
function updateCourseCategoryViewIndexById({ id, view_index }) {
    return executeSQLQueryParameterized("UPDATE COURSE_CATEGORIES SET view_index=? WHERE id=?", [view_index, id]).catch((error) => {
        logger.error(`updateCourseCategoryViewIndexById: ${error}`);
    });
}

module.exports = {
    getAllCourseCategories,
    addCourseCategory,
    getCourseCategoryByTitle,
    getCourseCategoryByTitleAndNotId,
    getCourseCategoryById,
    deleteCourseCategoryById,
    updateCourseCategoryById,
    updateCourseCategoryViewIndexById,
};
