const libExpress = require("express");

const { validateRequestBody } = require("sahas_utils");
const { updateSubjectById, addSubject, getAllSubjects, getSubjectById } = require("../db/subjects");
const {
    addCourseSubject,
    getCourseSubjectById,
    getSubjectByCourseIdAndTitle,
} = require("../db/course_subjects");
const { getChaptersBySubjectId } = require("../db/chapters");
const { getTestConfigurationByChapterId } = require("../db/test_configurations");
const requires_authority = require("../middlewares/requires_authority");
const { AUTHORITIES } = require("../constants");

const router = libExpress.Router();

//tested
router.patch("/", requires_authority(AUTHORITIES.UPDATE_SUBJECTS), async (req, res) => {
    const requiredBodyFields = ["id", "title"];

    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (isRequestBodyValid) {
        updateSubjectById(validatedRequestBody);
        res.status(200).json(validatedRequestBody);
    } else {
        res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }
});

//tested
router.get("/", requires_authority(AUTHORITIES.READ_SUBJECTS), async (req, res) => {
    //provide all the subjects
    res.status(200).json(await getAllSubjects());
});

//tested
router.get("/:id", requires_authority(AUTHORITIES.READ_SUBJECTS), async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing Subject id" });
    }
    //provide subject
    res.status(200).json(await getSubjectById({ id: req.params.id }));
});

//tested
router.get("/:id/chapters", requires_authority(AUTHORITIES.READ_SUBJECTS_CHAPTERS), async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing Subject id" });
    }
    //provide all the subjects
    const chapters = await getChaptersBySubjectId({ subject_id: req.params.id });

    for (const chapter of chapters) {
        if (chapter?.test_configuration_id) chapter.testConfiguration = await getTestConfigurationByChapterId({ chapter_id: chapter?.id });
    }

    res.status(200).json(chapters);
});

//tested
router.post(
    "/",
    requires_authority(AUTHORITIES.CREATE_COURSE_SUBJECTS),
    async (req, res, next) => {
        const requiredBodyFields = ["title", "course_id", "view_index"];
        const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);
        if (!isRequestBodyValid) {
            return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
        }
        req.body = validatedRequestBody;
        next();
    },
    async (req, res, next) => {
        if (!!(await getSubjectByCourseIdAndTitle(req.body))) {
            return res.status(400).json({ error: "Subject Already Exist" });
        }
        next();
    },
    async (req, res) => {
        const subjectId = await addSubject(req.body);
        const courseSubjectId = await addCourseSubject({
            course_id: req.body.course_id,
            subject_id: subjectId,
            view_index: req.body.view_index,
        });
        res.status(201).json(await getCourseSubjectById({ id: courseSubjectId }));
    },
);

module.exports = router;
