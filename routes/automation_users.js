const libExpress = require("express");
const { validateRequestBody } = require("sahas_utils");
const { AUTHORITIES } = require("../constants");
const requires_authority = require("../middlewares/requires_authority");
const {
    getAllAutomationUsers,
    getAutomationUserById,
    addAutomationUser,
    updateAutomationUserById,
    deleteAutomationUserById,
} = require("../db/automation_users");

const router = libExpress.Router();

function normalizeOptional(value) {
    if (value === undefined || value === null) return null;
    const trimmed = String(value).trim();
    return trimmed.length ? trimmed : null;
}

router.get("/", requires_authority(AUTHORITIES.USE_PAGE_CONTENT_PUBLISHING), async (req, res) => {
    return res.status(200).json(await getAllAutomationUsers());
});

router.get("/:id", requires_authority(AUTHORITIES.USE_PAGE_CONTENT_PUBLISHING), async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing Automation User Id" });
    }

    const user = await getAutomationUserById({ id: req.params.id });
    if (!user) {
        return res.status(400).json({ error: "Automation User Not Exist" });
    }

    return res.status(200).json(user);
});

router.post("/", requires_authority(AUTHORITIES.USE_PAGE_CONTENT_PUBLISHING), async (req, res) => {
    const requiredBodyFields = ["name"];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    const payload = {
        name: String(validatedRequestBody.name).trim(),
        instagram_access_token: normalizeOptional(req.body.instagram_access_token),
        instagram_user_id: normalizeOptional(req.body.instagram_user_id),
        youtube_cookie: normalizeOptional(req.body.youtube_cookie),
        youtube_channel_id: normalizeOptional(req.body.youtube_channel_id),
    };

    if (!payload.name) {
        return res.status(400).json({ error: "Missing name" });
    }

    const id = await addAutomationUser(payload);
    const user = id ? await getAutomationUserById({ id }) : false;
    if (user) {
        return res.status(201).json(user);
    }

    return res.status(400).json({ error: "Failed To Add Automation User" });
});

router.patch("/", requires_authority(AUTHORITIES.USE_PAGE_CONTENT_PUBLISHING), async (req, res) => {
    const requiredBodyFields = ["id", "name"];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    const existing = await getAutomationUserById({ id: validatedRequestBody.id });
    if (!existing) {
        return res.status(400).json({ error: "Automation User Not Exist" });
    }

    await updateAutomationUserById({
        id: validatedRequestBody.id,
        name: String(validatedRequestBody.name).trim(),
        instagram_access_token: normalizeOptional(req.body.instagram_access_token),
        instagram_user_id: normalizeOptional(req.body.instagram_user_id),
        youtube_cookie: normalizeOptional(req.body.youtube_cookie),
        youtube_channel_id: normalizeOptional(req.body.youtube_channel_id),
    });

    return res.status(200).json(await getAutomationUserById({ id: validatedRequestBody.id }));
});

router.delete("/:id", requires_authority(AUTHORITIES.USE_PAGE_CONTENT_PUBLISHING), async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing Automation User Id" });
    }

    const existing = await getAutomationUserById({ id: req.params.id });
    if (!existing) {
        return res.status(400).json({ error: "Automation User Not Exist" });
    }

    try {
        await deleteAutomationUserById({ id: req.params.id });
        return res.sendStatus(204);
    } catch (error) {
        return res.status(400).json({ error: error?.sqlMessage || error?.message || "Failed To Delete Automation User" });
    }
});

module.exports = router;
