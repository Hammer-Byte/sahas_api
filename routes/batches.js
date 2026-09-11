const libExpress = require("express");
const { validateRequestBody } = require("sahas_utils");
const { AUTHORITIES } = require("../constants");
const requires_authority = require("../middlewares/requires_authority");
const {
    getBatchesByControllerUserId,
    getBatchById,
    addBatch,
    updateBatchById,
    deleteBatchById,
    getUsersByBatchId,
    getBatchUserById,
    isUserAssignable,
    isUserInBatch,
    isBatchController,
    addBatchController,
    getBatchControllers,
    getNextRollNo,
    addUserToBatch,
    updateBatchUserRollNoById,
    removeUserFromBatch,
    getBatchAttendanceByDate,
    deleteBatchAttendanceByDate,
    addBatchAttendanceRecords,
    getBatchUserIds,
} = require("../db/batches");
const { addGlobalNotesForUsers } = require("../db/global_notes");
const { addCounselingNotesForUsers } = require("../db/counseling_notes");

const router = libExpress.Router();

async function requireBatchController(req, res) {
    if (!req.params.id) {
        res.status(400).json({ error: "Missing Batch Id" });
        return false;
    }

    const batch = await getBatchById({ id: req.params.id });
    if (!batch) {
        res.status(400).json({ error: "Batch Not Exist" });
        return false;
    }

    const canControl = await isBatchController({ batch_id: req.params.id, user_id: req.user?.id });
    if (!canControl) {
        res.status(403).json({ error: "You Do Not Control This Batch" });
        return false;
    }

    return batch;
}

router.get("/", requires_authority(AUTHORITIES.USE_PAGE_MANAGE_BATCHES), async (req, res) => {
    res.status(200).json(await getBatchesByControllerUserId({ user_id: req.user.id }));
});

router.get("/:id/users", requires_authority(AUTHORITIES.USE_PAGE_MANAGE_BATCHES), async (req, res) => {
    const batch = await requireBatchController(req, res);
    if (!batch) {
        return;
    }

    return res.status(200).json(await getUsersByBatchId({ batch_id: req.params.id }));
});

router.get("/:id/attendance", requires_authority(AUTHORITIES.MANAGE_BATCH_ATTENDANCE), async (req, res) => {
    const batch = await requireBatchController(req, res);
    if (!batch) {
        return;
    }

    const attendance_date = typeof req.query.date === "string" ? req.query.date.trim() : "";
    if (!attendance_date) {
        return res.status(400).json({ error: "Missing Attendance Date" });
    }

    const students = await getBatchAttendanceByDate({ batch_id: req.params.id, attendance_date });
    return res.status(200).json({ attendance_date, students });
});

router.post("/:id/attendance", requires_authority(AUTHORITIES.MANAGE_BATCH_ATTENDANCE), async (req, res) => {
    const batch = await requireBatchController(req, res);
    if (!batch) {
        return;
    }

    const requiredBodyFields = ["attendance_date", "records"];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    const { attendance_date, records } = validatedRequestBody;
    if (!Array.isArray(records)) {
        return res.status(400).json({ error: "Records Must Be An Array" });
    }

    for (const record of records) {
        if (!record?.user_id || !["PRESENT", "ABSENT"].includes(record?.status)) {
            return res.status(400).json({ error: "Invalid Attendance Record" });
        }
    }

    const batchUserIds = await getBatchUserIds({ batch_id: req.params.id });
    const batchUserIdSet = new Set(batchUserIds.map((id) => Number(id)));

    for (const record of records) {
        if (!batchUserIdSet.has(Number(record.user_id))) {
            return res.status(400).json({ error: "User Not In Batch" });
        }
    }

    await deleteBatchAttendanceByDate({ batch_id: req.params.id, attendance_date });
    await addBatchAttendanceRecords({
        batch_id: req.params.id,
        attendance_date,
        records,
        created_by: req.user?.id,
    });

    const students = await getBatchAttendanceByDate({ batch_id: req.params.id, attendance_date });
    return res.status(200).json({ attendance_date, students });
});

