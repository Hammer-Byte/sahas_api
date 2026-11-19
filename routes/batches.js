const libExpress = require("express");
const { validateRequestBody } = require("sahas_utils");
const { AUTHORITIES } = require("../constants");
const requires_authority = require("../middlewares/requires_authority");
const {
    getAllBatches,
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
    deleteBatchController,
    countBatchControllers,
    getNextRollNo,
    addUserToBatch,
    updateBatchUserRollNoById,
    updateBatchUserLevelById,
    updateBatchUserLeftByUserId,
    removeUserFromBatch,
    getBatchAttendanceByDate,
    deleteBatchAttendanceByDate,
    addBatchAttendanceRecords,
    getBatchUserIds,
    getBatchLeftUserIds,
} = require("../db/batches");
const { isUserSupervisorOfAnyBatchTest } = require("../db/batch_tests");
const { getLevelById } = require("../db/levels");
const { addGlobalNotesForUsers } = require("../db/global_notes");
const { addCounselingNotesForUsers } = require("../db/counseling_notes");
const { addBatchGlobalNoteHistory, getBatchGlobalNoteHistoryByBatchId } = require("../db/batch_global_note_history");
const { createNotification, createNotificationsForUsers, getWarningTypeId, getAlertTypeId } = require("../libs/notifications");
const { recordActivity } = require("../libs/activities");
const { hasRequiredAuthority } = require("../utils");

const router = libExpress.Router();

function canManageBatchControllers(req) {
    return hasRequiredAuthority(req?.user?.authorities, AUTHORITIES.MANAGE_BATCH_CONTROLLER);
}

async function requireBatchById(req, res) {
    if (!req.params.id) {
        res.status(400).json({ error: "Missing Batch Id" });
        return false;
    }

    const batch = await getBatchById({ id: req.params.id });
    if (!batch) {
        res.status(400).json({ error: "Batch Not Exist" });
        return false;
    }

    return batch;
}

async function requireBatchController(req, res) {
    const batch = await requireBatchById(req, res);
    if (!batch) {
        return false;
    }

    const canControl = await isBatchController({ batch_id: req.params.id, user_id: req.user?.id });
    if (!canControl) {
        res.status(403).json({ error: "You Do Not Control This Batch" });
        return false;
    }

    return batch;
}

async function requireBatchControllerOrTestSupervisor(req, res) {
    const batch = await requireBatchById(req, res);
    if (!batch) {
        return false;
    }

    // Admins with MANAGE_BATCH_CONTROLLER can open any batch (e.g. to assign controllers).
    if (canManageBatchControllers(req)) {
        return batch;
    }

    const canControl = await isBatchController({ batch_id: req.params.id, user_id: req.user?.id });
    if (canControl) {
        return batch;
    }

    const isSupervisor = await isUserSupervisorOfAnyBatchTest({ batch_id: req.params.id, user_id: req.user?.id });
    if (!isSupervisor) {
        res.status(403).json({ error: "You Do Not Control This Batch" });
        return false;
    }

    return batch;
}

router.get("/", requires_authority(AUTHORITIES.USE_PAGE_MANAGE_BATCHES), async (req, res) => {
    // Controller managers (admins) see every batch so they can assign controllers anywhere.
    if (canManageBatchControllers(req)) {
        return res.status(200).json(await getAllBatches());
    }
    return res.status(200).json(await getBatchesByControllerUserId({ user_id: req.user.id }));
});

