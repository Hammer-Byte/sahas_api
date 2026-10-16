const libExpress = require("express");
const { getAllWebsiteHomeAppFeatures, getWebsiteHomeAppFeatureById, addWebsiteHomeAppFeature, updateWebsiteHomeAppFeatureById, deleteWebsiteHomeAppFeatureById } = require("../db/website_home_app_features");
const { validateRequestBody } = require("sahas_utils");
const requires_authority = require("../middlewares/requires_authority");
const { AUTHORITIES } = require("../constants");

const router = libExpress.Router();

router.get("/", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    return res.status(200).json(await getAllWebsiteHomeAppFeatures());
});

router.get("/:id", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing Website Home App Feature Id" });
    }

    const websiteHomeAppFeature = await getWebsiteHomeAppFeatureById({ id: req.params.id });
    if (!websiteHomeAppFeature) {
        return res.status(400).json({ error: "Website Home App Feature Not Exist" });
    }

    return res.status(200).json(websiteHomeAppFeature);
});

router.post("/", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    const requiredBodyFields = ["title"];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    const id = await addWebsiteHomeAppFeature({ ...validatedRequestBody, ...req.body });
    const created = await getWebsiteHomeAppFeatureById({ id });
    if (!created) {
        return res.status(400).json({ error: "Failed To Add Website Home App Feature" });
    }

    return res.status(201).json(created);
});

router.patch("/", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    const requiredBodyFields = ["id", ...["title"]];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    const existing = await getWebsiteHomeAppFeatureById({ id: validatedRequestBody.id });
    if (!existing) {
        return res.status(400).json({ error: "Website Home App Feature Not Exist" });
    }

    await updateWebsiteHomeAppFeatureById({ ...validatedRequestBody, ...req.body });
    return res.status(200).json(await getWebsiteHomeAppFeatureById({ id: validatedRequestBody.id }));
});

router.delete("/:id", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing Website Home App Feature Id" });
    }

    const existing = await getWebsiteHomeAppFeatureById({ id: req.params.id });
    if (!existing) {
        return res.status(400).json({ error: "Website Home App Feature Not Exist" });
    }

    await deleteWebsiteHomeAppFeatureById({ id: req.params.id });
    return res.sendStatus(204);
});

module.exports = router;
