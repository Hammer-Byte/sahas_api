const libExpress = require("express");
const { getAllWebsiteHomeGalleryTiles, getWebsiteHomeGalleryTileById, addWebsiteHomeGalleryTile, updateWebsiteHomeGalleryTileById, deleteWebsiteHomeGalleryTileById } = require("../db/website_home_gallery_tiles");
const { validateRequestBody } = require("sahas_utils");
const requires_authority = require("../middlewares/requires_authority");
const { AUTHORITIES } = require("../constants");

const router = libExpress.Router();

router.get("/", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    return res.status(200).json(await getAllWebsiteHomeGalleryTiles());
});

router.get("/:id", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing Website Home Gallery Tile Id" });
    }

    const websiteHomeGalleryTile = await getWebsiteHomeGalleryTileById({ id: req.params.id });
    if (!websiteHomeGalleryTile) {
        return res.status(400).json({ error: "Website Home Gallery Tile Not Exist" });
    }

    return res.status(200).json(websiteHomeGalleryTile);
});

router.post("/", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    const requiredBodyFields = ["title"];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    const id = await addWebsiteHomeGalleryTile({ ...validatedRequestBody, ...req.body });
    const created = await getWebsiteHomeGalleryTileById({ id });
    if (!created) {
        return res.status(400).json({ error: "Failed To Add Website Home Gallery Tile" });
    }

    return res.status(201).json(created);
});

router.patch("/", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    const requiredBodyFields = ["id", ...["title"]];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    const existing = await getWebsiteHomeGalleryTileById({ id: validatedRequestBody.id });
    if (!existing) {
        return res.status(400).json({ error: "Website Home Gallery Tile Not Exist" });
    }

    const updated = await updateWebsiteHomeGalleryTileById({ ...validatedRequestBody, ...req.body });
    if (!updated) {
        return res.status(400).json({ error: "Failed To Save" });
    }
    return res.status(200).json(await getWebsiteHomeGalleryTileById({ id: validatedRequestBody.id }));
});

router.delete("/:id", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing Website Home Gallery Tile Id" });
    }

    const existing = await getWebsiteHomeGalleryTileById({ id: req.params.id });
    if (!existing) {
        return res.status(400).json({ error: "Website Home Gallery Tile Not Exist" });
    }

    const removed = await deleteWebsiteHomeGalleryTileById({ id: req.params.id });
    if (!removed) {
        return res.status(400).json({ error: "Failed To Delete" });
    }
    return res.sendStatus(204);
});

module.exports = router;
