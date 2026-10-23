const libExpress = require("express");
const { getAllWebsiteNotificationFiles, getWebsiteNotificationFileById, addWebsiteNotificationFile, updateWebsiteNotificationFileById, deleteWebsiteNotificationFileById } = require("../db/website_notification_files");
const { validateRequestBody } = require("sahas_utils");
const requires_authority = require("../middlewares/requires_authority");
const { AUTHORITIES } = require("../constants");

const router = libExpress.Router();

router.get("/", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    return res.status(200).json(await getAllWebsiteNotificationFiles());
});

router.get("/:id", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing Website Notification File Id" });
    }

    const websiteNotificationFile = await getWebsiteNotificationFileById({ id: req.params.id });
    if (!websiteNotificationFile) {
        return res.status(400).json({ error: "Website Notification File Not Exist" });
    }

    return res.status(200).json(websiteNotificationFile);
});

router.post("/", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    const requiredBodyFields = ["notification_public_id","url"];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    const id = await addWebsiteNotificationFile({ ...validatedRequestBody, ...req.body });
    const created = await getWebsiteNotificationFileById({ id });
    if (!created) {
        return res.status(400).json({ error: "Failed To Add Website Notification File" });
    }

    return res.status(201).json(created);
});

router.patch("/", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    const requiredBodyFields = ["id", ...["notification_public_id","url"]];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    const existing = await getWebsiteNotificationFileById({ id: validatedRequestBody.id });
    if (!existing) {
        return res.status(400).json({ error: "Website Notification File Not Exist" });
    }

    const updated = await updateWebsiteNotificationFileById({ ...validatedRequestBody, ...req.body });
    if (!updated) {
        return res.status(400).json({ error: "Failed To Save" });
    }
    return res.status(200).json(await getWebsiteNotificationFileById({ id: validatedRequestBody.id }));
});

router.delete("/:id", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing Website Notification File Id" });
    }

    const existing = await getWebsiteNotificationFileById({ id: req.params.id });
    if (!existing) {
        return res.status(400).json({ error: "Website Notification File Not Exist" });
    }

    const removed = await deleteWebsiteNotificationFileById({ id: req.params.id });
    if (!removed) {
        return res.status(400).json({ error: "Failed To Delete" });
    }
    return res.sendStatus(204);
});

module.exports = router;
