const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

function getAllWebsiteHomeGalleryTiles() {
    return executeSQLQueryParameterized("SELECT * FROM WEBSITE_HOME_GALLERY_TILES ORDER BY id").catch((error) => {
        logger.error(`getAllWebsiteHomeGalleryTiles: ${error}`);
        return [];
    });
}

function getWebsiteHomeGalleryTileById({ id }) {
    return executeSQLQueryParameterized("SELECT * FROM WEBSITE_HOME_GALLERY_TILES WHERE id=?", [id])
        .then((result) => (result.length > 0 ? result[0] : false))
        .catch((error) => {
            logger.error(`getWebsiteHomeGalleryTileById: ${error}`);
            return false;
        });
}

function addWebsiteHomeGalleryTile({ title, description, icon, image, alt_text, link_url }) {
    return executeSQLQueryParameterized("INSERT INTO WEBSITE_HOME_GALLERY_TILES (title, description, icon, image, alt_text, link_url) VALUES (?, ?, ?, ?, ?, ?)", [title, description, icon, image, alt_text, link_url])
        .then((result) => result.insertId)
        .catch((error) => {
            logger.error(`addWebsiteHomeGalleryTile: ${error}`);
            return false;
        });
}

function updateWebsiteHomeGalleryTileById({ id, title, description, icon, image, alt_text, link_url }) {
    return executeSQLQueryParameterized("UPDATE WEBSITE_HOME_GALLERY_TILES SET title=?, description=?, icon=?, image=?, alt_text=?, link_url=? WHERE id=?", [title, description, icon, image, alt_text, link_url, id]).catch((error) => {
        logger.error(`updateWebsiteHomeGalleryTileById: ${error}`);
        return false;
    });
}

function deleteWebsiteHomeGalleryTileById({ id }) {
    return executeSQLQueryParameterized("DELETE FROM WEBSITE_HOME_GALLERY_TILES WHERE id=?", [id]).catch((error) => {
        logger.error(`deleteWebsiteHomeGalleryTileById: ${error}`);
        return false;
    });
}

module.exports = { getAllWebsiteHomeGalleryTiles, getWebsiteHomeGalleryTileById, addWebsiteHomeGalleryTile, updateWebsiteHomeGalleryTileById, deleteWebsiteHomeGalleryTileById };
