const libExpress = require("express");
const { getAllWebsiteLinks, getWebsiteLinkById, addWebsiteLink, updateWebsiteLinkById, deleteWebsiteLinkById } = require("../db/website_links");
const { validateRequestBody } = require("sahas_utils");
const requires_authority = require("../middlewares/requires_authority");
const { AUTHORITIES } = require("../constants");

const router = libExpress.Router();

router.get("/", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    return res.status(200).json(await getAllWebsiteLinks());
});

router.get("/:id", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing Website Link Id" });
    }

    const websiteLink = await getWebsiteLinkById({ id: req.params.id });
    if (!websiteLink) {
        return res.status(400).json({ error: "Website Link Not Exist" });
    }

    return res.status(200).json(websiteLink);
});

router.post("/", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    const requiredBodyFields = ["group_key","label","href"];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    const id = await addWebsiteLink({ ...validatedRequestBody, ...req.body });
    const created = await getWebsiteLinkById({ id });
    if (!created) {
        return res.status(400).json({ error: "Failed To Add Website Link" });
    }

    return res.status(201).json(created);
});

router.patch("/", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    const requiredBodyFields = ["id", ...["group_key","label","href"]];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    const existing = await getWebsiteLinkById({ id: validatedRequestBody.id });
    if (!existing) {
        return res.status(400).json({ error: "Website Link Not Exist" });
    }

    await updateWebsiteLinkById({ ...validatedRequestBody, ...req.body });
    return res.status(200).json(await getWebsiteLinkById({ id: validatedRequestBody.id }));
});

router.delete("/:id", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing Website Link Id" });
    }

    const existing = await getWebsiteLinkById({ id: req.params.id });
    if (!existing) {
        return res.status(400).json({ error: "Website Link Not Exist" });
    }

    await deleteWebsiteLinkById({ id: req.params.id });
    return res.sendStatus(204);
});

module.exports = router;
