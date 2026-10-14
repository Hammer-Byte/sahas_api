const libExpress = require("express");
const { getWebsiteFooter, updateWebsiteFooter } = require("../db/website_footer");
const { validateRequestBody } = require("sahas_utils");
const requires_authority = require("../middlewares/requires_authority");
const { AUTHORITIES } = require("../constants");

const router = libExpress.Router();

router.get("/", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    const record = await getWebsiteFooter();
    if (!record) {
        return res.status(400).json({ error: "Website Footer Not Exist" });
    }
    return res.status(200).json(record);
});

router.patch("/", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    const requiredBodyFields = ["footer_description"];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    await updateWebsiteFooter({ ...validatedRequestBody, ...req.body });
    return res.status(200).json(await getWebsiteFooter());
});

module.exports = router;
