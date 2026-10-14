const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

function getAllWebsiteGalleryCategories() {
    return executeSQLQueryParameterized("SELECT * FROM WEBSITE_GALLERY_CATEGORIES ORDER BY id").catch((error) => {
        logger.error(`getAllWebsiteGalleryCategories: ${error}`);
        return [];
    });
}

function getWebsiteGalleryCategoryById({ id }) {
    return executeSQLQueryParameterized("SELECT * FROM WEBSITE_GALLERY_CATEGORIES WHERE id=?", [id])
        .then((result) => (result.length > 0 ? result[0] : false))
        .catch((error) => {
            logger.error(`getWebsiteGalleryCategoryById: ${error}`);
            return false;
        });
}

function addWebsiteGalleryCategory({ title, description, icon, category_type = "albums", cover_image, cover_alt, is_published = true }) {
    const publicId = String(title || "website_gallery_categories").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70) || `website_gallery_categories-${Date.now()}`;
    return executeSQLQueryParameterized("INSERT INTO WEBSITE_GALLERY_CATEGORIES (public_id, slug, title, description, icon, category_type, cover_image, cover_alt, is_published) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [publicId, publicId, title, description, icon, category_type, cover_image, cover_alt, is_published])
        .then((result) => result.insertId)
        .catch((error) => {
            logger.error(`addWebsiteGalleryCategory: ${error}`);
            return false;
        });
}

function updateWebsiteGalleryCategoryById({ id, title, description, icon, category_type, cover_image, cover_alt, is_published }) {
    return executeSQLQueryParameterized("UPDATE WEBSITE_GALLERY_CATEGORIES SET title=?, description=?, icon=?, category_type=?, cover_image=?, cover_alt=?, is_published=? WHERE id=?", [title, description, icon, category_type, cover_image, cover_alt, is_published, id]).catch((error) => {
        logger.error(`updateWebsiteGalleryCategoryById: ${error}`);
        return false;
    });
}

function deleteWebsiteGalleryCategoryById({ id }) {
    return executeSQLQueryParameterized("DELETE FROM WEBSITE_GALLERY_CATEGORIES WHERE id=?", [id]).catch((error) => {
        logger.error(`deleteWebsiteGalleryCategoryById: ${error}`);
        return false;
    });
}

module.exports = { getAllWebsiteGalleryCategories, getWebsiteGalleryCategoryById, addWebsiteGalleryCategory, updateWebsiteGalleryCategoryById, deleteWebsiteGalleryCategoryById };
