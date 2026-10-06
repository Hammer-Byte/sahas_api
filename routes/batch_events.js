const libExpress = require("express");
const { validateRequestBody } = require("sahas_utils");
const { AUTHORITIES } = require("../constants");
const requires_authority = require("../middlewares/requires_authority");
const { getBatchesByBranchId, getAllBatches } = require("../db/batches");
const {
    getAllBatchEvents,
    getBatchEventById,
    addBatchEvent,
    setBatchEventBatches,
    updateBatchEventById,
    deleteBatchEventById,
} = require("../db/batch_events");
const { createNotificationsForUsers, getUserIdsForBatchIds, getAlertTypeId, getWarningTypeId } = require("../libs/notifications");

const router = libExpress.Router();

router.get("/", requires_authority(AUTHORITIES.USE_PAGE_MANAGE_EVENTS), async (req, res) => {
    const branch_id = req.query.branch_id ? Number(req.query.branch_id) : undefined;
    const batch_id = req.query.batch_id ? Number(req.query.batch_id) : undefined;
    res.status(200).json(await getAllBatchEvents({ branch_id, batch_id }));
});

router.get("/batches", requires_authority(AUTHORITIES.USE_PAGE_MANAGE_EVENTS), async (req, res) => {
    if (req.query.branch_id) {
        return res.status(200).json(await getBatchesByBranchId({ branch_id: Number(req.query.branch_id) }));
    }
    return res.status(200).json(await getAllBatches());
});

router.get("/:id", requires_authority(AUTHORITIES.USE_PAGE_MANAGE_EVENTS), async (req, res) => {
    const event = await getBatchEventById({ id: req.params.id });
    if (!event) {
        return res.status(400).json({ error: "Batch Event Not Exist" });
    }
    res.status(200).json(event);
});

router.post("/", requires_authority(AUTHORITIES.CREATE_BATCH_EVENT), async (req, res) => {
    const requiredBodyFields = ["title", "start_at", "end_at", "batch_ids"];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    if (!Array.isArray(validatedRequestBody.batch_ids) || !validatedRequestBody.batch_ids.length) {
        return res.status(400).json({ error: "At least one batch_id is required" });
    }

    const id = await addBatchEvent({
        title: validatedRequestBody.title,
        description: req.body.description || null,
        start_at: validatedRequestBody.start_at,
        end_at: validatedRequestBody.end_at,
        branch_id: req.body.branch_id || null,
        cancelled: !!req.body.cancelled,
        created_by: req.user?.id,
    });

    if (!id) {
        return res.status(400).json({ error: "Failed To Add Batch Event" });
    }

    await setBatchEventBatches({ batch_event_id: id, batch_ids: validatedRequestBody.batch_ids });
    const event = await getBatchEventById({ id });
    const user_ids = await getUserIdsForBatchIds(validatedRequestBody.batch_ids);
    await createNotificationsForUsers({
        user_ids,
        title: "A batch event was added",
        description: `Event "${event.title}" was added to your batch.`,
        type_id: await getAlertTypeId(),
        created_by: req.user?.id,
    });
    res.status(201).json(event);
});

router.patch("/", requires_authority(AUTHORITIES.UPDATE_BATCH_EVENT), async (req, res) => {
    const requiredBodyFields = ["id", "title", "start_at", "end_at", "batch_ids"];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    if (!Array.isArray(validatedRequestBody.batch_ids) || !validatedRequestBody.batch_ids.length) {
        return res.status(400).json({ error: "At least one batch_id is required" });
    }

    const existing = await getBatchEventById({ id: validatedRequestBody.id });
    if (!existing) {
        return res.status(400).json({ error: "Batch Event Not Exist" });
    }

    await updateBatchEventById({
        id: validatedRequestBody.id,
        title: validatedRequestBody.title,
        description: req.body.description || null,
        start_at: validatedRequestBody.start_at,
        end_at: validatedRequestBody.end_at,
        branch_id: req.body.branch_id || null,
        cancelled: !!req.body.cancelled,
    });

    await setBatchEventBatches({
        batch_event_id: validatedRequestBody.id,
        batch_ids: validatedRequestBody.batch_ids,
    });

    const event = await getBatchEventById({ id: validatedRequestBody.id });
    const cancelled = !!req.body.cancelled;
    const user_ids = await getUserIdsForBatchIds(validatedRequestBody.batch_ids);
    await createNotificationsForUsers({
        user_ids,
        title: cancelled ? "A batch event was cancelled" : "A batch event was updated",
        description: cancelled
            ? `Event "${event.title}" was cancelled.`
            : `Event "${event.title}" was updated.`,
        type_id: cancelled ? await getWarningTypeId() : await getAlertTypeId(),
        created_by: req.user?.id,
    });
    res.status(200).json(event);
});

router.delete("/:id", requires_authority(AUTHORITIES.DELETE_BATCH_EVENT), async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing Batch Event Id" });
    }

    const existing = await getBatchEventById({ id: req.params.id });
    if (!existing) {
        return res.status(400).json({ error: "Batch Event Not Exist" });
    }

    await deleteBatchEventById({ id: req.params.id });
    res.sendStatus(204);
});

module.exports = router;
