const libExpress = require("express");
const { getWebsiteHeader, updateWebsiteHeader } = require("../db/website_header");
const { validateRequestBody } = require("sahas_utils");
const requires_authority = require("../middlewares/requires_authority");
const { AUTHORITIES } = require("../constants");

const router = libExpress.Router();

router.get("/", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    const record = await getWebsiteHeader();
    if (!record) {
        return res.status(400).json({ error: "Website Header Not Exist" });
    }
    return res.status(200).json(record);
});

router.patch("/", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    const requiredBodyFields = ["header_brand_name"];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    await updateWebsiteHeader({ ...validatedRequestBody, ...req.body });
    return res.status(200).json(await getWebsiteHeader());
});

module.exports = router;