router.post("/:id/global-notes", requires_authority(AUTHORITIES.CREATE_GLOBAL_NOTE), async (req, res) => {
    const batch = await requireBatchController(req, res);
    if (!batch) {
        return;
    }

    const requiredBodyFields = ["note", "user_ids"];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    if (!Array.isArray(validatedRequestBody.user_ids) || !validatedRequestBody.user_ids.length) {
        return res.status(400).json({ error: "Select At Least One Student" });
    }

    const batchUserIds = await getBatchUserIds({ batch_id: req.params.id });
    const batchUserIdSet = new Set(batchUserIds.map((id) => Number(id)));
    const user_ids = validatedRequestBody.user_ids.map((id) => Number(id));

    for (const user_id of user_ids) {
        if (!batchUserIdSet.has(user_id)) {
            return res.status(400).json({ error: "User Not In Batch" });
        }
    }

    try {
        const count = await addGlobalNotesForUsers({
            user_ids,
            note: validatedRequestBody.note,
            type: req.body.type ?? null,
            attachment: req.body.attachment ?? null,
            created_by: req.user.id,
        });

        if (!count) {
            return res.status(400).json({ error: "Failed To Add Global Notes" });
        }

        return res.status(201).json({ count });
    } catch (error) {
        return res.status(400).json({ error: error?.sqlMessage || error?.message || "Failed To Add Global Notes" });
    }
});

router.post("/:id/counseling-notes", requires_authority(AUTHORITIES.CREATE_COUNSELING_NOTE), async (req, res) => {
    const batch = await requireBatchController(req, res);
    if (!batch) {
        return;
    }

    const requiredBodyFields = ["note", "user_ids"];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    if (!Array.isArray(validatedRequestBody.user_ids) || !validatedRequestBody.user_ids.length) {
        return res.status(400).json({ error: "Select At Least One Student" });
    }

    const batchUserIds = await getBatchUserIds({ batch_id: req.params.id });
    const batchUserIdSet = new Set(batchUserIds.map((id) => Number(id)));
    const user_ids = validatedRequestBody.user_ids.map((id) => Number(id));

    for (const user_id of user_ids) {
        if (!batchUserIdSet.has(user_id)) {
            return res.status(400).json({ error: "User Not In Batch" });
        }
    }

    try {
        const count = await addCounselingNotesForUsers({
            user_ids,
            note: validatedRequestBody.note,
            type: req.body.type ?? null,
            attachment: req.body.attachment ?? null,
            created_by: req.user.id,
        });

        if (!count) {
            return res.status(400).json({ error: "Failed To Add Counseling Notes" });
        }

        return res.status(201).json({ count });
    } catch (error) {
        return res.status(400).json({ error: error?.sqlMessage || error?.message || "Failed To Add Counseling Notes" });
    }
});

router.get("/:id/controllers", requires_authority(AUTHORITIES.MANAGE_BATCH_CONTROLLER), async (req, res) => {
    const batch = await requireBatchController(req, res);
    if (!batch) {
        return;
    }

    return res.status(200).json(await getBatchControllers({ batch_id: req.params.id }));
});

router.post("/:id/controllers", requires_authority(AUTHORITIES.MANAGE_BATCH_CONTROLLER), async (req, res) => {
    const batch = await requireBatchController(req, res);
    if (!batch) {
        return;
    }

    const requiredBodyFields = ["user_id"];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    const assignable = await isUserAssignable({ user_id: validatedRequestBody.user_id });
    if (!assignable) {
        return res.status(400).json({ error: "User Not Exist" });
    }

    const alreadyController = await isBatchController({ batch_id: req.params.id, user_id: validatedRequestBody.user_id });
    if (alreadyController) {
        return res.status(400).json({ error: "User Already Controls This Batch" });
    }

    const id = await addBatchController({
        batch_id: req.params.id,
        user_id: validatedRequestBody.user_id,
        created_by: req.user?.id,
    });

    if (!id) {
        return res.status(400).json({ error: "Failed To Add Controller" });
    }

    const controllers = await getBatchControllers({ batch_id: req.params.id });
    const added = controllers.find((controller) => Number(controller.user_id) === Number(validatedRequestBody.user_id));
    return res.status(201).json(added || { id, batch_id: Number(req.params.id), user_id: Number(validatedRequestBody.user_id) });
});

