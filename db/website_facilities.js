const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

function getAllWebsiteFacilities() {
    return executeSQLQueryParameterized("SELECT * FROM WEBSITE_FACILITIES ORDER BY id").catch((error) => {
        logger.error(`getAllWebsiteFacilities: ${error}`);
        return [];
    });
}

function getWebsiteFacilityById({ id }) {
    return executeSQLQueryParameterized("SELECT * FROM WEBSITE_FACILITIES WHERE id=?", [id])
        .then((result) => (result.length > 0 ? result[0] : false))
        .catch((error) => {
            logger.error(`getWebsiteFacilityById: ${error}`);
            return false;
        });
}

function addWebsiteFacility({ title, description, icon, image, image_alt, category, badge, detail_url, featured = false, special = false, is_active = true, points }) {
    const publicId = String(title || "website_facilities").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70) || `website_facilities-${Date.now()}`;
    return executeSQLQueryParameterized("INSERT INTO WEBSITE_FACILITIES (public_id, slug, title, description, icon, image, image_alt, category, badge, detail_url, featured, special, is_active, points) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [publicId, publicId, title, description, icon, image, image_alt, category, badge, detail_url, featured, special, is_active, points])
        .then((result) => result.insertId)
        .catch((error) => {
            logger.error(`addWebsiteFacility: ${error}`);
            return false;
        });
}

function updateWebsiteFacilityById({ id, title, description, icon, image, image_alt, category, badge, detail_url, featured, special, is_active, points }) {
    return executeSQLQueryParameterized("UPDATE WEBSITE_FACILITIES SET title=?, description=?, icon=?, image=?, image_alt=?, category=?, badge=?, detail_url=?, featured=?, special=?, is_active=?, points=? WHERE id=?", [title, description, icon, image, image_alt, category, badge, detail_url, featured, special, is_active, points, id]).catch((error) => {
        logger.error(`updateWebsiteFacilityById: ${error}`);
        return false;
    });
}

function deleteWebsiteFacilityById({ id }) {
    return executeSQLQueryParameterized("DELETE FROM WEBSITE_FACILITIES WHERE id=?", [id]).catch((error) => {
        logger.error(`deleteWebsiteFacilityById: ${error}`);
        return false;
    });
}

module.exports = { getAllWebsiteFacilities, getWebsiteFacilityById, addWebsiteFacility, updateWebsiteFacilityById, deleteWebsiteFacilityById };
