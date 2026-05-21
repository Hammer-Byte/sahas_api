const libExpress = require("express");
const {
    getAllExamSeries,
    getExamSeriesByCourseId,
    getExamSeriesById,
    getExamSeriesByTitle,
    addExamSeries,
    updateExamSeriesById,
} = require("../db/exam_series");
const { getAvailableExamsByCourseId, getExamsByExamSeriesId, addExam, updateExamById, deleteExamById, getExamById } = require("../db/exams");
const {
    getExamQuestionsByExamId,
    getExamQuestionById,
    addExamQuestion,
    updateExamQuestionById,
    deleteExamQuestionById,
} = require("../db/exam_questions");
const { getCourseSubjectsByCourseId } = require("../db/course_subjects");
const {
    addExamSeriesEnrollment,
    getExamSeriesEnrollmentByUserIdAndExamSeriesId,
} = require("../db/exam_series_enrollments");
const { getEnrollmentByCourseIdAndUserId } = require("../db/enrollments");
const { validateRequestBody } = require("sahas_utils");

const router = libExpress.Router();

const EXAM_QUESTION_REQUIRED_FIELDS = ["question", "choice_one", "choice_two", "choice_three", "choice_four", "correct_choice"];

function normalizeChoice(value) {
    return typeof value === "string" ? value.trim() : value;
}

function isValidCorrectChoice(correct_choice, { choice_one, choice_two, choice_three, choice_four }) {
    const normalizedCorrectChoice = normalizeChoice(correct_choice);
    if (!normalizedCorrectChoice) return false;

    return [choice_one, choice_two, choice_three, choice_four].map(normalizeChoice).includes(normalizedCorrectChoice);
}

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

router.patch("/exams", async (req, res) => {
    const requiredBodyFields = ["id", "subject_id", "start_at", "end_at"];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    const exam = await getExamById({ id: validatedRequestBody.id });
    if (!exam) {
        return res.status(400).json({ error: "Exam Not Exist" });
    }

    await updateExamById(validatedRequestBody);
    res.status(200).json(await getExamById({ id: validatedRequestBody.id }));
});

router.delete("/exams/:id", async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing Exam Id" });
    }

    const exam = await getExamById({ id: req.params.id });
    if (!exam) {
        return res.status(400).json({ error: "Exam Not Exist" });
    }

    await deleteExamById({ id: req.params.id });
    res.sendStatus(204);
});

router.get("/courses/:courseId/exams", async (req, res) => {
    if (!req.params.courseId) {
        return res.status(400).json({ error: "Missing Course Id" });
    }

    res.status(200).json(await getAvailableExamsByCourseId({ course_id: req.params.courseId }));
});

router.get("/courses/:courseId", async (req, res) => {
    if (!req.params.courseId) {
        return res.status(400).json({ error: "Missing Course Id" });
    }

    res.status(200).json(await getExamSeriesByCourseId({ course_id: req.params.courseId }));
});

router.post("/enrollments", async (req, res) => {
    const requiredBodyFields = ["exam_series_id"];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    const examSeries = await getExamSeriesById({ id: validatedRequestBody.exam_series_id });
    if (!examSeries) {
        return res.status(400).json({ error: "Exam Series Not Exist" });
    }

    const hasFreeExamSeries = Number(examSeries.fees) === 0;
    const hasActiveCourseEnrollment = !!(await getEnrollmentByCourseIdAndUserId({
        user_id: req.user.id,
        course_id: examSeries.course_id,
    }));

    if (!hasFreeExamSeries && !hasActiveCourseEnrollment) {
        return res.status(400).json({ error: "Payment Required For This Exam Series" });
    }

    const existingEnrollment = await getExamSeriesEnrollmentByUserIdAndExamSeriesId({
        user_id: req.user.id,
        exam_series_id: validatedRequestBody.exam_series_id,
    });

    if (existingEnrollment) {
        return res.status(400).json({ error: "Already Enrolled In This Exam Series" });
    }

    const enrollmentId = await addExamSeriesEnrollment({
        user_id: req.user.id,
        exam_series_id: validatedRequestBody.exam_series_id,
    });

    if (!enrollmentId) {
        return res.status(400).json({ error: "Failed To Enroll In Exam Series" });
    }

    res.status(201).json(
        await getExamSeriesEnrollmentByUserIdAndExamSeriesId({
            user_id: req.user.id,
            exam_series_id: validatedRequestBody.exam_series_id,
        }),
    );
});

