const libExpress = require("express");
const { getAllWebsiteSocialLinks, getWebsiteSocialLinkById, addWebsiteSocialLink, updateWebsiteSocialLinkById, deleteWebsiteSocialLinkById } = require("../db/website_social_links");
const { validateRequestBody } = require("sahas_utils");
const requires_authority = require("../middlewares/requires_authority");
const { AUTHORITIES } = require("../constants");

const router = libExpress.Router();

router.get("/", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    return res.status(200).json(await getAllWebsiteSocialLinks());
});

router.get("/:id", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing Website Social Link Id" });
    }

    const websiteSocialLink = await getWebsiteSocialLinkById({ id: req.params.id });
    if (!websiteSocialLink) {
        return res.status(400).json({ error: "Website Social Link Not Exist" });
    }

    return res.status(200).json(websiteSocialLink);
});

router.post("/", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    const requiredBodyFields = ["url"];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    const id = await addWebsiteSocialLink({ ...validatedRequestBody, ...req.body });
    const created = await getWebsiteSocialLinkById({ id });
    if (!created) {
        return res.status(400).json({ error: "Failed To Add Website Social Link" });
    }

    return res.status(201).json(created);
});

router.patch("/", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    const requiredBodyFields = ["id", ...["url"]];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    const existing = await getWebsiteSocialLinkById({ id: validatedRequestBody.id });
    if (!existing) {
        return res.status(400).json({ error: "Website Social Link Not Exist" });
    }

    await updateWebsiteSocialLinkById({ ...validatedRequestBody, ...req.body });
    return res.status(200).json(await getWebsiteSocialLinkById({ id: validatedRequestBody.id }));
});

router.delete("/:id", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing Website Social Link Id" });
    }

    const existing = await getWebsiteSocialLinkById({ id: req.params.id });
    if (!existing) {
        return res.status(400).json({ error: "Website Social Link Not Exist" });
    }

    await deleteWebsiteSocialLinkById({ id: req.params.id });
    return res.sendStatus(204);
});

module.exports = router;