router.post("/:id/users", requires_authority(AUTHORITIES.ASSIGN_BATCH_STUDENT), async (req, res) => {
    const batch = await requireBatchController(req, res);
    if (!batch) {
        return;
    }

    const requiredBodyFields = ["user_id"];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    const assignable = await isUserAssignable({ user_id: validatedRequestBody.user_id });
    if (!assignable) {
        return res.status(400).json({ error: "User Not Exist" });
    }

    const alreadyInBatch = await isUserInBatch({ batch_id: req.params.id, user_id: validatedRequestBody.user_id });
    if (alreadyInBatch) {
        return res.status(400).json({ error: "User Already In Batch" });
    }

    const roll_no = await getNextRollNo({ batch_id: req.params.id });
    const id = await addUserToBatch({
        batch_id: req.params.id,
        user_id: validatedRequestBody.user_id,
        roll_no,
        created_by: req.user?.id,
    });

    const assigned = await getBatchUserById({ id });
    if (assigned) {
        return res.status(201).json(assigned);
    }

    return res.status(400).json({ error: "Failed To Assign User To Batch" });
});

router.patch("/:id/users/roll_nos", requires_authority(AUTHORITIES.ASSIGN_BATCH_STUDENT), async (req, res) => {
    const batch = await requireBatchController(req, res);
    if (!batch) {
        return;
    }

    if (!req.body?.length) {
        return res.status(400).json({ error: "Missing Students" });
    }

    const batchUsers = await getUsersByBatchId({ batch_id: req.params.id });
    const batchUserIds = new Set(batchUsers.map((user) => Number(user.id)));

    for (const item of req.body) {
        if (!item?.id || item.roll_no === undefined || item.roll_no === null) {
            return res.status(400).json({ error: "Missing Student Id Or Roll No" });
        }
        if (!batchUserIds.has(Number(item.id))) {
            return res.status(400).json({ error: "Student Not In Batch" });
        }
    }

    req.body.forEach(updateBatchUserRollNoById);
    return res.sendStatus(200);
});

router.delete("/:id/users/:userId", requires_authority(AUTHORITIES.ASSIGN_BATCH_STUDENT), async (req, res) => {
    if (!req.params.userId) {
        return res.status(400).json({ error: "Missing Batch Id Or User Id" });
    }

    const batch = await requireBatchController(req, res);
    if (!batch) {
        return;
    }

    const existing = await isUserInBatch({ batch_id: req.params.id, user_id: req.params.userId });
    if (!existing) {
        return res.status(400).json({ error: "User Not In Batch" });
    }

    await removeUserFromBatch({ batch_id: req.params.id, user_id: req.params.userId });
    res.sendStatus(204);
});

router.get("/:id", requires_authority(AUTHORITIES.USE_PAGE_MANAGE_BATCHES), async (req, res) => {
    const batch = await requireBatchController(req, res);
    if (!batch) {
        return;
    }

    return res.status(200).json(batch);
});

router.post("/", requires_authority(AUTHORITIES.CREATE_BATCH), async (req, res) => {
    const requiredBodyFields = ["title"];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    const id = await addBatch({ ...validatedRequestBody, created_by: req.user?.id });
    if (!id) {
        return res.status(400).json({ error: "Failed To Add Batch" });
    }

    await addBatchController({
        batch_id: id,
        user_id: req.user.id,
        created_by: req.user.id,
    });

    const batch = await getBatchById({ id });
    if (batch) {
        return res.status(201).json(batch);
    }

    return res.status(400).json({ error: "Failed To Add Batch" });
});

router.patch("/", requires_authority(AUTHORITIES.UPDATE_BATCH), async (req, res) => {
    const requiredBodyFields = ["id", "title"];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    const existing = await getBatchById({ id: validatedRequestBody.id });
    if (!existing) {
        return res.status(400).json({ error: "Batch Not Exist" });
    }

    const canControl = await isBatchController({ batch_id: validatedRequestBody.id, user_id: req.user?.id });
    if (!canControl) {
        return res.status(403).json({ error: "You Do Not Control This Batch" });
    }

    await updateBatchById(validatedRequestBody);
    return res.status(200).json(await getBatchById({ id: validatedRequestBody.id }));
});

router.delete("/:id", requires_authority(AUTHORITIES.DELETE_BATCH), async (req, res) => {
    const batch = await requireBatchController(req, res);
    if (!batch) {
        return;
    }

    await deleteBatchById({ id: req.params.id });
    res.sendStatus(204);
});

module.exports = router;
