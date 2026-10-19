const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

function getAllWebsiteGalleryMedia() {
    return executeSQLQueryParameterized("SELECT * FROM WEBSITE_GALLERY_MEDIA ORDER BY id").catch((error) => {
        logger.error(`getAllWebsiteGalleryMedia: ${error}`);
        return [];
    });
}

function getWebsiteGalleryMediaById({ id }) {
    return executeSQLQueryParameterized("SELECT * FROM WEBSITE_GALLERY_MEDIA WHERE id=?", [id])
        .then((result) => (result.length > 0 ? result[0] : false))
        .catch((error) => {
            logger.error(`getWebsiteGalleryMediaById: ${error}`);
            return false;
        });
}

function addWebsiteGalleryMedia({ album_public_id, media_type = "image", url, thumbnail, title, caption, alt_text, duration, downloadable = false }) {
    const publicId = String(title || "website_gallery_media").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70) || `website_gallery_media-${Date.now()}`;
    return executeSQLQueryParameterized("INSERT INTO WEBSITE_GALLERY_MEDIA (public_id, album_public_id, media_type, url, thumbnail, title, caption, alt_text, duration, downloadable) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [publicId, album_public_id, media_type, url, thumbnail, title, caption, alt_text, duration, downloadable])
        .then((result) => result.insertId)
        .catch((error) => {
            logger.error(`addWebsiteGalleryMedia: ${error}`);
            return false;
        });
}

function updateWebsiteGalleryMediaById({ id, album_public_id, media_type, url, thumbnail, title, caption, alt_text, duration, downloadable }) {
    return executeSQLQueryParameterized("UPDATE WEBSITE_GALLERY_MEDIA SET album_public_id=?, media_type=?, url=?, thumbnail=?, title=?, caption=?, alt_text=?, duration=?, downloadable=? WHERE id=?", [album_public_id, media_type, url, thumbnail, title, caption, alt_text, duration, downloadable, id]).catch((error) => {
        logger.error(`updateWebsiteGalleryMediaById: ${error}`);
        return false;
    });
}

function deleteWebsiteGalleryMediaById({ id }) {
    return executeSQLQueryParameterized("DELETE FROM WEBSITE_GALLERY_MEDIA WHERE id=?", [id]).catch((error) => {
        logger.error(`deleteWebsiteGalleryMediaById: ${error}`);
        return false;
    });
}

module.exports = { getAllWebsiteGalleryMedia, getWebsiteGalleryMediaById, addWebsiteGalleryMedia, updateWebsiteGalleryMediaById, deleteWebsiteGalleryMediaById };