router.get("/:id/users", requires_authority(AUTHORITIES.USE_PAGE_MANAGE_BATCHES), async (req, res) => {
    const batch = await requireBatchControllerOrTestSupervisor(req, res);
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

    const activeBatchUserIds = await getBatchUserIds({ batch_id: req.params.id, include_left: false });
    const activeBatchUserIdSet = new Set(activeBatchUserIds.map((id) => Number(id)));
    const leftBatchUserIdSet = new Set(await getBatchLeftUserIds({ batch_id: req.params.id }));

    const activeRecords = [];
    for (const record of records) {
        const userId = Number(record.user_id);
        if (leftBatchUserIdSet.has(userId)) {
            continue;
        }
        if (!activeBatchUserIdSet.has(userId)) {
            return res.status(400).json({ error: "User Not In Batch" });
        }
        activeRecords.push(record);
    }

    await deleteBatchAttendanceByDate({
        batch_id: req.params.id,
        attendance_date,
        user_ids: activeRecords.map((record) => Number(record.user_id)),
    });
    await addBatchAttendanceRecords({
        batch_id: req.params.id,
        attendance_date,
        records: activeRecords,
        created_by: req.user?.id,
    });

    const warningTypeId = await getWarningTypeId();
    for (const record of activeRecords) {
        const isAbsent = record.status === "ABSENT";
        await createNotification({
            user_id: record.user_id,
            title: isAbsent ? "You were marked absent" : "Attendance recorded",
            description: `You were marked ${record.status.toLowerCase()} on ${attendance_date}.`,
            type_id: isAbsent ? warningTypeId : undefined,
            created_by: req.user?.id,
        });
    }

    const students = await getBatchAttendanceByDate({ batch_id: req.params.id, attendance_date });
    return res.status(200).json({ attendance_date, students });
});

router.get("/:id/global-note-history", requires_authority(AUTHORITIES.USE_PAGE_MANAGE_BATCHES), async (req, res) => {
    const batch = await requireBatchController(req, res);
    if (!batch) {
        return;
    }

    const history = await getBatchGlobalNoteHistoryByBatchId({ batch_id: req.params.id });
    return res.status(200).json(history);
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
        const note = validatedRequestBody.note;
        const type = req.body.type ?? null;
        const attachment = req.body.attachment ?? null;

        const count = await addGlobalNotesForUsers({
            user_ids,
            note,
            type,
            attachment,
            created_by: req.user.id,
        });

        if (!count) {
            return res.status(400).json({ error: "Failed To Add Global Notes" });
        }

        let history_id = null;
        if (!!req.body.save_in_history) {
            history_id = await addBatchGlobalNoteHistory({
                batch_id: req.params.id,
                note,
                type,
                attachment,
                created_by: req.user.id,
                user_ids,
            });
            if (!history_id) {
                return res.status(400).json({ error: "Global Notes Added But Failed To Save History" });
            }
        }

        await createNotificationsForUsers({
            user_ids,
            title: "A global note was created",
            description: "A new global note has been added to your profile.",
            created_by: req.user.id,
        });

        return res.status(201).json({ count, history_id, saved_in_history: !!history_id });
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

        await createNotificationsForUsers({
            user_ids,
            title: "A counseling note was created",
            description: "A new counseling note has been added to your profile.",
            created_by: req.user.id,
        });

        return res.status(201).json({ count });
    } catch (error) {
        return res.status(400).json({ error: error?.sqlMessage || error?.message || "Failed To Add Counseling Notes" });
    }
});

router.get("/:id/controllers", requires_authority(AUTHORITIES.MANAGE_BATCH_CONTROLLER), async (req, res) => {
    // Authority alone is enough — admins do not need to already be a controller of the batch.
    const batch = await requireBatchById(req, res);
    if (!batch) {
        return;
    }

    return res.status(200).json(await getBatchControllers({ batch_id: req.params.id }));
});

router.post("/:id/controllers", requires_authority(AUTHORITIES.MANAGE_BATCH_CONTROLLER), async (req, res) => {
    const batch = await requireBatchById(req, res);
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

    await createNotification({
        user_id: validatedRequestBody.user_id,
        title: "You were assigned as batch controller",
        description: `You were assigned as controller for batch "${batch.title}".`,
        type_id: await getAlertTypeId(),
        created_by: req.user?.id,
    });

    const controllers = await getBatchControllers({ batch_id: req.params.id });
    const added = controllers.find((controller) => Number(controller.user_id) === Number(validatedRequestBody.user_id));
    return res.status(201).json(added || { id, batch_id: Number(req.params.id), user_id: Number(validatedRequestBody.user_id) });
});

