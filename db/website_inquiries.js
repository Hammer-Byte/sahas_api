const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

function addWebsiteInquiry({
    full_name,
    phone,
    branch_slug = null,
    branch_name = null,
    course_slug = null,
    course_title = null,
    description = null,
    source = "website",
}) {
    return executeSQLQueryParameterized(
        `INSERT INTO WEBSITE_INQUIRIES(full_name, phone, branch_slug, branch_name, course_slug, course_title, description, source)
         VALUES(?,?,?,?,?,?,?,?)`,
        [
            full_name,
            phone,
            branch_slug || null,
            branch_name || null,
            course_slug || null,
            course_title || null,
            description || null,
            source || "website",
        ],
    )
        .then((result) => result.insertId)
        .catch((error) => {
            logger.error(`addWebsiteInquiry: ${error}`);
            throw error;
        });
}

function getWebsiteInquiryById({ id }) {
    return executeSQLQueryParameterized(`SELECT * FROM WEBSITE_INQUIRIES WHERE id=? LIMIT 1`, [id])
        .then((result) => (result.length > 0 ? result[0] : false))
        .catch((error) => {
            logger.error(`getWebsiteInquiryById: ${error}`);
            return false;
        });
}

function getAllWebsiteInquiries({ offSet = 0, limit = 50 } = {}) {
    const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
    const safeOffset = Math.max(Number(offSet) || 0, 0);
    return executeSQLQueryParameterized(
        `SELECT * FROM WEBSITE_INQUIRIES ORDER BY id DESC LIMIT ? OFFSET ?`,
        [safeLimit, safeOffset],
    ).catch((error) => {
        logger.error(`getAllWebsiteInquiries: ${error}`);
        return [];
    });
}

function getCountWebsiteInquiries() {
    return executeSQLQueryParameterized(`SELECT COUNT(*) AS total FROM WEBSITE_INQUIRIES`)
        .then((result) => Number(result?.[0]?.total || 0))
        .catch((error) => {
            logger.error(`getCountWebsiteInquiries: ${error}`);
            return 0;
        });
}

module.exports = {
    addWebsiteInquiry,
    getWebsiteInquiryById,
    getAllWebsiteInquiries,
    getCountWebsiteInquiries,
};
