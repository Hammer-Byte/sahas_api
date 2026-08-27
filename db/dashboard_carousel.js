const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

function getAllDashboardCarouselItems() {
    return executeSQLQueryParameterized(`SELECT * FROM DASHBOARD_CAROUSEL_ITEMS ORDER BY view_index ASC, id ASC`).catch((error) => {
        logger.error(`getAllDashboardCarouselItems: ${error}`);
        return [];
    });
}

function getDashboardCarouselItemById({ id }) {
    return executeSQLQueryParameterized(`SELECT * FROM DASHBOARD_CAROUSEL_ITEMS WHERE id=?`, [id])
        .then((result) => (result.length > 0 ? result[0] : false))
        .catch((error) => {
            logger.error(`getDashboardCarouselItemById: ${error}`);
            return false;
        });
}

function addDashboardCarouselItem({ source, click_link = null, view_index = 0 }) {
    return executeSQLQueryParameterized(`INSERT INTO DASHBOARD_CAROUSEL_ITEMS (source, click_link, view_index) VALUES (?,?,?)`, [
        source,
        click_link,
        view_index,
    ])
        .then((result) => result.insertId)
        .catch((error) => logger.error(`addDashboardCarouselItem: ${error}`));
}

function deleteDashboardCarouselItemById({ id }) {
    return executeSQLQueryParameterized(`DELETE FROM DASHBOARD_CAROUSEL_ITEMS WHERE id=?`, [id]).catch((error) =>
        logger.error(`deleteDashboardCarouselItemById: ${error}`),
    );
}

module.exports = {
    getAllDashboardCarouselItems,
    getDashboardCarouselItemById,
    addDashboardCarouselItem,
    deleteDashboardCarouselItemById,
};
