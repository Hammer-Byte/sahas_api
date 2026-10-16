const libExpress = require("express");
const { getWebsiteContact, updateWebsiteContact } = require("../db/website_contact");
const { validateRequestBody } = require("sahas_utils");
const requires_authority = require("../middlewares/requires_authority");
const { AUTHORITIES } = require("../constants");

const router = libExpress.Router();

router.get("/", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    const record = await getWebsiteContact();
    if (!record) {
        return res.status(400).json({ error: "Website Contact Not Exist" });
    }
    return res.status(200).json(record);
});

router.patch("/", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    const requiredBodyFields = ["title"];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    await updateWebsiteContact({ ...validatedRequestBody, ...req.body });
    return res.status(200).json(await getWebsiteContact());
});

module.exports = router;
