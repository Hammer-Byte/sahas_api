const libExpress = require("express");
const { validateRequestBody } = require("sahas_utils");
const requires_authority = require("../middlewares/requires_authority");
const { AUTHORITIES } = require("../constants");
const { getUsersByBatchId } = require("../db/batches");
const { createNotification } = require("../libs/notifications");

const router = libExpress.Router();

router.post("/", requires_authority(AUTHORITIES.CREATE_NOTIFICATION), async (req, res) => {
    const requiredBodyFields = ["title", "type_id", "batch_ids"];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    const batch_ids = Array.isArray(validatedRequestBody.batch_ids) ? validatedRequestBody.batch_ids : [];
    if (!batch_ids.length) {
        return res.status(400).json({ error: "Missing batch_ids" });
    }

    const attachments = Array.isArray(req.body.attachments) ? req.body.attachments.filter(Boolean) : [];
    const description = req.body.description ?? null;
    const type_id = Number(validatedRequestBody.type_id);
    const title = validatedRequestBody.title;

    let notified = 0;
    const seenUserIds = new Set();

    for (const batch_id of batch_ids) {
        const users = await getUsersByBatchId({ batch_id });
        for (const user of users) {
            const user_id = Number(user.user_id);
            if (!user_id || seenUserIds.has(user_id)) {
                continue;
            }
            seenUserIds.add(user_id);
            await createNotification({
                user_id,
                title,
                description,
                type_id,
                created_by: req.user.id,
                attachments,
            });
            notified += 1;
        }
    }

    return res.status(201).json({ notified });
});

module.exports = router;
