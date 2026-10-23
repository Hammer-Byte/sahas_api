const libExpress = require("express");
const { getAllWebsiteCourseFeatures, getWebsiteCourseFeatureById, addWebsiteCourseFeature, updateWebsiteCourseFeatureById, deleteWebsiteCourseFeatureById } = require("../db/website_course_features");
const { validateRequestBody } = require("sahas_utils");
const requires_authority = require("../middlewares/requires_authority");
const { AUTHORITIES } = require("../constants");

const router = libExpress.Router();

router.get("/", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    return res.status(200).json(await getAllWebsiteCourseFeatures());
});

router.get("/:id", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing Website Course Feature Id" });
    }

    const websiteCourseFeature = await getWebsiteCourseFeatureById({ id: req.params.id });
    if (!websiteCourseFeature) {
        return res.status(400).json({ error: "Website Course Feature Not Exist" });
    }

    return res.status(200).json(websiteCourseFeature);
});

router.post("/", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    const requiredBodyFields = ["course_public_id","title"];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    const id = await addWebsiteCourseFeature({ ...validatedRequestBody, ...req.body });
    const created = await getWebsiteCourseFeatureById({ id });
    if (!created) {
        return res.status(400).json({ error: "Failed To Add Website Course Feature" });
    }

    return res.status(201).json(created);
});

router.patch("/", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    const requiredBodyFields = ["id", ...["course_public_id","title"]];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    const existing = await getWebsiteCourseFeatureById({ id: validatedRequestBody.id });
    if (!existing) {
        return res.status(400).json({ error: "Website Course Feature Not Exist" });
    }

    const updated = await updateWebsiteCourseFeatureById({ ...validatedRequestBody, ...req.body });
    if (!updated) {
        return res.status(400).json({ error: "Failed To Save" });
    }
    return res.status(200).json(await getWebsiteCourseFeatureById({ id: validatedRequestBody.id }));
});

router.delete("/:id", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing Website Course Feature Id" });
    }

    const existing = await getWebsiteCourseFeatureById({ id: req.params.id });
    if (!existing) {
        return res.status(400).json({ error: "Website Course Feature Not Exist" });
    }

    const removed = await deleteWebsiteCourseFeatureById({ id: req.params.id });
    if (!removed) {
        return res.status(400).json({ error: "Failed To Delete" });
    }
    return res.sendStatus(204);
});

module.exports = router;
