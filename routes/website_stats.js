const libExpress = require("express");
const { getAllWebsiteStats, getWebsiteStatById, addWebsiteStat, updateWebsiteStatById, deleteWebsiteStatById } = require("../db/website_stats");
const { validateRequestBody } = require("sahas_utils");
const requires_authority = require("../middlewares/requires_authority");
const { AUTHORITIES } = require("../constants");

const router = libExpress.Router();

router.get("/", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    return res.status(200).json(await getAllWebsiteStats());
});

router.get("/:id", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing Website Stat Id" });
    }

    const websiteStat = await getWebsiteStatById({ id: req.params.id });
    if (!websiteStat) {
        return res.status(400).json({ error: "Website Stat Not Exist" });
    }

    return res.status(200).json(websiteStat);
});

router.post("/", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    const requiredBodyFields = ["value_text"];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    const id = await addWebsiteStat({ ...validatedRequestBody, ...req.body });
    const created = await getWebsiteStatById({ id });
    if (!created) {
        return res.status(400).json({ error: "Failed To Add Website Stat" });
    }

    return res.status(201).json(created);
});

router.patch("/", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    const requiredBodyFields = ["id", ...["value_text"]];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    const existing = await getWebsiteStatById({ id: validatedRequestBody.id });
    if (!existing) {
        return res.status(400).json({ error: "Website Stat Not Exist" });
    }

    await updateWebsiteStatById({ ...validatedRequestBody, ...req.body });
    return res.status(200).json(await getWebsiteStatById({ id: validatedRequestBody.id }));
});

router.delete("/:id", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing Website Stat Id" });
    }

    const existing = await getWebsiteStatById({ id: req.params.id });
    if (!existing) {
        return res.status(400).json({ error: "Website Stat Not Exist" });
    }

    await deleteWebsiteStatById({ id: req.params.id });
    return res.sendStatus(204);
});

module.exports = router;
