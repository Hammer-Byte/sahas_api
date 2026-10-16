const libExpress = require("express");
const { getWebsiteNotificationsPage, updateWebsiteNotificationsPage } = require("../db/website_notifications_page");
const { validateRequestBody } = require("sahas_utils");
const requires_authority = require("../middlewares/requires_authority");
const { AUTHORITIES } = require("../constants");

const router = libExpress.Router();

router.get("/", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    const record = await getWebsiteNotificationsPage();
    if (!record) {
        return res.status(400).json({ error: "Website Notifications Page Not Exist" });
    }
    return res.status(200).json(record);
});

router.patch("/", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    const requiredBodyFields = ["title"];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    await updateWebsiteNotificationsPage({ ...validatedRequestBody, ...req.body });
    return res.status(200).json(await getWebsiteNotificationsPage());
});

module.exports = router;
