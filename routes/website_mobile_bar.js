const libExpress = require("express");
const { getWebsiteMobileBar, updateWebsiteMobileBar } = require("../db/website_mobile_bar");
const { validateRequestBody } = require("sahas_utils");
const requires_authority = require("../middlewares/requires_authority");
const { AUTHORITIES } = require("../constants");

const router = libExpress.Router();

router.get("/", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    const record = await getWebsiteMobileBar();
    if (!record) {
        return res.status(400).json({ error: "Website Mobile Bar Not Exist" });
    }
    return res.status(200).json(record);
});

router.patch("/", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    const requiredBodyFields = ["mobile_phone"];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    await updateWebsiteMobileBar({ ...validatedRequestBody, ...req.body });
    return res.status(200).json(await getWebsiteMobileBar());
});

module.exports = router;
