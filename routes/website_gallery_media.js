const libExpress = require("express");
const { getAllWebsiteGalleryMedia, getWebsiteGalleryMediaById, addWebsiteGalleryMedia, updateWebsiteGalleryMediaById, deleteWebsiteGalleryMediaById } = require("../db/website_gallery_media");
const { validateRequestBody } = require("sahas_utils");
const requires_authority = require("../middlewares/requires_authority");
const { AUTHORITIES } = require("../constants");

const router = libExpress.Router();

router.get("/", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    return res.status(200).json(await getAllWebsiteGalleryMedia());
});

router.get("/:id", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing Website Gallery Media Id" });
    }

    const websiteGalleryMedia = await getWebsiteGalleryMediaById({ id: req.params.id });
    if (!websiteGalleryMedia) {
        return res.status(400).json({ error: "Website Gallery Media Not Exist" });
    }

    return res.status(200).json(websiteGalleryMedia);
});

router.post("/", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    const requiredBodyFields = ["album_public_id","url"];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    const id = await addWebsiteGalleryMedia({ ...validatedRequestBody, ...req.body });
    const created = await getWebsiteGalleryMediaById({ id });
    if (!created) {
        return res.status(400).json({ error: "Failed To Add Website Gallery Media" });
    }

    return res.status(201).json(created);
});

router.patch("/", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    const requiredBodyFields = ["id", ...["album_public_id","url"]];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    const existing = await getWebsiteGalleryMediaById({ id: validatedRequestBody.id });
    if (!existing) {
        return res.status(400).json({ error: "Website Gallery Media Not Exist" });
    }

    await updateWebsiteGalleryMediaById({ ...validatedRequestBody, ...req.body });
    return res.status(200).json(await getWebsiteGalleryMediaById({ id: validatedRequestBody.id }));
});

router.delete("/:id", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing Website Gallery Media Id" });
    }

    const existing = await getWebsiteGalleryMediaById({ id: req.params.id });
    if (!existing) {
        return res.status(400).json({ error: "Website Gallery Media Not Exist" });
    }

    await deleteWebsiteGalleryMediaById({ id: req.params.id });
    return res.sendStatus(204);
});

module.exports = router;
