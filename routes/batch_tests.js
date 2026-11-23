const { validateRequestBody } = require("sahas_utils");
const { AUTHORITIES } = require("../constants");
const requires_authority = require("../middlewares/requires_authority");
const { getBatchById, isBatchController, isUserInBatch, getBatchUserIds } = require("../db/batches");
const { getSubjectById } = require("../db/subjects");
const { isUserTestPaperAssignable } = require("../db/users");
const {
    getBatchTestsByBatchId,
    getBatchTestById,
    addBatchTest,
    updateBatchTestById,
    deleteBatchTestById,
    setBatchTestSupervisors,
    isBatchTestSupervisor,
    isUserSupervisorOfAnyBatchTest,
    getSupervisedTestIdsByBatchAndUser,
    getBatchTestRecords,
    setBatchTestRecords,
    resolveResultStatusId,
    recalculateBatchTestResultStatuses,
    getTestResultStatuses,
    upsertBatchTestPaper,
    deleteBatchTestPaper,
    getBatchTestDetail,
} = require("../db/batch_tests");
const { createNotificationsForUsers, getAlertTypeId } = require("../libs/notifications");

const VALID_PAPER_TYPES = new Set(["PAPER", "SOLUTION", "TOPPERS"]);
const VALID_ATTENDANCE = new Set(["PRESENT", "ABSENT"]);

function canSeeAllBatches(req) {
    const roles = req?.user?.roles || [];
    return roles.includes("ADMIN") || roles.includes("DEVELOPER");
}

function normalizeTime(value) {
    if (value === null || value === undefined || value === "") {
        return null;
    }
    const text = String(value).trim();
    if (!text) {
        return null;
    }
    if (/^\d{2}:\d{2}(:\d{2})?$/.test(text)) {
        return text.length === 5 ? `${text}:00` : text;
    }
    return null;
}

function normalizeTimePart(time, fallback) {
    if (!time) return fallback;
    const raw = String(time).trim();
    if (/^\d{2}:\d{2}$/.test(raw)) return `${raw}:00`;
    if (/^\d{2}:\d{2}:\d{2}$/.test(raw)) return raw;
    return fallback;
}

function isBatchTestOver(test, now = Date.now()) {
    if (!test?.test_date) return false;
    const time = normalizeTimePart(test.end_time, "23:59:59");
    const endMs = Date.parse(`${test.test_date}T${time}+05:30`);
    return Number.isFinite(endMs) && now > endMs;
}

function parsePassingMarks({ total_marks, passing_marks }) {
    if (passing_marks === null || passing_marks === undefined || passing_marks === "") {
        return { passing_marks: null };
    }
    const passing = Number(passing_marks);
    if (!Number.isFinite(passing) || passing <= 0) {
        return { error: "Passing Marks Must Be A Positive Number" };
    }
    if (passing > Number(total_marks)) {
        return { error: "Passing Marks Cannot Exceed Total Marks" };
    }
    return { passing_marks: passing };
}

