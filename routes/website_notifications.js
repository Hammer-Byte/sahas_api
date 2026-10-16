const libExpress = require("express");
const { getAllWebsiteNotifications, getWebsiteNotificationById, addWebsiteNotification, updateWebsiteNotificationById, deleteWebsiteNotificationById } = require("../db/website_notifications");
const { validateRequestBody } = require("sahas_utils");
const requires_authority = require("../middlewares/requires_authority");
const { AUTHORITIES } = require("../constants");

const router = libExpress.Router();

router.get("/", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    return res.status(200).json(await getAllWebsiteNotifications());
});

router.get("/:id", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing Website Notification Id" });
    }

    const websiteNotification = await getWebsiteNotificationById({ id: req.params.id });
    if (!websiteNotification) {
        return res.status(400).json({ error: "Website Notification Not Exist" });
    }

    return res.status(200).json(websiteNotification);
});

router.post("/", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    const requiredBodyFields = ["title"];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    const id = await addWebsiteNotification({ ...validatedRequestBody, ...req.body });
    const created = await getWebsiteNotificationById({ id });
    if (!created) {
        return res.status(400).json({ error: "Failed To Add Website Notification" });
    }

    return res.status(201).json(created);
});

router.patch("/", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    const requiredBodyFields = ["id", ...["title"]];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    const existing = await getWebsiteNotificationById({ id: validatedRequestBody.id });
    if (!existing) {
        return res.status(400).json({ error: "Website Notification Not Exist" });
    }

    await updateWebsiteNotificationById({ ...validatedRequestBody, ...req.body });
    return res.status(200).json(await getWebsiteNotificationById({ id: validatedRequestBody.id }));
});

router.delete("/:id", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing Website Notification Id" });
    }

    const existing = await getWebsiteNotificationById({ id: req.params.id });
    if (!existing) {
        return res.status(400).json({ error: "Website Notification Not Exist" });
    }

    await deleteWebsiteNotificationById({ id: req.params.id });
    return res.sendStatus(204);
});

module.exports = router;
