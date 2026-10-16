const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

function getAllWebsiteBranches() {
    return executeSQLQueryParameterized("SELECT * FROM WEBSITE_BRANCHES ORDER BY id").catch((error) => {
        logger.error(`getAllWebsiteBranches: ${error}`);
        return [];
    });
}

function getWebsiteBranchById({ id }) {
    return executeSQLQueryParameterized("SELECT * FROM WEBSITE_BRANCHES WHERE id=?", [id])
        .then((result) => (result.length > 0 ? result[0] : false))
        .catch((error) => {
            logger.error(`getWebsiteBranchById: ${error}`);
            return false;
        });
}

function addWebsiteBranch({ name, label, description, address, phone, whatsapp, map_url, map_embed_url, map_query, city, state, country, latitude, longitude, is_active = true }) {
    const publicId = String(name || "website_branches").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70) || `website_branches-${Date.now()}`;
    return executeSQLQueryParameterized("INSERT INTO WEBSITE_BRANCHES (public_id, slug, name, label, description, address, phone, whatsapp, map_url, map_embed_url, map_query, city, state, country, latitude, longitude, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [publicId, publicId, name, label, description, address, phone, whatsapp, map_url, map_embed_url, map_query, city, state, country, latitude, longitude, is_active])
        .then((result) => result.insertId)
        .catch((error) => {
            logger.error(`addWebsiteBranch: ${error}`);
            return false;
        });
}

function updateWebsiteBranchById({ id, name, label, description, address, phone, whatsapp, map_url, map_embed_url, map_query, city, state, country, latitude, longitude, is_active }) {
    return executeSQLQueryParameterized("UPDATE WEBSITE_BRANCHES SET name=?, label=?, description=?, address=?, phone=?, whatsapp=?, map_url=?, map_embed_url=?, map_query=?, city=?, state=?, country=?, latitude=?, longitude=?, is_active=? WHERE id=?", [name, label, description, address, phone, whatsapp, map_url, map_embed_url, map_query, city, state, country, latitude, longitude, is_active, id]).catch((error) => {
        logger.error(`updateWebsiteBranchById: ${error}`);
        return false;
    });
}

function deleteWebsiteBranchById({ id }) {
    return executeSQLQueryParameterized("DELETE FROM WEBSITE_BRANCHES WHERE id=?", [id]).catch((error) => {
        logger.error(`deleteWebsiteBranchById: ${error}`);
        return false;
    });
}

module.exports = { getAllWebsiteBranches, getWebsiteBranchById, addWebsiteBranch, updateWebsiteBranchById, deleteWebsiteBranchById };