async function withResultDisplay(detail) {
    if (!detail) {
        return detail;
    }
    const totalMarks = detail.total_marks != null ? Number(detail.total_marks) : null;
    const passing_marks = detail.passing_marks;
    const statuses = await getTestResultStatuses();
    const statusById = new Map((statuses || []).map((row) => [Number(row.id), row]));

    const records = [];
    for (const row of detail.records || []) {
        const marks = row.marks_obtained != null ? Number(row.marks_obtained) : null;
        const marksLabel =
            marks == null || totalMarks == null
                ? null
                : `${Number.isInteger(marks) ? marks : Number(marks.toFixed(2))}/${totalMarks}`;

        let result_status_id = row.result_status_id != null ? Number(row.result_status_id) : null;
        let result_status_title = row.result_status_title || null;
        let result_status_color = row.result_status_color || null;

        if (result_status_id == null || !result_status_title) {
            result_status_id = await resolveResultStatusId({
                attendance_status: row.attendance_status,
                marks_obtained: row.marks_obtained,
                passing_marks,
                is_left: row.is_left,
            });
            const status = statusById.get(Number(result_status_id));
            result_status_title = status?.title || null;
            result_status_color = status?.color || null;
        }

        records.push({
            ...row,
            marks_display: marksLabel,
            result_status: result_status_title,
            result_status_id,
            result_status_title,
            result_status_color,
        });
    }
    return { ...detail, records };
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

async function isBatchControllerAccess(req, batch_id) {
    if (canSeeAllBatches(req)) {
        return true;
    }
    return isBatchController({ batch_id, user_id: req.user?.id });
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

    if (await isBatchControllerAccess(req, req.params.id)) {
        return { batch, isController: true };
    }

    const isSupervisor = await isUserSupervisorOfAnyBatchTest({ batch_id: req.params.id, user_id: req.user?.id });
    if (!isSupervisor) {
        res.status(403).json({ error: "You Do Not Have Access To This Batch" });
        return false;
    }

    return { batch, isController: false };
}

async function requireBatchTest(req, res, { allowSupervisor = false } = {}) {
    const batch = await requireBatchById(req, res);
    if (!batch) {
        return false;
    }

    const test = await getBatchTestById({ id: req.params.testId });
    if (!test || Number(test.batch_id) !== Number(req.params.id)) {
        res.status(400).json({ error: "Test Not Exist" });
        return false;
    }

    const isController = await isBatchControllerAccess(req, req.params.id);
    const isSupervisor = await isBatchTestSupervisor({ test_id: test.id, user_id: req.user?.id });

    if (isController) {
        return {
            batch,
            test,
            isController: true,
            isSupervisor: !!isSupervisor,
            canManage: true,
            canEnterMarks: true,
        };
    }

    if (allowSupervisor && isSupervisor) {
        return {
            batch,
            test,
            isController: false,
            isSupervisor: true,
            canManage: true,
            canEnterMarks: true,
        };
    }

    res.status(403).json({ error: "You Do Not Have Access To This Test" });
    return false;
}

async function requireBatchTestManage(req, res) {
    return requireBatchTest(req, res, { allowSupervisor: true });
}

function registerBatchTestRoutes(router) {
    router.get("/:id/tests", requires_authority(AUTHORITIES.USE_PAGE_MANAGE_BATCHES), async (req, res) => {
        const access = await requireBatchControllerOrTestSupervisor(req, res);
        if (!access) {
            return;
        }

        const supervisedIds = await getSupervisedTestIdsByBatchAndUser({ batch_id: req.params.id, user_id: req.user?.id });
        const supervisedSet = new Set(supervisedIds.map((id) => Number(id)));

        let tests = await getBatchTestsByBatchId({ batch_id: req.params.id });
        if (!access.isController) {
            tests = (tests || []).filter((test) => supervisedSet.has(Number(test.id)));
        }

        const is_batch_controller = !!access.isController;
        return res.status(200).json({
            is_batch_controller,
            tests: (tests || []).map((test) => {
                const is_test_supervisor = supervisedSet.has(Number(test.id));
                const can_manage = is_batch_controller || is_test_supervisor;
                return {
                    ...test,
                    is_batch_controller,
                    is_test_supervisor,
                    can_manage,
                    can_enter_marks: can_manage,
                };
            }),
        });
    });

    router.post("/:id/tests", requires_authority(AUTHORITIES.CREATE_BATCH_TEST), async (req, res) => {
        const batch = await requireBatchController(req, res);
        if (!batch) {
            return;
        }

        const requiredBodyFields = ["subject_id", "test_date", "total_marks"];
        const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

        if (!isRequestBodyValid) {
            return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
        }

        const subject = await getSubjectById({ id: validatedRequestBody.subject_id });
        if (!subject) {
            return res.status(400).json({ error: "Subject Not Exist" });
        }

        const total_marks = Number(validatedRequestBody.total_marks);
        if (!Number.isFinite(total_marks) || total_marks <= 0) {
            return res.status(400).json({ error: "Total Marks Must Be A Positive Number" });
        }

        const passingParsed = parsePassingMarks({ total_marks, passing_marks: req.body.passing_marks });
        if (passingParsed.error) {
            return res.status(400).json({ error: passingParsed.error });
        }

        const start_time = normalizeTime(req.body.start_time);
        const end_time = normalizeTime(req.body.end_time);
        if ((req.body.start_time && !start_time) || (req.body.end_time && !end_time)) {
            return res.status(400).json({ error: "Invalid Test Timing" });
        }

        const supervisor_ids = Array.isArray(req.body.supervisor_ids) ? req.body.supervisor_ids : [];
        for (const supervisorId of supervisor_ids) {
            const assignable = await isUserTestPaperAssignable({ user_id: supervisorId });
            if (!assignable) {
                return res.status(400).json({ error: `User ${supervisorId} Is Not Test Paper Assignable` });
            }
        }

        const id = await addBatchTest({
            batch_id: req.params.id,
            subject_id: validatedRequestBody.subject_id,
            test_date: validatedRequestBody.test_date,
            total_marks,
            passing_marks: passingParsed.passing_marks,
            start_time,
            end_time,
            comment: typeof req.body.comment === "string" ? req.body.comment.trim() || null : null,
            created_by: req.user?.id,
        });

        if (!id) {
            return res.status(400).json({ error: "Failed To Create Test" });
        }

        if (supervisor_ids.length) {
            await setBatchTestSupervisors({ test_id: id, user_ids: supervisor_ids, created_by: req.user?.id });
        }

        const studentIds = await getBatchUserIds({ batch_id: req.params.id });
        await createNotificationsForUsers({
            user_ids: studentIds,
            title: "New batch test scheduled",
            description: `A ${subject.title} test is scheduled on ${validatedRequestBody.test_date} for batch "${batch.title}".`,
            type_id: await getAlertTypeId(),
            created_by: req.user?.id,
        });

        return res.status(201).json(await withResultDisplay(await getBatchTestDetail({ id })));
    });

    router.get("/:id/tests/:testId", requires_authority(AUTHORITIES.USE_PAGE_MANAGE_BATCHES), async (req, res) => {
        const access = await requireBatchTest(req, res, { allowSupervisor: true });
        if (!access) {
            return;
        }

        const detail = await withResultDisplay(await getBatchTestDetail({ id: req.params.testId }));
        return res.status(200).json({
            ...detail,
            is_batch_controller: !!access.isController,
            is_test_supervisor: !!access.isSupervisor,
            can_manage: !!access.canManage,
            can_enter_marks: !!access.canEnterMarks,
        });
    });

    router.patch("/:id/tests/:testId", requires_authority(AUTHORITIES.USE_PAGE_MANAGE_BATCHES), async (req, res) => {
        const access = await requireBatchTestManage(req, res);
        if (!access) {
            return;
        }

        const requiredBodyFields = ["subject_id", "test_date", "total_marks"];
        const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

        if (!isRequestBodyValid) {
            return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
        }

        const subject = await getSubjectById({ id: validatedRequestBody.subject_id });
        if (!subject) {
            return res.status(400).json({ error: "Subject Not Exist" });
        }

        const total_marks = Number(validatedRequestBody.total_marks);
        if (!Number.isFinite(total_marks) || total_marks <= 0) {
            return res.status(400).json({ error: "Total Marks Must Be A Positive Number" });
        }

        const passingParsed = parsePassingMarks({ total_marks, passing_marks: req.body.passing_marks });
        if (passingParsed.error) {
            return res.status(400).json({ error: passingParsed.error });
        }

        const start_time = normalizeTime(req.body.start_time);
        const end_time = normalizeTime(req.body.end_time);
        if ((req.body.start_time && !start_time) || (req.body.end_time && !end_time)) {
            return res.status(400).json({ error: "Invalid Test Timing" });
        }

        await updateBatchTestById({
            id: req.params.testId,
            subject_id: validatedRequestBody.subject_id,
            test_date: validatedRequestBody.test_date,
            total_marks,
            passing_marks: passingParsed.passing_marks,
            start_time,
            end_time,
            comment: typeof req.body.comment === "string" ? req.body.comment.trim() || null : null,
        });

        await recalculateBatchTestResultStatuses({
            test_id: req.params.testId,
            passing_marks: passingParsed.passing_marks,
        });

        return res.status(200).json(await withResultDisplay(await getBatchTestDetail({ id: req.params.testId })));
    });

    router.delete("/:id/tests/:testId", requires_authority(AUTHORITIES.DELETE_BATCH_TEST), async (req, res) => {
        const access = await requireBatchTest(req, res);
        if (!access) {
            return;
        }

        await deleteBatchTestById({ id: req.params.testId });
        return res.sendStatus(204);
    });

    router.put("/:id/tests/:testId/supervisors", requires_authority(AUTHORITIES.USE_PAGE_MANAGE_BATCHES), async (req, res) => {
        const access = await requireBatchTestManage(req, res);
        if (!access) {
            return;
        }

        const supervisor_ids = Array.isArray(req.body.supervisor_ids) ? req.body.supervisor_ids : null;
        if (!supervisor_ids) {
            return res.status(400).json({ error: "Missing supervisor_ids" });
        }

        for (const supervisorId of supervisor_ids) {
            const assignable = await isUserTestPaperAssignable({ user_id: supervisorId });
            if (!assignable) {
                return res.status(400).json({ error: `User ${supervisorId} Is Not Test Paper Assignable` });
            }
        }

        await setBatchTestSupervisors({
            test_id: req.params.testId,
            user_ids: supervisor_ids,
            created_by: req.user?.id,
        });

        return res.status(200).json(await withResultDisplay(await getBatchTestDetail({ id: req.params.testId })));
    });

    router.get("/:id/tests/:testId/records", requires_authority(AUTHORITIES.USE_PAGE_MANAGE_BATCHES), async (req, res) => {
        const access = await requireBatchTestManage(req, res);
        if (!access) {
            return;
        }

        const records = await getBatchTestRecords({ test_id: req.params.testId, batch_id: req.params.id });
        return res.status(200).json({ records });
    });

    router.put("/:id/tests/:testId/records", requires_authority(AUTHORITIES.USE_PAGE_MANAGE_BATCHES), async (req, res) => {
        const access = await requireBatchTestManage(req, res);
        if (!access) {
            return;
        }

        if (!Array.isArray(req.body.records)) {
            return res.status(400).json({ error: "Records Must Be An Array" });
        }

        const mode = String(req.body.mode || "attendance").toLowerCase() === "marks" ? "marks" : "attendance";

        // Marks: only this test's supervisor or batch controller, and only after the test ends.
        if (mode === "marks") {
            if (!access.canEnterMarks) {
                return res.status(403).json({ error: "Only Supervisors Of This Test Can Enter Marks" });
            }
            if (!isBatchTestOver(access.test)) {
                return res.status(400).json({ error: "Marks Can Be Entered Only After The Test Ends" });
            }
        }

        const existingRecords = await getBatchTestRecords({ test_id: req.params.testId, batch_id: req.params.id });
        const existingByUserId = new Map((existingRecords || []).map((row) => [Number(row.user_id), row]));
        const totalMarks = Number(access.test.total_marks);
        const passing_marks = access.test.passing_marks;
        const normalized = [];
        const touchedUserIds = new Set();

        for (const record of req.body.records) {
            const user_id = Number(record?.user_id);
            if (!Number.isFinite(user_id) || user_id <= 0) {
                return res.status(400).json({ error: "Invalid Student In Records" });
            }

            const existing = existingByUserId.get(user_id) || {};
            if (existing.is_left) {
                continue;
            }

            const inBatch = await isUserInBatch({ batch_id: req.params.id, user_id });
            if (!inBatch) {
                return res.status(400).json({ error: `User ${user_id} Is Not In This Batch` });
            }

            touchedUserIds.add(user_id);

            if (mode === "attendance") {
                const attendance_status = String(record?.attendance_status || "ABSENT").toUpperCase();
                if (!VALID_ATTENDANCE.has(attendance_status)) {
                    return res.status(400).json({ error: "Invalid Attendance Status" });
                }

                const marks_obtained = attendance_status === "PRESENT" ? existing.marks_obtained ?? null : null;
                const comment = attendance_status === "PRESENT" ? existing.comment || null : null;
                normalized.push({
                    user_id,
                    attendance_status,
                    marks_obtained,
                    comment,
                    result_status_id: await resolveResultStatusId({
                        attendance_status,
                        marks_obtained,
                        passing_marks,
                    }),
                });
                continue;
            }

            // marks mode — keep attendance as already saved; only supervisors of this test update marks
            const attendance_status = String(existing.attendance_status || "ABSENT").toUpperCase();
            let marks_obtained = null;
            let comment = null;

            if (attendance_status === "PRESENT") {
                if (record?.marks_obtained !== null && record?.marks_obtained !== undefined && record?.marks_obtained !== "") {
                    marks_obtained = Number(record.marks_obtained);
                    if (!Number.isFinite(marks_obtained) || marks_obtained < 0 || marks_obtained > totalMarks) {
                        return res.status(400).json({ error: `Marks Must Be Between 0 And ${totalMarks}` });
                    }
                }
                comment = typeof record?.comment === "string" ? record.comment.trim() || null : null;
            }

            normalized.push({
                user_id,
                attendance_status,
                marks_obtained,
                comment,
                result_status_id: await resolveResultStatusId({
                    attendance_status,
                    marks_obtained,
                    passing_marks,
                }),
            });
        }

        // Keep historical rows for left / untouched students when replace-all save runs.
        for (const existing of existingRecords || []) {
            const userId = Number(existing.user_id);
            if (touchedUserIds.has(userId) || !existing.record_id) {
                continue;
            }
            const attendance_status = existing.attendance_status || "ABSENT";
            const marks_obtained = existing.marks_obtained ?? null;
            normalized.push({
                user_id: userId,
                attendance_status,
                marks_obtained,
                comment: existing.comment || null,
                result_status_id: await resolveResultStatusId({
                    attendance_status,
                    marks_obtained,
                    passing_marks,
                    is_left: existing.is_left,
                }),
            });
        }

        await setBatchTestRecords({
            test_id: req.params.testId,
            records: normalized,
            created_by: req.user?.id,
        });

        return res.status(200).json(await withResultDisplay(await getBatchTestDetail({ id: req.params.testId })));
    });

    router.put("/:id/tests/:testId/papers", requires_authority(AUTHORITIES.USE_PAGE_MANAGE_BATCHES), async (req, res) => {
        const access = await requireBatchTestManage(req, res);
        if (!access) {
            return;
        }

        const papers = Array.isArray(req.body.papers) ? req.body.papers : null;
        if (!papers) {
            return res.status(400).json({ error: "Missing papers" });
        }

        for (const paper of papers) {
            const paper_type = String(paper?.paper_type || "").toUpperCase();
            const file_path = typeof paper?.file_path === "string" ? paper.file_path.trim() : "";
            if (!VALID_PAPER_TYPES.has(paper_type)) {
                return res.status(400).json({ error: "Invalid Paper Type" });
            }
            if (!file_path) {
                return res.status(400).json({ error: "Missing Paper File Path" });
            }

            await upsertBatchTestPaper({
                test_id: req.params.testId,
                paper_type,
                file_path,
                created_by: req.user?.id,
            });
        }

        const studentIds = await getBatchUserIds({ batch_id: req.params.id });
        await createNotificationsForUsers({
            user_ids: studentIds,
            title: "Test papers uploaded",
            description: `Paper resources were uploaded for the ${access.test.subject_title || "batch"} test on ${access.test.test_date}.`,
            type_id: await getAlertTypeId(),
            created_by: req.user?.id,
        });

        return res.status(200).json(await getBatchTestDetail({ id: req.params.testId }));
    });

    router.delete("/:id/tests/:testId/papers/:paperType", requires_authority(AUTHORITIES.USE_PAGE_MANAGE_BATCHES), async (req, res) => {
        const access = await requireBatchTestManage(req, res);
        if (!access) {
            return;
        }

        const paper_type = String(req.params.paperType || "").toUpperCase();
        if (!VALID_PAPER_TYPES.has(paper_type)) {
            return res.status(400).json({ error: "Invalid Paper Type" });
        }

        await deleteBatchTestPaper({ test_id: req.params.testId, paper_type });
        return res.status(200).json(await getBatchTestDetail({ id: req.params.testId }));
    });
}

module.exports = registerBatchTestRoutes;
