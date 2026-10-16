const libExpress = require("express");
const { getAllWebsiteBrochures, getWebsiteBrochureById, addWebsiteBrochure, updateWebsiteBrochureById, deleteWebsiteBrochureById } = require("../db/website_brochures");
const { validateRequestBody } = require("sahas_utils");
const requires_authority = require("../middlewares/requires_authority");
const { AUTHORITIES } = require("../constants");

const router = libExpress.Router();

router.get("/", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    return res.status(200).json(await getAllWebsiteBrochures());
});

router.get("/:id", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing Website Brochure Id" });
    }

    const websiteBrochure = await getWebsiteBrochureById({ id: req.params.id });
    if (!websiteBrochure) {
        return res.status(400).json({ error: "Website Brochure Not Exist" });
    }

    return res.status(200).json(websiteBrochure);
});

router.post("/", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    const requiredBodyFields = ["title"];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    const id = await addWebsiteBrochure({ ...validatedRequestBody, ...req.body });
    const created = await getWebsiteBrochureById({ id });
    if (!created) {
        return res.status(400).json({ error: "Failed To Add Website Brochure" });
    }

    return res.status(201).json(created);
});

router.patch("/", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    const requiredBodyFields = ["id", ...["title"]];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    const existing = await getWebsiteBrochureById({ id: validatedRequestBody.id });
    if (!existing) {
        return res.status(400).json({ error: "Website Brochure Not Exist" });
    }

    await updateWebsiteBrochureById({ ...validatedRequestBody, ...req.body });
    return res.status(200).json(await getWebsiteBrochureById({ id: validatedRequestBody.id }));
});

router.delete("/:id", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing Website Brochure Id" });
    }

    const existing = await getWebsiteBrochureById({ id: req.params.id });
    if (!existing) {
        return res.status(400).json({ error: "Website Brochure Not Exist" });
    }

    await deleteWebsiteBrochureById({ id: req.params.id });
    return res.sendStatus(204);
});

module.exports = router;
