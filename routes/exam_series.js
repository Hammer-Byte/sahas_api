const libExpress = require("express");
const { getAllExamSeries, getExamSeriesById, getExamSeriesByTitle, addExamSeries, updateExamSeriesById } = require("../db/exam_series");
const { getExamsByExamSeriesId } = require("../db/exams");
const { getCourseSubjectsByCourseId } = require("../db/course_subjects");
const { validateRequestBody } = require("sahas_utils");

const router = libExpress.Router();

router.get("/", async (req, res) => {
    res.status(200).json(await getAllExamSeries());
});

router.post("/", async (req, res, next) => {
    const requiredBodyFields = ["title", "course_id", "fees", "start_at", "end_at", "active"];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    req.body = validatedRequestBody;
    next();
}, async (req, res, next) => {
    if (!!(await getExamSeriesByTitle({ title: req.body.title }))) {
        return res.status(400).json({ error: "Exam Series Already Exist" });
    }
    next();
}, async (req, res) => {
    const examSeriesId = await addExamSeries(req.body);
    res.status(201).json(await getExamSeriesById({ id: examSeriesId }));
});

router.get("/:id", async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing Exam Series Id" });
    }

    const examSeries = await getExamSeriesById({ id: req.params.id });
    if (!examSeries) {
        return res.status(400).json({ error: "Exam Series Not Exist" });
    }

    examSeries.subjects = await getCourseSubjectsByCourseId({ course_id: examSeries.course_id });
    res.status(200).json(examSeries);
});

router.get("/:examSeriesId/exams", async (req, res) => {
    if (!req.params.examSeriesId) {
        return res.status(400).json({ error: "Missing Exam Series Id" });
    }

    const examSeries = await getExamSeriesById({ id: req.params.examSeriesId });
    if (!examSeries) {
        return res.status(400).json({ error: "Exam Series Not Exist" });
    }

    res.status(200).json(await getExamsByExamSeriesId({ exam_series_id: req.params.examSeriesId }));
});

router.patch("/", async (req, res) => {
    const requiredBodyFields = ["id", "title", "course_id", "fees", "start_at", "end_at", "active"];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    await updateExamSeriesById(validatedRequestBody);
    res.status(200).json(await getExamSeriesById({ id: validatedRequestBody.id }));
});

module.exports = router;
