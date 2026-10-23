const libExpress = require("express");
const { getAllWebsiteGalleryCategories, getWebsiteGalleryCategoryById, addWebsiteGalleryCategory, updateWebsiteGalleryCategoryById, deleteWebsiteGalleryCategoryById } = require("../db/website_gallery_categories");
const { validateRequestBody } = require("sahas_utils");
const requires_authority = require("../middlewares/requires_authority");
const { AUTHORITIES } = require("../constants");

const router = libExpress.Router();

router.get("/", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    return res.status(200).json(await getAllWebsiteGalleryCategories());
});

router.get("/:id", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing Website Gallery Category Id" });
    }

    const websiteGalleryCategory = await getWebsiteGalleryCategoryById({ id: req.params.id });
    if (!websiteGalleryCategory) {
        return res.status(400).json({ error: "Website Gallery Category Not Exist" });
    }

    return res.status(200).json(websiteGalleryCategory);
});

router.post("/", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    const requiredBodyFields = ["title"];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    const id = await addWebsiteGalleryCategory({ ...validatedRequestBody, ...req.body });
    const created = await getWebsiteGalleryCategoryById({ id });
    if (!created) {
        return res.status(400).json({ error: "Failed To Add Website Gallery Category" });
    }

    return res.status(201).json(created);
});

router.patch("/", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    const requiredBodyFields = ["id", ...["title"]];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    const existing = await getWebsiteGalleryCategoryById({ id: validatedRequestBody.id });
    if (!existing) {
        return res.status(400).json({ error: "Website Gallery Category Not Exist" });
    }

    const updated = await updateWebsiteGalleryCategoryById({ ...validatedRequestBody, ...req.body });
    if (!updated) {
        return res.status(400).json({ error: "Failed To Save" });
    }
    return res.status(200).json(await getWebsiteGalleryCategoryById({ id: validatedRequestBody.id }));
});

router.delete("/:id", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing Website Gallery Category Id" });
    }

    const existing = await getWebsiteGalleryCategoryById({ id: req.params.id });
    if (!existing) {
        return res.status(400).json({ error: "Website Gallery Category Not Exist" });
    }

    const removed = await deleteWebsiteGalleryCategoryById({ id: req.params.id });
    if (!removed) {
        return res.status(400).json({ error: "Failed To Delete" });
    }
    return res.sendStatus(204);
});

module.exports = router;
