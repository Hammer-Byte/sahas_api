const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

function getAllWebsiteBrochures() {
    return executeSQLQueryParameterized("SELECT * FROM WEBSITE_BROCHURES ORDER BY id").catch((error) => {
        logger.error(`getAllWebsiteBrochures: ${error}`);
        return [];
    });
}

function getWebsiteBrochureById({ id }) {
    return executeSQLQueryParameterized("SELECT * FROM WEBSITE_BROCHURES WHERE id=?", [id])
        .then((result) => (result.length > 0 ? result[0] : false))
        .catch((error) => {
            logger.error(`getWebsiteBrochureById: ${error}`);
            return false;
        });
}

function addWebsiteBrochure({ title, description, file_url, file_type, page_count, file_size, year_label, language, badge, course_name, course_description, course_image, cover_image, cover_alt, is_published = true }) {
    const publicId = String(title || "website_brochures").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70) || `website_brochures-${Date.now()}`;
    return executeSQLQueryParameterized("INSERT INTO WEBSITE_BROCHURES (public_id, slug, title, description, file_url, file_type, page_count, file_size, year_label, language, badge, course_name, course_description, course_image, cover_image, cover_alt, is_published) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [publicId, publicId, title, description, file_url, file_type, page_count, file_size, year_label, language, badge, course_name, course_description, course_image, cover_image, cover_alt, is_published])
        .then((result) => result.insertId)
        .catch((error) => {
            logger.error(`addWebsiteBrochure: ${error}`);
            return false;
        });
}

function updateWebsiteBrochureById({ id, title, description, file_url, file_type, page_count, file_size, year_label, language, badge, course_name, course_description, course_image, cover_image, cover_alt, is_published }) {
    return executeSQLQueryParameterized("UPDATE WEBSITE_BROCHURES SET title=?, description=?, file_url=?, file_type=?, page_count=?, file_size=?, year_label=?, language=?, badge=?, course_name=?, course_description=?, course_image=?, cover_image=?, cover_alt=?, is_published=? WHERE id=?", [title, description, file_url, file_type, page_count, file_size, year_label, language, badge, course_name, course_description, course_image, cover_image, cover_alt, is_published, id]).catch((error) => {
        logger.error(`updateWebsiteBrochureById: ${error}`);
        return false;
    });
}

function deleteWebsiteBrochureById({ id }) {
    return executeSQLQueryParameterized("DELETE FROM WEBSITE_BROCHURES WHERE id=?", [id]).catch((error) => {
        logger.error(`deleteWebsiteBrochureById: ${error}`);
        return false;
    });
}

module.exports = { getAllWebsiteBrochures, getWebsiteBrochureById, addWebsiteBrochure, updateWebsiteBrochureById, deleteWebsiteBrochureById };
