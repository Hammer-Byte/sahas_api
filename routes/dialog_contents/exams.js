const libExpress = require("express");
const { validateRequestBody } = require("sahas_utils");
const requires_authority = require("../../middlewares/requires_authority");
const { AUTHORITIES } = require("../../constants");
const { getExamById } = require("../../db/exams");
const { getCourseById } = require("../../db/courses");
const { getNonBundleCoursesForPromoDialogAdmin } = require("../../db/course_dialog_contents");
const {
    getExamDialogContentsByCourseId,
    getExamDialogContentById,
    getEligibleExamDialogContentsByCourseId,
    addExamDialogContent,
    updateExamDialogContentById,
    updateExamDialogContentViewIndexById,
    deleteExamDialogContentById,
} = require("../../db/exam_dialog_contents");
const { userHasExamAccessViaSeriesEnrollment } = require("../../db/exam_series_enrollments");

const router = libExpress.Router();

router.get("/", requires_authority(AUTHORITIES.UPDATE_COURSE), async (req, res) => {
    try {
        const courses = await getNonBundleCoursesForPromoDialogAdmin();
        return res.status(200).json(courses);
    } catch (error) {
        return res.status(500).json({ error: "Couldn't load exam promo dialog courses" });
    }
});

router.post(
    "/",
    requires_authority(AUTHORITIES.UPDATE_COURSE),
    async (req, res, next) => {
        const requiredBodyFields = ["course_id", "content", "start_date", "end_date", "frequency"];
        const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);
        if (!isRequestBodyValid) {
            return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
        }
        req.body = validatedRequestBody;
        next();
    },
    async (req, res) => {
        const course = await getCourseById({ id: req.body.course_id });
        if (!course) {
            return res.status(400).json({ error: "Course Not Exist" });
        }

        const existing = await getExamDialogContentsByCourseId({ course_id: req.body.course_id });
        const view_index = req.body.view_index ?? existing?.length ?? 0;

        let id;
        try {
            id = await addExamDialogContent({
                course_id: req.body.course_id,
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
        } catch (addError) {
            // #region agent log
            require("fs").appendFileSync("/home/nisarg/Workspace/sahas/sahas_ui/.cursor/debug-e0c060.log", JSON.stringify({ sessionId: "e0c060", hypothesisId: "C", location: "exams.js:POST/", message: "add content failed", data: { courseId: req.body.course_id, error: addError?.message }, timestamp: Date.now() }) + "\n");
            // #endregion
            throw addError;
        }

        // #region agent log
        require("fs").appendFileSync("/home/nisarg/Workspace/sahas/sahas_ui/.cursor/debug-e0c060.log", JSON.stringify({ sessionId: "e0c060", hypothesisId: "C", location: "exams.js:POST/", message: "add content success", data: { courseId: req.body.course_id, contentId: id }, timestamp: Date.now() }) + "\n");
        // #endregion

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

router.patch("/:courseId/view_indexes", requires_authority(AUTHORITIES.UPDATE_COURSE), async (req, res) => {
    if (!req.params.courseId) {
        return res.status(400).json({ error: "Missing Course Id" });
    }

    const course = await getCourseById({ id: req.params.courseId });
    if (!course) {
        return res.status(400).json({ error: "Course Not Exist" });
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

router.get("/:courseId/contents", requires_authority(AUTHORITIES.UPDATE_COURSE), async (req, res) => {
    if (!req.params.courseId) {
        return res.status(400).json({ error: "Missing Course Id" });
    }

    const course = await getCourseById({ id: req.params.courseId });
    if (!course) {
        return res.status(400).json({ error: "Course Not Exist" });
    }

    const contents = await getExamDialogContentsByCourseId({ course_id: req.params.courseId });
    return res.status(200).json(contents);
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
        // #region agent log
        require("fs").appendFileSync("/home/nisarg/Workspace/sahas/sahas_ui/.cursor/debug-e0c060.log", JSON.stringify({ sessionId: "e0c060", hypothesisId: "B", location: "exams.js:GET/:examId", message: "student fetch denied", data: { examId: req.params.examId, userId: req.user.id, hasExamAccess }, timestamp: Date.now() }) + "\n");
        // #endregion
        return res.status(403).json({ error: "Exam Series Enrollment Required" });
    }

    if (!exam.course_id) {
        // #region agent log
        require("fs").appendFileSync("/home/nisarg/Workspace/sahas/sahas_ui/.cursor/debug-e0c060.log", JSON.stringify({ sessionId: "e0c060", hypothesisId: "B", location: "exams.js:GET/:examId", message: "exam missing course_id", data: { examId: req.params.examId, examSeriesId: exam.exam_series_id }, timestamp: Date.now() }) + "\n");
        // #endregion
        return res.status(200).json([]);
    }

    const contents = await getEligibleExamDialogContentsByCourseId({
        course_id: exam.course_id,
        user_id: req.user.id,
    });

    // #region agent log
    require("fs").appendFileSync("/home/nisarg/Workspace/sahas/sahas_ui/.cursor/debug-e0c060.log", JSON.stringify({ sessionId: "e0c060", hypothesisId: "B", location: "exams.js:GET/:examId", message: "student fetch result", data: { examId: req.params.examId, courseId: exam.course_id, contentsCount: contents?.length ?? 0, contentIds: (contents ?? []).map((c) => c.id) }, timestamp: Date.now() }) + "\n");
    // #endregion

    return res.status(200).json(contents);
});

module.exports = router;
