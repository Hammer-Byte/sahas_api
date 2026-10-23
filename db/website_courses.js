const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

function getAllWebsiteCourses() {
    return executeSQLQueryParameterized("SELECT * FROM WEBSITE_COURSES ORDER BY id").catch((error) => {
        logger.error(`getAllWebsiteCourses: ${error}`);
        return [];
    });
}

function getWebsiteCourseById({ id }) {
    return executeSQLQueryParameterized("SELECT * FROM WEBSITE_COURSES WHERE id=?", [id])
        .then((result) => (result.length > 0 ? result[0] : false))
        .catch((error) => {
            logger.error(`getWebsiteCourseById: ${error}`);
            return false;
        });
}

function emptyPrice(value) {
    if (value === undefined || value === null || (typeof value === "string" && value.trim() === "")) return null;
    const numeric = Number(String(value).replace(/[₹,\s]/g, ""));
    return Number.isFinite(numeric) ? numeric : null;
}

function addWebsiteCourse(body) {
    const publicId = String(body.title || "website_courses").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70) || `website_courses-${Date.now()}`;
    return executeSQLQueryParameterized("INSERT INTO WEBSITE_COURSES (public_id, slug, title, subtitle, short_description, description, category, board, university, medium, duration, badge, price, price_label, image, image_alt, brochure_url, cta_text, enquiry_url, detail_url, featured, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [publicId, publicId, body.title, body.subtitle, body.short_description, body.description, body.category, body.board, body.university, body.medium, body.duration, body.badge, emptyPrice(body.price), body.price_label, body.image, body.image_alt, body.brochure_url, body.cta_text, body.enquiry_url, body.detail_url, body.featured, body.is_active])
        .then((result) => result.insertId)
        .catch((error) => {
            logger.error(`addWebsiteCourse: ${error}`);
            return false;
        });
}

function updateWebsiteCourseById(body) {
    return executeSQLQueryParameterized("UPDATE WEBSITE_COURSES SET title=?, subtitle=?, short_description=?, description=?, category=?, board=?, university=?, medium=?, duration=?, badge=?, price=?, price_label=?, image=?, image_alt=?, brochure_url=?, cta_text=?, enquiry_url=?, detail_url=?, featured=?, is_active=? WHERE id=?", [body.title, body.subtitle, body.short_description, body.description, body.category, body.board, body.university, body.medium, body.duration, body.badge, emptyPrice(body.price), body.price_label, body.image, body.image_alt, body.brochure_url, body.cta_text, body.enquiry_url, body.detail_url, body.featured, body.is_active, body.id]).catch((error) => {
        logger.error(`updateWebsiteCourseById: ${error}`);
        return false;
    });
}

function deleteWebsiteCourseById({ id }) {
    return executeSQLQueryParameterized("DELETE FROM WEBSITE_COURSES WHERE id=?", [id]).catch((error) => {
        logger.error(`deleteWebsiteCourseById: ${error}`);
        return false;
    });
}

module.exports = { getAllWebsiteCourses, getWebsiteCourseById, addWebsiteCourse, updateWebsiteCourseById, deleteWebsiteCourseById };