router.delete("/:id/controllers/:userId", requires_authority(AUTHORITIES.MANAGE_BATCH_CONTROLLER), async (req, res) => {
    const batch = await requireBatchById(req, res);
    if (!batch) {
        return;
    }

    const userId = Number(req.params.userId);
    if (!Number.isFinite(userId) || userId <= 0) {
        return res.status(400).json({ error: "Invalid Controller User Id" });
    }

    const isController = await isBatchController({ batch_id: req.params.id, user_id: userId });
    if (!isController) {
        return res.status(400).json({ error: "Controller Not Found On This Batch" });
    }

    const controllerCount = await countBatchControllers({ batch_id: req.params.id });
    if (controllerCount <= 1) {
        return res.status(400).json({ error: "At Least One Controller Must Remain On The Batch" });
    }

    const removed = await deleteBatchController({ batch_id: req.params.id, user_id: userId });
    if (!removed) {
        return res.status(400).json({ error: "Failed To Remove Controller" });
    }

    return res.status(200).json(await getBatchControllers({ batch_id: req.params.id }));
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
        await createNotification({
            user_id: validatedRequestBody.user_id,
            title: "You have been added to a batch",
            description: `You have been added to batch "${batch.title}".`,
            created_by: req.user?.id,
        });
        await recordActivity({
            user_id: validatedRequestBody.user_id,
            key: "ASSIGN_BATCH",
            values: { batch: batch.title },
        });
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

router.patch("/:id/users/levels", requires_authority(AUTHORITIES.MANAGE_BATCH_STUDENT_LEVEL), async (req, res) => {
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
        if (!item?.id) {
            return res.status(400).json({ error: "Missing Student Id" });
        }
        if (!batchUserIds.has(Number(item.id))) {
            return res.status(400).json({ error: "Student Not In Batch" });
        }

        const levelId = item.level_id == null || item.level_id === "" ? null : Number(item.level_id);
        if (levelId != null) {
            const level = await getLevelById({ id: levelId });
            if (!level) {
                return res.status(400).json({ error: "Invalid Level" });
            }
        }

        const inchargeUserId = item.incharge_user_id == null || item.incharge_user_id === "" ? null : Number(item.incharge_user_id);
        if (inchargeUserId != null) {
            const assignable = await isUserAssignable({ user_id: inchargeUserId });
            if (!assignable) {
                return res.status(400).json({ error: "Incharge User Not Exist" });
            }
        }

        await updateBatchUserLevelById({
            id: item.id,
            level_id: levelId,
            incharge_user_id: inchargeUserId,
        });
    }

    return res.status(200).json(await getUsersByBatchId({ batch_id: req.params.id }));
});

router.patch("/:id/users/:userId/left", requires_authority(AUTHORITIES.ASSIGN_BATCH_STUDENT), async (req, res) => {
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

    const is_left = req.body?.is_left === undefined ? true : !!req.body.is_left;
    await updateBatchUserLeftByUserId({
        batch_id: req.params.id,
        user_id: req.params.userId,
        is_left,
    });

    const student = await getBatchUserById({ id: existing.id });
    if (!student) {
        return res.status(400).json({ error: "Failed To Update Student Left Status" });
    }

    return res.status(200).json(student);
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
    const batch = await requireBatchControllerOrTestSupervisor(req, res);
    if (!batch) {
        return;
    }

    return res.status(200).json(batch);
});

router.get("/:id/schedule", requires_authority(AUTHORITIES.USE_PAGE_MANAGE_BATCHES), async (req, res) => {
    const batch = await requireBatchControllerOrTestSupervisor(req, res);
    if (!batch) {
        return;
    }

    const { getBatchScheduleByBatchId } = require("../db/batch_schedule");
    const rows = await getBatchScheduleByBatchId({ batch_id: req.params.id });
    const byWeekday = new Map(rows.map((row) => [Number(row.weekday), row]));
    const days = Array.from({ length: 7 }, (_, weekday) => {
        const row = byWeekday.get(weekday);
        return {
            weekday,
            start_time: row?.start_time || null,
            end_time: row?.end_time || null,
            subject: row?.subject || null,
            event_handler: row?.event_handler || null,
            event_handler_name: row?.event_handler_name || null,
        };
    });
    return res.status(200).json(days);
});

router.put("/:id/schedule", requires_authority(AUTHORITIES.UPDATE_BATCH), async (req, res) => {
    const batch = await requireBatchController(req, res);
    if (!batch) {
        return;
    }

    const days = Array.isArray(req.body?.days) ? req.body.days : req.body;
    if (!Array.isArray(days) || days.length !== 7) {
        return res.status(400).json({ error: "Expected 7 weekday schedule rows" });
    }

    const { upsertBatchSchedule, getBatchScheduleByBatchId, ensureScheduleColumns } = require("../db/batch_schedule");
    const columnsReady = await ensureScheduleColumns();
    if (!columnsReady) {
        return res.status(500).json({ error: "Schedule subject/handler columns are missing. Restart API after latest schema update." });
    }

    const normalized = days.map((day) => {
        const start_time = day.start_time || null;
        const end_time = day.end_time || null;
        const hasTimes = !!(start_time && end_time);
        const subjectRaw = day.subject == null ? "" : String(day.subject).trim();
        const handlerRaw = day.event_handler != null && day.event_handler !== "" ? Number(day.event_handler) : null;

        return {
            weekday: Number(day.weekday),
            start_time,
            end_time,
            subject: hasTimes ? subjectRaw || null : null,
            event_handler: hasTimes && Number.isFinite(handlerRaw) && handlerRaw > 0 ? handlerRaw : null,
        };
    });

    for (const day of normalized) {
        if (day.weekday < 0 || day.weekday > 6) {
            return res.status(400).json({ error: "Invalid weekday" });
        }
        if ((day.start_time && !day.end_time) || (!day.start_time && day.end_time)) {
            return res.status(400).json({ error: "start_time and end_time must both be set or both null" });
        }
        if (day.start_time && day.end_time) {
            if (!day.subject) {
                return res.status(400).json({ error: "subject is required when schedule times are set" });
            }
            if (!day.event_handler) {
                return res.status(400).json({ error: "event_handler is required when schedule times are set" });
            }
        }
    }

    const saved = await upsertBatchSchedule({ batch_id: req.params.id, days: normalized });
    if (!saved) {
        return res.status(400).json({ error: "Failed To Update Batch Schedule" });
    }

    const scheduleUserIds = await getBatchUserIds({ batch_id: req.params.id });
    await createNotificationsForUsers({
        user_ids: scheduleUserIds,
        title: "Your batch schedule was updated",
        description: `The schedule for batch "${batch.title}" was updated.`,
        type_id: await getAlertTypeId(),
        created_by: req.user?.id,
    });

    const rows = await getBatchScheduleByBatchId({ batch_id: req.params.id });
    const byWeekday = new Map(rows.map((row) => [Number(row.weekday), row]));
    return res.status(200).json(
        Array.from({ length: 7 }, (_, weekday) => {
            const row = byWeekday.get(weekday);
            return {
                weekday,
                start_time: row?.start_time || null,
                end_time: row?.end_time || null,
                subject: row?.subject || null,
                event_handler: row?.event_handler || null,
                event_handler_name: row?.event_handler_name || null,
            };
        }),
    );
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

require("./batch_tests")(router);

module.exports = router;
