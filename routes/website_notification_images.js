const libExpress = require("express");
const { getAllWebsiteNotificationImages, getWebsiteNotificationImageById, addWebsiteNotificationImage, updateWebsiteNotificationImageById, deleteWebsiteNotificationImageById } = require("../db/website_notification_images");
const { validateRequestBody } = require("sahas_utils");
const requires_authority = require("../middlewares/requires_authority");
const { AUTHORITIES } = require("../constants");

const router = libExpress.Router();

router.get("/", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    return res.status(200).json(await getAllWebsiteNotificationImages());
});

router.get("/:id", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing Website Notification Image Id" });
    }

    const websiteNotificationImage = await getWebsiteNotificationImageById({ id: req.params.id });
    if (!websiteNotificationImage) {
        return res.status(400).json({ error: "Website Notification Image Not Exist" });
    }

    return res.status(200).json(websiteNotificationImage);
});

router.post("/", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    const requiredBodyFields = ["notification_public_id","url"];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    const id = await addWebsiteNotificationImage({ ...validatedRequestBody, ...req.body });
    const created = await getWebsiteNotificationImageById({ id });
    if (!created) {
        return res.status(400).json({ error: "Failed To Add Website Notification Image" });
    }

    return res.status(201).json(created);
});

router.patch("/", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    const requiredBodyFields = ["id", ...["notification_public_id","url"]];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    const existing = await getWebsiteNotificationImageById({ id: validatedRequestBody.id });
    if (!existing) {
        return res.status(400).json({ error: "Website Notification Image Not Exist" });
    }

    const updated = await updateWebsiteNotificationImageById({ ...validatedRequestBody, ...req.body });
    if (!updated) {
        return res.status(400).json({ error: "Failed To Save" });
    }
    return res.status(200).json(await getWebsiteNotificationImageById({ id: validatedRequestBody.id }));
});

router.delete("/:id", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing Website Notification Image Id" });
    }

    const existing = await getWebsiteNotificationImageById({ id: req.params.id });
    if (!existing) {
        return res.status(400).json({ error: "Website Notification Image Not Exist" });
    }

    const removed = await deleteWebsiteNotificationImageById({ id: req.params.id });
    if (!removed) {
        return res.status(400).json({ error: "Failed To Delete" });
    }
    return res.sendStatus(204);
});

module.exports = router;
