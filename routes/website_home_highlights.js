const libExpress = require("express");
const { getAllWebsiteHomeHighlights, getWebsiteHomeHighlightById, addWebsiteHomeHighlight, updateWebsiteHomeHighlightById, deleteWebsiteHomeHighlightById } = require("../db/website_home_highlights");
const { validateRequestBody } = require("sahas_utils");
const requires_authority = require("../middlewares/requires_authority");
const { AUTHORITIES } = require("../constants");

const router = libExpress.Router();

router.get("/", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    return res.status(200).json(await getAllWebsiteHomeHighlights());
});

router.get("/:id", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing Website Home Highlight Id" });
    }

    const websiteHomeHighlight = await getWebsiteHomeHighlightById({ id: req.params.id });
    if (!websiteHomeHighlight) {
        return res.status(400).json({ error: "Website Home Highlight Not Exist" });
    }

    return res.status(200).json(websiteHomeHighlight);
});

router.post("/", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    const requiredBodyFields = ["title"];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    const id = await addWebsiteHomeHighlight({ ...validatedRequestBody, ...req.body });
    const created = await getWebsiteHomeHighlightById({ id });
    if (!created) {
        return res.status(400).json({ error: "Failed To Add Website Home Highlight" });
    }

    return res.status(201).json(created);
});

router.patch("/", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    const requiredBodyFields = ["id", ...["title"]];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    const existing = await getWebsiteHomeHighlightById({ id: validatedRequestBody.id });
    if (!existing) {
        return res.status(400).json({ error: "Website Home Highlight Not Exist" });
    }

    const updated = await updateWebsiteHomeHighlightById({ ...validatedRequestBody, ...req.body });
    if (!updated) {
        return res.status(400).json({ error: "Failed To Save" });
    }
    return res.status(200).json(await getWebsiteHomeHighlightById({ id: validatedRequestBody.id }));
});

router.delete("/:id", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing Website Home Highlight Id" });
    }

    const existing = await getWebsiteHomeHighlightById({ id: req.params.id });
    if (!existing) {
        return res.status(400).json({ error: "Website Home Highlight Not Exist" });
    }

    const removed = await deleteWebsiteHomeHighlightById({ id: req.params.id });
    if (!removed) {
        return res.status(400).json({ error: "Failed To Delete" });
    }
    return res.sendStatus(204);
});

module.exports = router;
