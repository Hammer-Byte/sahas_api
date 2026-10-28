const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

//freeze
function getAllWebsiteInquiries() {
    return executeSQLQueryParameterized("SELECT * FROM WEBSITE_INQUIRIES ORDER BY id DESC").catch((error) => {
        logger.error(`getAllWebsiteInquiries: ${error}`);
        return [];
    });
}

//freeze
function getWebsiteInquiryById({ id }) {
    return executeSQLQueryParameterized("SELECT * FROM WEBSITE_INQUIRIES WHERE id=?", [id])
        .then((result) => (result.length > 0 ? result[0] : false))
        .catch((error) => {
            logger.error(`getWebsiteInquiryById: ${error}`);
            return false;
        });
}

//freeze
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
        "INSERT INTO WEBSITE_INQUIRIES(full_name,phone,branch_slug,branch_name,course_slug,course_title,description,source) VALUES(?,?,?,?,?,?,?,?)",
        [full_name, phone, branch_slug, branch_name, course_slug, course_title, description, source],
    )
        .then((result) => result.insertId)
        .catch((error) => {
            logger.error(`addWebsiteInquiry: ${error}`);
            return false;
        });
}

//freeze
function deleteWebsiteInquiryById({ id }) {
    return executeSQLQueryParameterized("DELETE FROM WEBSITE_INQUIRIES WHERE id=?", [id]).catch((error) => {
        logger.error(`deleteWebsiteInquiryById: ${error}`);
        return false;
    });
}

module.exports = {
    getAllWebsiteInquiries,
    getWebsiteInquiryById,
    addWebsiteInquiry,
    deleteWebsiteInquiryById,
};
