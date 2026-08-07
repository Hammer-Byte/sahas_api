const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

function getCourseCarouselByCourseId({ course_id }) {
    return executeSQLQueryParameterized(
        `SELECT * FROM COURSE_CAROUSEL WHERE course_id=? ORDER BY view_index ASC, id ASC`,
        [course_id],
    ).catch((error) => {
        logger.error(`getCourseCarouselByCourseId: ${error}`);
        return [];
    });
}

function getCourseCarouselItemById({ id }) {
    return executeSQLQueryParameterized(`SELECT * FROM COURSE_CAROUSEL WHERE id=?`, [id])
        .then((result) => (result.length > 0 ? result[0] : false))
        .catch((error) => {
            logger.error(`getCourseCarouselItemById: ${error}`);
            return false;
        });
}

function addCourseCarouselItem({ course_id, source, click_link = null, view_index = 0 }) {
    return executeSQLQueryParameterized(
        `INSERT INTO COURSE_CAROUSEL (course_id, source, click_link, view_index) VALUES (?,?,?,?)`,
        [course_id, source, click_link, view_index],
    )
        .then((result) => result.insertId)
        .catch((error) => logger.error(`addCourseCarouselItem: ${error}`));
}

function deleteCourseCarouselItemById({ id }) {
    return executeSQLQueryParameterized(`DELETE FROM COURSE_CAROUSEL WHERE id=?`, [id]).catch((error) =>
        logger.error(`deleteCourseCarouselItemById: ${error}`),
    );
}

function updateCourseCarouselItemById({ id, source, click_link = null }) {
    return executeSQLQueryParameterized(`UPDATE COURSE_CAROUSEL SET source=?, click_link=? WHERE id=?`, [source, click_link, id]).catch((error) =>
        logger.error(`updateCourseCarouselItemById: ${error}`),
    );
}

module.exports = {
    getCourseCarouselByCourseId,
    getCourseCarouselItemById,
    addCourseCarouselItem,
    deleteCourseCarouselItemById,
    updateCourseCarouselItemById,
};
