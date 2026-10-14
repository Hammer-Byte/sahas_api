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

function addWebsiteCourse({ title, subtitle, short_description, description, category, board, university, medium, duration, badge, price, price_label, image, image_alt, brochure_url, cta_text, enquiry_url, detail_url, featured = false, is_active = true }) {
    const publicId = String(title || "website_courses").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70) || `website_courses-${Date.now()}`;
    return executeSQLQueryParameterized("INSERT INTO WEBSITE_COURSES (public_id, slug, title, subtitle, short_description, description, category, board, university, medium, duration, badge, price, price_label, image, image_alt, brochure_url, cta_text, enquiry_url, detail_url, featured, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [publicId, publicId, title, subtitle, short_description, description, category, board, university, medium, duration, badge, price, price_label, image, image_alt, brochure_url, cta_text, enquiry_url, detail_url, featured, is_active])
        .then((result) => result.insertId)
        .catch((error) => {
            logger.error(`addWebsiteCourse: ${error}`);
            return false;
        });
}

function updateWebsiteCourseById({ id, title, subtitle, short_description, description, category, board, university, medium, duration, badge, price, price_label, image, image_alt, brochure_url, cta_text, enquiry_url, detail_url, featured, is_active }) {
    return executeSQLQueryParameterized("UPDATE WEBSITE_COURSES SET title=?, subtitle=?, short_description=?, description=?, category=?, board=?, university=?, medium=?, duration=?, badge=?, price=?, price_label=?, image=?, image_alt=?, brochure_url=?, cta_text=?, enquiry_url=?, detail_url=?, featured=?, is_active=? WHERE id=?", [title, subtitle, short_description, description, category, board, university, medium, duration, badge, price, price_label, image, image_alt, brochure_url, cta_text, enquiry_url, detail_url, featured, is_active, id]).catch((error) => {
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