router.get("/exams/:examId", async (req, res) => {
    if (!req.params.examId) {
        return res.status(400).json({ error: "Missing Exam Id" });
    }

    const exam = await getExamById({ id: req.params.examId });
    if (!exam) {
        return res.status(400).json({ error: "Exam Not Exist" });
    }

    res.status(200).json(exam);
});

router.get("/exams/:examId/questions", async (req, res) => {
    if (!req.params.examId) {
        return res.status(400).json({ error: "Missing Exam Id" });
    }

    const exam = await getExamById({ id: req.params.examId });
    if (!exam) {
        return res.status(400).json({ error: "Exam Not Exist" });
    }

    res.status(200).json(await getExamQuestionsByExamId({ exam_id: req.params.examId }));
});

router.post("/exams/:examId/questions", async (req, res) => {
    if (!req.params.examId) {
        return res.status(400).json({ error: "Missing Exam Id" });
    }

    const exam = await getExamById({ id: req.params.examId });
    if (!exam) {
        return res.status(400).json({ error: "Exam Not Exist" });
    }

    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, EXAM_QUESTION_REQUIRED_FIELDS);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    if (!isValidCorrectChoice(validatedRequestBody.correct_choice, validatedRequestBody)) {
        return res.status(400).json({ error: "Correct choice must match one of the four options" });
    }

    const examQuestionId = await addExamQuestion({
        exam_id: req.params.examId,
        ...validatedRequestBody,
        media_url: req.body.media_url ?? null,
        created_by: req.user?.id,
    });

    if (!examQuestionId) {
        return res.status(400).json({ error: "Failed To Add Exam Question" });
    }

    res.status(201).json(await getExamQuestionById({ id: examQuestionId }));
});

router.patch("/exam-questions", async (req, res) => {
    const requiredBodyFields = ["id", ...EXAM_QUESTION_REQUIRED_FIELDS];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    if (!isValidCorrectChoice(validatedRequestBody.correct_choice, validatedRequestBody)) {
        return res.status(400).json({ error: "Correct choice must match one of the four options" });
    }

    const examQuestion = await getExamQuestionById({ id: validatedRequestBody.id });
    if (!examQuestion) {
        return res.status(400).json({ error: "Exam Question Not Exist" });
    }

    await updateExamQuestionById({
        ...validatedRequestBody,
        media_url: req.body.media_url ?? null,
        updated_by: req.user?.id,
    });

    res.status(200).json(await getExamQuestionById({ id: validatedRequestBody.id }));
});

router.delete("/exam-questions/:id", async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing Exam Question Id" });
    }

    const examQuestion = await getExamQuestionById({ id: req.params.id });
    if (!examQuestion) {
        return res.status(400).json({ error: "Exam Question Not Exist" });
    }

    await deleteExamQuestionById({ id: req.params.id });
    res.sendStatus(204);
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
    examSeries.exams = await getExamsByExamSeriesId({ exam_series_id: req.params.id });
    examSeries.enrolled = !!(await getExamSeriesEnrollmentByUserIdAndExamSeriesId({
        user_id: req.user.id,
        exam_series_id: req.params.id,
    }));
    res.status(200).json(examSeries);
});

router.post("/:examSeriesId/exams", async (req, res) => {
    if (!req.params.examSeriesId) {
        return res.status(400).json({ error: "Missing Exam Series Id" });
    }

    const examSeries = await getExamSeriesById({ id: req.params.examSeriesId });
    if (!examSeries) {
        return res.status(400).json({ error: "Exam Series Not Exist" });
    }

    const requiredBodyFields = ["subject_id", "start_at", "end_at"];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    const examId = await addExam({
        exam_series_id: req.params.examSeriesId,
        subject_id: validatedRequestBody.subject_id,
        start_at: validatedRequestBody.start_at,
        end_at: validatedRequestBody.end_at,
    });

    if (!examId) {
        return res.status(400).json({ error: "Failed To Add Exam" });
    }

    res.status(201).json(await getExamById({ id: examId }));
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
