const libExpress = require("express");
const { getAllWebsiteHomeBrochureCards, getWebsiteHomeBrochureCardById, addWebsiteHomeBrochureCard, updateWebsiteHomeBrochureCardById, deleteWebsiteHomeBrochureCardById } = require("../db/website_home_brochure_cards");
const { validateRequestBody } = require("sahas_utils");
const requires_authority = require("../middlewares/requires_authority");
const { AUTHORITIES } = require("../constants");

const router = libExpress.Router();

router.get("/", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    return res.status(200).json(await getAllWebsiteHomeBrochureCards());
});

router.get("/:id", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing Website Home Brochure Card Id" });
    }

    const websiteHomeBrochureCard = await getWebsiteHomeBrochureCardById({ id: req.params.id });
    if (!websiteHomeBrochureCard) {
        return res.status(400).json({ error: "Website Home Brochure Card Not Exist" });
    }

    return res.status(200).json(websiteHomeBrochureCard);
});

router.post("/", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    const requiredBodyFields = ["title"];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    const id = await addWebsiteHomeBrochureCard({ ...validatedRequestBody, ...req.body });
    const created = await getWebsiteHomeBrochureCardById({ id });
    if (!created) {
        return res.status(400).json({ error: "Failed To Add Website Home Brochure Card" });
    }

    return res.status(201).json(created);
});

router.patch("/", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    const requiredBodyFields = ["id", ...["title"]];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    const existing = await getWebsiteHomeBrochureCardById({ id: validatedRequestBody.id });
    if (!existing) {
        return res.status(400).json({ error: "Website Home Brochure Card Not Exist" });
    }

    await updateWebsiteHomeBrochureCardById({ ...validatedRequestBody, ...req.body });
    return res.status(200).json(await getWebsiteHomeBrochureCardById({ id: validatedRequestBody.id }));
});

router.delete("/:id", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing Website Home Brochure Card Id" });
    }

    const existing = await getWebsiteHomeBrochureCardById({ id: req.params.id });
    if (!existing) {
        return res.status(400).json({ error: "Website Home Brochure Card Not Exist" });
    }

    await deleteWebsiteHomeBrochureCardById({ id: req.params.id });
    return res.sendStatus(204);
});

module.exports = router;
