const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

function getAllWebsiteTestimonials() {
    return executeSQLQueryParameterized("SELECT * FROM WEBSITE_TESTIMONIALS ORDER BY id").catch((error) => {
        logger.error(`getAllWebsiteTestimonials: ${error}`);
        return [];
    });
}

function getWebsiteTestimonialById({ id }) {
    return executeSQLQueryParameterized("SELECT * FROM WEBSITE_TESTIMONIALS WHERE id=?", [id])
        .then((result) => (result.length > 0 ? result[0] : false))
        .catch((error) => {
            logger.error(`getWebsiteTestimonialById: ${error}`);
            return false;
        });
}

function addWebsiteTestimonial({ name, title, description, reviewer_type, role, course, score, rating, image, image_alt, media_url, media_type, is_published = true }) {
    const publicId = String(name || "website_testimonials").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70) || `website_testimonials-${Date.now()}`;
    return executeSQLQueryParameterized("INSERT INTO WEBSITE_TESTIMONIALS (public_id, name, title, description, reviewer_type, role, course, score, rating, image, image_alt, media_url, media_type, is_published) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [publicId, name, title, description, reviewer_type, role, course, score, rating, image, image_alt, media_url, media_type, is_published])
        .then((result) => result.insertId)
        .catch((error) => {
            logger.error(`addWebsiteTestimonial: ${error}`);
            return false;
        });
}

function updateWebsiteTestimonialById({ id, name, title, description, reviewer_type, role, course, score, rating, image, image_alt, media_url, media_type, is_published }) {
    return executeSQLQueryParameterized("UPDATE WEBSITE_TESTIMONIALS SET name=?, title=?, description=?, reviewer_type=?, role=?, course=?, score=?, rating=?, image=?, image_alt=?, media_url=?, media_type=?, is_published=? WHERE id=?", [name, title, description, reviewer_type, role, course, score, rating, image, image_alt, media_url, media_type, is_published, id]).catch((error) => {
        logger.error(`updateWebsiteTestimonialById: ${error}`);
        return false;
    });
}

function deleteWebsiteTestimonialById({ id }) {
    return executeSQLQueryParameterized("DELETE FROM WEBSITE_TESTIMONIALS WHERE id=?", [id]).catch((error) => {
        logger.error(`deleteWebsiteTestimonialById: ${error}`);
        return false;
    });
}

module.exports = { getAllWebsiteTestimonials, getWebsiteTestimonialById, addWebsiteTestimonial, updateWebsiteTestimonialById, deleteWebsiteTestimonialById };
