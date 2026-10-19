const libExpress = require("express");
const { getWebsiteCoursesPage, updateWebsiteCoursesPage } = require("../db/website_courses_page");
const { validateRequestBody } = require("sahas_utils");
const requires_authority = require("../middlewares/requires_authority");
const { AUTHORITIES } = require("../constants");

const router = libExpress.Router();

router.get("/", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    const record = await getWebsiteCoursesPage();
    if (!record) {
        return res.status(400).json({ error: "Website Courses Page Not Exist" });
    }
    return res.status(200).json(record);
});

router.patch("/", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    const requiredBodyFields = ["title"];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    await updateWebsiteCoursesPage({ ...validatedRequestBody, ...req.body });
    return res.status(200).json(await getWebsiteCoursesPage());
});

module.exports = router;
