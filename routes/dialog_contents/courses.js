const libExpress = require("express");
const { validateRequestBody } = require("sahas_utils");
const requires_authority = require("../../middlewares/requires_authority");
const { AUTHORITIES } = require("../../constants");
const { getCourseById } = require("../../db/courses");
const {
    getCourseDialogContentsByCourseId,
    getCourseDialogContentById,
    getEligibleCourseDialogContentsByCourseId,
    getAllCoursesWithDialogContents,
    addCourseDialogContent,
    updateCourseDialogContentById,
    updateCourseDialogContentViewIndexById,
    deleteCourseDialogContentById,
} = require("../../db/course_dialog_contents");

const router = libExpress.Router();

router.get("/", requires_authority(AUTHORITIES.UPDATE_COURSE), async (req, res) => {
    const courses = await getAllCoursesWithDialogContents();
    return res.status(200).json(courses);
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

        const existing = await getCourseDialogContentsByCourseId({ course_id: req.body.course_id });
        const view_index = req.body.view_index ?? existing?.length ?? 0;

        const id = await addCourseDialogContent({
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

        const item = await getCourseDialogContentById({ id });
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
        const existing = await getCourseDialogContentById({ id: req.body.id });
        if (!existing) {
            return res.status(400).json({ error: "Content Not Exist" });
        }

        await updateCourseDialogContentById({
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

        const item = await getCourseDialogContentById({ id: req.body.id });
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
        req.body.forEach(updateCourseDialogContentViewIndexById);
        return res.sendStatus(200);
    }

    return res.status(400).json({ error: "Missing Dialog Contents" });
});

router.delete("/:contentId", requires_authority(AUTHORITIES.UPDATE_COURSE), async (req, res) => {
    if (!req.params.contentId) {
        return res.status(400).json({ error: "Missing Content Id" });
    }

    const content = await getCourseDialogContentById({ id: req.params.contentId });
    if (!content) {
        return res.status(400).json({ error: "Content Not Exist" });
    }

    await deleteCourseDialogContentById({ id: req.params.contentId });
    res.sendStatus(204);
});

router.get("/:courseId", requires_authority(AUTHORITIES.READ_COURSE), async (req, res) => {
    if (!req.params.courseId) {
        return res.status(400).json({ error: "Missing Course Id" });
    }

    const course = await getCourseById({ id: req.params.courseId });
    if (!course) {
        return res.status(400).json({ error: "Course Not Exist" });
    }

    const contents = await getEligibleCourseDialogContentsByCourseId({
        course_id: req.params.courseId,
        user_id: req.user.id,
    });

    return res.status(200).json(contents);
});

module.exports = router;
