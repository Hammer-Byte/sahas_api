const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

function getAllWebsiteNotifications() {
    return executeSQLQueryParameterized("SELECT * FROM WEBSITE_NOTIFICATIONS ORDER BY id").catch((error) => {
        logger.error(`getAllWebsiteNotifications: ${error}`);
        return [];
    });
}

function getWebsiteNotificationById({ id }) {
    return executeSQLQueryParameterized("SELECT * FROM WEBSITE_NOTIFICATIONS WHERE id=?", [id])
        .then((result) => (result.length > 0 ? result[0] : false))
        .catch((error) => {
            logger.error(`getWebsiteNotificationById: ${error}`);
            return false;
        });
}

function addWebsiteNotification({ title, category, course, description, content, image, image_alt, thumbnail, pdf_url, pdf_title, pdf_size, video_url, video_thumbnail, published_at, is_featured = false, is_important = false, is_new = null, cta_text, cta_url, tags, is_published = true }) {
    const publicId = String(title || "website_notifications").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70) || `website_notifications-${Date.now()}`;
    return executeSQLQueryParameterized("INSERT INTO WEBSITE_NOTIFICATIONS (public_id, slug, title, category, course, description, content, image, image_alt, thumbnail, pdf_url, pdf_title, pdf_size, video_url, video_thumbnail, published_at, is_featured, is_important, is_new, cta_text, cta_url, tags, is_published) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [publicId, publicId, title, category, course, description, content, image, image_alt, thumbnail, pdf_url, pdf_title, pdf_size, video_url, video_thumbnail, published_at, is_featured, is_important, is_new, cta_text, cta_url, tags, is_published])
        .then((result) => result.insertId)
        .catch((error) => {
            logger.error(`addWebsiteNotification: ${error}`);
            return false;
        });
}

function updateWebsiteNotificationById({ id, title, category, course, description, content, image, image_alt, thumbnail, pdf_url, pdf_title, pdf_size, video_url, video_thumbnail, published_at, is_featured, is_important, is_new, cta_text, cta_url, tags, is_published }) {
    return executeSQLQueryParameterized("UPDATE WEBSITE_NOTIFICATIONS SET title=?, category=?, course=?, description=?, content=?, image=?, image_alt=?, thumbnail=?, pdf_url=?, pdf_title=?, pdf_size=?, video_url=?, video_thumbnail=?, published_at=?, is_featured=?, is_important=?, is_new=?, cta_text=?, cta_url=?, tags=?, is_published=? WHERE id=?", [title, category, course, description, content, image, image_alt, thumbnail, pdf_url, pdf_title, pdf_size, video_url, video_thumbnail, published_at, is_featured, is_important, is_new, cta_text, cta_url, tags, is_published, id]).catch((error) => {
        logger.error(`updateWebsiteNotificationById: ${error}`);
        return false;
    });
}

function deleteWebsiteNotificationById({ id }) {
    return executeSQLQueryParameterized("DELETE FROM WEBSITE_NOTIFICATIONS WHERE id=?", [id]).catch((error) => {
        logger.error(`deleteWebsiteNotificationById: ${error}`);
        return false;
    });
}

module.exports = { getAllWebsiteNotifications, getWebsiteNotificationById, addWebsiteNotification, updateWebsiteNotificationById, deleteWebsiteNotificationById };
