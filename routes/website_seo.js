const libExpress = require("express");
const { getAllWebsiteSeo, getWebsiteSeoById, addWebsiteSeo, updateWebsiteSeoById, deleteWebsiteSeoById } = require("../db/website_seo");
const { validateRequestBody } = require("sahas_utils");
const requires_authority = require("../middlewares/requires_authority");
const { AUTHORITIES } = require("../constants");

const router = libExpress.Router();

router.get("/", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    return res.status(200).json(await getAllWebsiteSeo());
});

router.get("/:id", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing Website Seo Id" });
    }

    const websiteSeo = await getWebsiteSeoById({ id: req.params.id });
    if (!websiteSeo) {
        return res.status(400).json({ error: "Website Seo Not Exist" });
    }

    return res.status(200).json(websiteSeo);
});

router.post("/", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    const requiredBodyFields = ["owner_type","owner_key"];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    const id = await addWebsiteSeo({ ...validatedRequestBody, ...req.body });
    const created = await getWebsiteSeoById({ id });
    if (!created) {
        return res.status(400).json({ error: "Failed To Add Website Seo" });
    }

    return res.status(201).json(created);
});

router.patch("/", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    const requiredBodyFields = ["id", ...["owner_type","owner_key"]];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    const existing = await getWebsiteSeoById({ id: validatedRequestBody.id });
    if (!existing) {
        return res.status(400).json({ error: "Website Seo Not Exist" });
    }

    const updated = await updateWebsiteSeoById({ ...validatedRequestBody, ...req.body });
    if (!updated) {
        return res.status(400).json({ error: "Failed To Save" });
    }
    return res.status(200).json(await getWebsiteSeoById({ id: validatedRequestBody.id }));
});

router.delete("/:id", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing Website Seo Id" });
    }

    const existing = await getWebsiteSeoById({ id: req.params.id });
    if (!existing) {
        return res.status(400).json({ error: "Website Seo Not Exist" });
    }

    const removed = await deleteWebsiteSeoById({ id: req.params.id });
    if (!removed) {
        return res.status(400).json({ error: "Failed To Delete" });
    }
    return res.sendStatus(204);
});

module.exports = router;
