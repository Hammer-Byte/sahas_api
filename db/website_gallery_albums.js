const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

function getAllWebsiteGalleryAlbums() {
    return executeSQLQueryParameterized("SELECT * FROM WEBSITE_GALLERY_ALBUMS ORDER BY id").catch((error) => {
        logger.error(`getAllWebsiteGalleryAlbums: ${error}`);
        return [];
    });
}

function getWebsiteGalleryAlbumById({ id }) {
    return executeSQLQueryParameterized("SELECT * FROM WEBSITE_GALLERY_ALBUMS WHERE id=?", [id])
        .then((result) => (result.length > 0 ? result[0] : false))
        .catch((error) => {
            logger.error(`getWebsiteGalleryAlbumById: ${error}`);
            return false;
        });
}

function addWebsiteGalleryAlbum({ category_slug, title, description, location, event_date, cover_image, cover_alt, is_featured = false, is_published = true, tags, item_type = "album", person_name, designation, department, experience, person_image, person_image_alt }) {
    const publicId = String(title || "website_gallery_albums").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70) || `website_gallery_albums-${Date.now()}`;
    return executeSQLQueryParameterized("INSERT INTO WEBSITE_GALLERY_ALBUMS (public_id, slug, category_slug, title, description, location, event_date, cover_image, cover_alt, is_featured, is_published, tags, item_type, person_name, designation, department, experience, person_image, person_image_alt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [publicId, publicId, category_slug, title, description, location, event_date, cover_image, cover_alt, is_featured, is_published, tags, item_type, person_name, designation, department, experience, person_image, person_image_alt])
        .then((result) => result.insertId)
        .catch((error) => {
            logger.error(`addWebsiteGalleryAlbum: ${error}`);
            return false;
        });
}

function updateWebsiteGalleryAlbumById({ id, category_slug, title, description, location, event_date, cover_image, cover_alt, is_featured, is_published, tags, item_type, person_name, designation, department, experience, person_image, person_image_alt }) {
    return executeSQLQueryParameterized("UPDATE WEBSITE_GALLERY_ALBUMS SET category_slug=?, title=?, description=?, location=?, event_date=?, cover_image=?, cover_alt=?, is_featured=?, is_published=?, tags=?, item_type=?, person_name=?, designation=?, department=?, experience=?, person_image=?, person_image_alt=? WHERE id=?", [category_slug, title, description, location, event_date, cover_image, cover_alt, is_featured, is_published, tags, item_type, person_name, designation, department, experience, person_image, person_image_alt, id]).catch((error) => {
        logger.error(`updateWebsiteGalleryAlbumById: ${error}`);
        return false;
    });
}

function deleteWebsiteGalleryAlbumById({ id }) {
    return executeSQLQueryParameterized("DELETE FROM WEBSITE_GALLERY_ALBUMS WHERE id=?", [id]).catch((error) => {
        logger.error(`deleteWebsiteGalleryAlbumById: ${error}`);
        return false;
    });
}

module.exports = { getAllWebsiteGalleryAlbums, getWebsiteGalleryAlbumById, addWebsiteGalleryAlbum, updateWebsiteGalleryAlbumById, deleteWebsiteGalleryAlbumById };
