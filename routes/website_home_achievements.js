const libExpress = require("express");
const { getAllWebsiteHomeAchievements, getWebsiteHomeAchievementById, addWebsiteHomeAchievement, updateWebsiteHomeAchievementById, deleteWebsiteHomeAchievementById } = require("../db/website_home_achievements");
const { validateRequestBody } = require("sahas_utils");
const requires_authority = require("../middlewares/requires_authority");
const { AUTHORITIES } = require("../constants");

const router = libExpress.Router();

router.get("/", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    return res.status(200).json(await getAllWebsiteHomeAchievements());
});

router.get("/:id", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing Website Home Achievement Id" });
    }

    const websiteHomeAchievement = await getWebsiteHomeAchievementById({ id: req.params.id });
    if (!websiteHomeAchievement) {
        return res.status(400).json({ error: "Website Home Achievement Not Exist" });
    }

    return res.status(200).json(websiteHomeAchievement);
});

router.post("/", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    const requiredBodyFields = ["title"];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    const id = await addWebsiteHomeAchievement({ ...validatedRequestBody, ...req.body });
    const created = await getWebsiteHomeAchievementById({ id });
    if (!created) {
        return res.status(400).json({ error: "Failed To Add Website Home Achievement" });
    }

    return res.status(201).json(created);
});

router.patch("/", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    const requiredBodyFields = ["id", ...["title"]];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    const existing = await getWebsiteHomeAchievementById({ id: validatedRequestBody.id });
    if (!existing) {
        return res.status(400).json({ error: "Website Home Achievement Not Exist" });
    }

    await updateWebsiteHomeAchievementById({ ...validatedRequestBody, ...req.body });
    return res.status(200).json(await getWebsiteHomeAchievementById({ id: validatedRequestBody.id }));
});

router.delete("/:id", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing Website Home Achievement Id" });
    }

    const existing = await getWebsiteHomeAchievementById({ id: req.params.id });
    if (!existing) {
        return res.status(400).json({ error: "Website Home Achievement Not Exist" });
    }

    await deleteWebsiteHomeAchievementById({ id: req.params.id });
    return res.sendStatus(204);
});

module.exports = router;
