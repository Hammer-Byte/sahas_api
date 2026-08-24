const libExpress = require("express");
const { validateRequestBody } = require("sahas_utils");
const requires_authority = require("../../middlewares/requires_authority");
const { AUTHORITIES } = require("../../constants");
const { getCourseDialogContentById, addCourseDialogContentView } = require("../../db/course_dialog_contents");
const { getCourseById } = require("../../db/courses");
const { getExamDialogContentById, addExamDialogContentView } = require("../../db/exam_dialog_contents");
const { getSubjectById } = require("../../db/subjects");
const { getDashboardDialogContentById, addDashboardDialogContentView } = require("../../db/dashboard_dialog_contents");
const { getSelfTestDialogContentById, addSelfTestDialogContentView } = require("../../db/self_test_dialog_contents");

const router = libExpress.Router();

router.post("/courses", requires_authority(AUTHORITIES.READ_COURSE), async (req, res) => {
    const requiredBodyFields = ["content_id"];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    const content = await getCourseDialogContentById({ id: validatedRequestBody.content_id });
    if (!content) {
        return res.status(400).json({ error: "Content Not Exist" });
    }

    const course = await getCourseById({ id: content.course_id });
    if (!course) {
        return res.status(400).json({ error: "Course Not Exist" });
    }

    const viewId = await addCourseDialogContentView({ user_id: req.user.id, content_id: content.id });
    if (viewId) {
        return res.sendStatus(204);
    }

    return res.status(400).json({ error: "Failed To Record View" });
});

router.post("/exams", async (req, res) => {
    if (!req.user?.id) {
        return res.status(401).json({ error: "Authentication Required" });
    }

    const requiredBodyFields = ["content_id"];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    const content = await getExamDialogContentById({ id: validatedRequestBody.content_id });
    if (!content) {
        return res.status(400).json({ error: "Content Not Exist" });
    }

    const subject = await getSubjectById({ id: content.subject_id });
    // #region agent log
    require("fs").appendFileSync("/home/nisarg/Workspace/sahas/sahas_ui/.cursor/debug-e0c060.log", JSON.stringify({ sessionId: "e0c060", hypothesisId: "A", location: "views.js:POST/exams", message: "view tracking check", data: { contentId: content.id, courseId: content.course_id, subjectId: content.subject_id, subjectFound: !!subject }, timestamp: Date.now() }) + "\n");
    // #endregion
    if (!subject) {
        return res.status(400).json({ error: "Subject Not Exist" });
    }

    const viewId = await addExamDialogContentView({ user_id: req.user.id, content_id: content.id });
    if (viewId) {
        return res.sendStatus(204);
    }

    return res.status(400).json({ error: "Failed To Record View" });
});

router.post("/dashboard", async (req, res) => {
    if (!req.user?.id) {
        return res.status(401).json({ error: "Authentication Required" });
    }

    const requiredBodyFields = ["content_id"];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    const content = await getDashboardDialogContentById({ id: validatedRequestBody.content_id });
    if (!content) {
        return res.status(400).json({ error: "Content Not Exist" });
    }

    const viewId = await addDashboardDialogContentView({ user_id: req.user.id, content_id: content.id });
    if (viewId) {
        return res.sendStatus(204);
    }

    return res.status(400).json({ error: "Failed To Record View" });
});

router.post("/chapters-test", requires_authority(AUTHORITIES.READ_CHAPTERS_TEST), async (req, res) => {
    const requiredBodyFields = ["content_id"];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    const content = await getSelfTestDialogContentById({ id: validatedRequestBody.content_id });
    if (!content) {
        return res.status(400).json({ error: "Content Not Exist" });
    }

    const viewId = await addSelfTestDialogContentView({ user_id: req.user.id, content_id: content.id });
    if (viewId) {
        return res.sendStatus(204);
    }

    return res.status(400).json({ error: "Failed To Record View" });
});

module.exports = router;
