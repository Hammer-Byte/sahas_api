const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

function getAllWebsiteSeo() {
    return executeSQLQueryParameterized("SELECT * FROM WEBSITE_SEO ORDER BY id").catch((error) => {
        logger.error(`getAllWebsiteSeo: ${error}`);
        return [];
    });
}

function getWebsiteSeoById({ id }) {
    return executeSQLQueryParameterized("SELECT * FROM WEBSITE_SEO WHERE id=?", [id])
        .then((result) => (result.length > 0 ? result[0] : false))
        .catch((error) => {
            logger.error(`getWebsiteSeoById: ${error}`);
            return false;
        });
}

function addWebsiteSeo({ owner_type, owner_key, title, description, keywords, canonical_url, og_title, og_description, og_image, no_index = false, twitter_title, twitter_description }) {
    return executeSQLQueryParameterized("INSERT INTO WEBSITE_SEO (owner_type, owner_key, title, description, keywords, canonical_url, og_title, og_description, og_image, no_index, twitter_title, twitter_description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [owner_type, owner_key, title, description, keywords, canonical_url, og_title, og_description, og_image, no_index, twitter_title, twitter_description])
        .then((result) => result.insertId)
        .catch((error) => {
            logger.error(`addWebsiteSeo: ${error}`);
            return false;
        });
}

function updateWebsiteSeoById({ id, owner_type, owner_key, title, description, keywords, canonical_url, og_title, og_description, og_image, no_index, twitter_title, twitter_description }) {
    return executeSQLQueryParameterized("UPDATE WEBSITE_SEO SET owner_type=?, owner_key=?, title=?, description=?, keywords=?, canonical_url=?, og_title=?, og_description=?, og_image=?, no_index=?, twitter_title=?, twitter_description=? WHERE id=?", [owner_type, owner_key, title, description, keywords, canonical_url, og_title, og_description, og_image, no_index, twitter_title, twitter_description, id]).catch((error) => {
        logger.error(`updateWebsiteSeoById: ${error}`);
        return false;
    });
}

function deleteWebsiteSeoById({ id }) {
    return executeSQLQueryParameterized("DELETE FROM WEBSITE_SEO WHERE id=?", [id]).catch((error) => {
        logger.error(`deleteWebsiteSeoById: ${error}`);
        return false;
    });
}

module.exports = { getAllWebsiteSeo, getWebsiteSeoById, addWebsiteSeo, updateWebsiteSeoById, deleteWebsiteSeoById };
