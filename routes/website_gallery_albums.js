const libExpress = require("express");
const { getAllWebsiteGalleryAlbums, getWebsiteGalleryAlbumById, addWebsiteGalleryAlbum, updateWebsiteGalleryAlbumById, deleteWebsiteGalleryAlbumById } = require("../db/website_gallery_albums");
const { validateRequestBody } = require("sahas_utils");
const requires_authority = require("../middlewares/requires_authority");
const { AUTHORITIES } = require("../constants");

const router = libExpress.Router();

router.get("/", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    return res.status(200).json(await getAllWebsiteGalleryAlbums());
});

router.get("/:id", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing Website Gallery Album Id" });
    }

    const websiteGalleryAlbum = await getWebsiteGalleryAlbumById({ id: req.params.id });
    if (!websiteGalleryAlbum) {
        return res.status(400).json({ error: "Website Gallery Album Not Exist" });
    }

    return res.status(200).json(websiteGalleryAlbum);
});

router.post("/", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    const requiredBodyFields = ["title","category_slug"];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    const id = await addWebsiteGalleryAlbum({ ...validatedRequestBody, ...req.body });
    const created = await getWebsiteGalleryAlbumById({ id });
    if (!created) {
        return res.status(400).json({ error: "Failed To Add Website Gallery Album" });
    }

    return res.status(201).json(created);
});

router.patch("/", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    const requiredBodyFields = ["id", ...["title","category_slug"]];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    const existing = await getWebsiteGalleryAlbumById({ id: validatedRequestBody.id });
    if (!existing) {
        return res.status(400).json({ error: "Website Gallery Album Not Exist" });
    }

    const updated = await updateWebsiteGalleryAlbumById({ ...validatedRequestBody, ...req.body });
    if (!updated) {
        return res.status(400).json({ error: "Failed To Save" });
    }
    return res.status(200).json(await getWebsiteGalleryAlbumById({ id: validatedRequestBody.id }));
});

router.delete("/:id", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing Website Gallery Album Id" });
    }

    const existing = await getWebsiteGalleryAlbumById({ id: req.params.id });
    if (!existing) {
        return res.status(400).json({ error: "Website Gallery Album Not Exist" });
    }

    const removed = await deleteWebsiteGalleryAlbumById({ id: req.params.id });
    if (!removed) {
        return res.status(400).json({ error: "Failed To Delete" });
    }
    return res.sendStatus(204);
});

module.exports = router;
