const libExpress = require("express");
const { validateRequestBody } = require("sahas_utils");
const requires_authority = require("../../middlewares/requires_authority");
const { AUTHORITIES } = require("../../constants");
const { getExamById } = require("../../db/exams");
const {
    getExamDialogContentsBySubjectId,
    getExamDialogContentById,
    getEligibleExamDialogContentsBySubjectId,
    getAllSubjectsWithDialogContents,
    addExamDialogContent,
    updateExamDialogContentById,
    updateExamDialogContentViewIndexById,
    deleteExamDialogContentById,
} = require("../../db/exam_dialog_contents");
const { getSubjectById } = require("../../db/subjects");
const { userHasExamAccessViaSeriesEnrollment } = require("../../db/exam_series_enrollments");

const router = libExpress.Router();

router.get("/", requires_authority(AUTHORITIES.UPDATE_COURSE), async (req, res) => {
    try {
        const subjects = await getAllSubjectsWithDialogContents();
        return res.status(200).json(subjects);
    } catch (error) {
        return res.status(500).json({ error: "Couldn't load exam promo dialogs" });
    }
});

router.post(
    "/",
    requires_authority(AUTHORITIES.UPDATE_COURSE),
    async (req, res, next) => {
        const requiredBodyFields = ["subject_id", "content", "start_date", "end_date", "frequency"];
        const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);
        if (!isRequestBodyValid) {
            return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
        }
        req.body = validatedRequestBody;
        next();
    },
    async (req, res) => {
        const subject = await getSubjectById({ id: req.body.subject_id });
        if (!subject) {
            return res.status(400).json({ error: "Subject Not Exist" });
        }

        const existing = await getExamDialogContentsBySubjectId({ subject_id: req.body.subject_id });
        const view_index = req.body.view_index ?? existing?.length ?? 0;

        const id = await addExamDialogContent({
            subject_id: req.body.subject_id,
            content: req.body.content,
            redirect_url: req.body.redirect_url ?? null,
            start_date: req.body.start_date,
            end_date: req.body.end_date,
            daily: !!req.body.daily,
            frequency: req.body.frequency,
            active: req.body.active !== false,
            view_index,
            interval: req.body.interval ?? 0,
        });

        const item = await getExamDialogContentById({ id });
        if (item) {
            return res.status(201).json(item);
        }

        return res.status(400).json({ error: "Failed To Add Dialog Content" });
    },
);

router.patch(
    "/",
    requires_authority(AUTHORITIES.UPDATE_COURSE),
    async (req, res, next) => {
        const requiredBodyFields = ["id", "content", "start_date", "end_date", "frequency"];
        const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);
        if (!isRequestBodyValid) {
            return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
        }
        req.body = validatedRequestBody;
        next();
    },
    async (req, res) => {
        const existing = await getExamDialogContentById({ id: req.body.id });
        if (!existing) {
            return res.status(400).json({ error: "Content Not Exist" });
        }

        await updateExamDialogContentById({
            id: req.body.id,
            content: req.body.content,
            redirect_url: req.body.redirect_url !== undefined ? req.body.redirect_url : existing.redirect_url,
            start_date: req.body.start_date,
            end_date: req.body.end_date,
            daily: req.body.daily !== undefined ? !!req.body.daily : existing.daily,
            frequency: req.body.frequency,
            active: req.body.active !== undefined ? !!req.body.active : existing.active,
            view_index: req.body.view_index ?? existing.view_index,
            interval: req.body.interval !== undefined ? req.body.interval : existing.interval ?? 0,
        });

        const item = await getExamDialogContentById({ id: req.body.id });
        if (item) {
            return res.status(200).json(item);
        }

        return res.status(400).json({ error: "Failed To Update Dialog Content" });
    },
);

router.patch("/subjects/:subjectId/view_indexes", requires_authority(AUTHORITIES.UPDATE_COURSE), async (req, res) => {
    if (!req.params.subjectId) {
        return res.status(400).json({ error: "Missing Subject Id" });
    }

    const subject = await getSubjectById({ id: req.params.subjectId });
    if (!subject) {
        return res.status(400).json({ error: "Subject Not Exist" });
    }

    if (req.body?.length) {
        req.body.forEach(updateExamDialogContentViewIndexById);
        return res.sendStatus(200);
    }

    return res.status(400).json({ error: "Missing Dialog Contents" });
});

router.delete("/:contentId", requires_authority(AUTHORITIES.UPDATE_COURSE), async (req, res) => {
    if (!req.params.contentId) {
        return res.status(400).json({ error: "Missing Content Id" });
    }

    const content = await getExamDialogContentById({ id: req.params.contentId });
    if (!content) {
        return res.status(400).json({ error: "Content Not Exist" });
    }

    await deleteExamDialogContentById({ id: req.params.contentId });
    res.sendStatus(204);
});

router.get("/:examId", async (req, res) => {
    if (!req.params.examId) {
        return res.status(400).json({ error: "Missing Exam Id" });
    }

    if (!req.user?.id) {
        return res.status(401).json({ error: "Authentication Required" });
    }

    const exam = await getExamById({ id: req.params.examId });
    if (!exam) {
        return res.status(400).json({ error: "Exam Not Exist" });
    }

    const hasExamAccess = await userHasExamAccessViaSeriesEnrollment({
        user_id: req.user.id,
        exam_id: req.params.examId,
    });

    if (!hasExamAccess) {
        return res.status(403).json({ error: "Exam Series Enrollment Required" });
    }

    const contents = await getEligibleExamDialogContentsBySubjectId({
        subject_id: exam.subject_id,
        user_id: req.user.id,
    });

    return res.status(200).json(contents);
});

module.exports = router;
