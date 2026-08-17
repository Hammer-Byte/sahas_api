const libExpress = require("express");
const libCrypto = require("crypto");
const { readConfig } = require("../libs/config");
const { fetchExamQuestionsFromCsvUrl } = require("../libs/exam_questions_csv");
const { PAYMENT_GATEWAY_PRODUCT_EXAM_SERIES, PAYMENT_GATEWAY_TYPE_EXAM_SERIES, AUTHORITIES } = require("../constants");
const requires_authority = require("../middlewares/requires_authority");
const { addPaymentGateWayPayLoad } = require("../db/payment_gateway_payloads");
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
    getExamSeriesEnrollmentById,
    getExamSeriesEnrollmentByUserIdAndExamSeriesId,
    getExamSeriesEnrollmentsByExamSeriesId,
    deleteExamSeriesEnrollmentById,
} = require("../db/exam_series_enrollments");
const { getExamSubmissionMarksByExamSeriesId } = require("../db/exam_submissions");
const { getExamSeriesResultRowsByUserIdAndExamSeriesId } = require("../db/exam_series_results");
const { buildExamSeriesMeritList } = require("../libs/exam_series_merit");
const { buildExamSeriesResult } = require("../libs/exam_series_result");
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
    const requiredBodyFields = ["id", "subject_id", "start_at", "end_at", "positive_marks", "negative_marks"];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    if (typeof validatedRequestBody.positive_marks !== "number" || typeof validatedRequestBody.negative_marks !== "number") {
        return res.status(400).json({ error: "positive_marks and negative_marks must be numbers" });
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
        return res.status(405).json({ error: "Payment Required For This Exam Series" });
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

router.delete("/enrollments/:id", requires_authority(AUTHORITIES.USE_PAGE_MANAGE_EXAMS), async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing Enrollment Id" });
    }

    const enrollment = await getExamSeriesEnrollmentById({ id: req.params.id });
    if (!enrollment) {
        return res.status(400).json({ error: "Exam Series Enrollment Not Exist" });
    }

    await deleteExamSeriesEnrollmentById({ id: req.params.id });
    res.sendStatus(204);
});

router.post("/payment-gateway-payloads", async (req, res) => {
    const requiredBodyFields = ["exam_series_id"];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    const examSeries = await getExamSeriesById({ id: validatedRequestBody.exam_series_id });
    if (!examSeries) {
        return res.status(400).json({ error: "Exam Series Not Exist" });
    }

    if (Number(examSeries.fees) === 0) {
        return res.status(400).json({ error: "This Exam Series Does Not Require Payment" });
    }

    const existingEnrollment = await getExamSeriesEnrollmentByUserIdAndExamSeriesId({
        user_id: req.user.id,
        exam_series_id: validatedRequestBody.exam_series_id,
    });

    if (existingEnrollment) {
        return res.status(400).json({ error: "Already Enrolled In This Exam Series" });
    }

    const { payment: { cgst, sgst } = {}, paymentGateWay: { merchantKey, merchantSalt, redirectionHost, resultAPI, url } = {} } = await readConfig("app");

    const paymentGateWayPayLoad = {
        type: PAYMENT_GATEWAY_TYPE_EXAM_SERIES,
        exam_series_id: examSeries.id,
        examSeries,
        paymentGateWay: {
            merchantKey,
            url,
        },
        transaction: {
            id: libCrypto.randomUUID(),
            successURL: redirectionHost.concat(resultAPI),
            failureURL: redirectionHost.concat(resultAPI),
            amount: Number(examSeries.fees),
        },
        user: {
            email: req.user.email,
            firstName: req.user.full_name?.split(" ")[0],
            lastName: req.user.full_name?.split(" ")?.[1] || "NA",
            phone: req.user.phone,
        },
        product: PAYMENT_GATEWAY_PRODUCT_EXAM_SERIES,
    };

    paymentGateWayPayLoad.transaction.cgst = ((paymentGateWayPayLoad.transaction.amount * cgst) / 100).toFixed(2);
    paymentGateWayPayLoad.transaction.sgst = ((paymentGateWayPayLoad.transaction.amount * sgst) / 100).toFixed(2);

    paymentGateWayPayLoad.transaction.preTaxAmount =
        Number(paymentGateWayPayLoad.transaction.amount.toFixed(2)) -
        (Number(paymentGateWayPayLoad.transaction.cgst) + Number(paymentGateWayPayLoad.transaction.sgst));

    paymentGateWayPayLoad.transaction.amount = (
        Number(paymentGateWayPayLoad.transaction.preTaxAmount) +
        Number(paymentGateWayPayLoad.transaction.sgst) +
        Number(paymentGateWayPayLoad.transaction.cgst)
    ).toFixed(2);

    paymentGateWayPayLoad.transaction.hash = libCrypto
        .createHash("sha512")
        .update(
            `${merchantKey}|${paymentGateWayPayLoad.transaction.id}|${paymentGateWayPayLoad.transaction.amount}|${paymentGateWayPayLoad.product}|${paymentGateWayPayLoad.user.firstName}|${paymentGateWayPayLoad.user.email}|||||||||||${merchantSalt}`,
        )
        .digest("hex");

    addPaymentGateWayPayLoad(paymentGateWayPayLoad);

    res.status(201).json(paymentGateWayPayLoad);
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

router.post("/exam-questions/bulk", async (req, res) => {
    const requiredBodyFields = ["exam_id", "csv_url"];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    const exam = await getExamById({ id: validatedRequestBody.exam_id });
    if (!exam) {
        return res.status(400).json({ error: "Exam Not Exist" });
    }

    let csvResult;
    try {
        csvResult = await fetchExamQuestionsFromCsvUrl({ csv_url: validatedRequestBody.csv_url });
    } catch (error) {
        return res.status(400).json({ error: "Failed To Read CSV File" });
    }

    if (csvResult.error) {
        return res.status(400).json({ error: csvResult.error });
    }

    const insertedQuestions = [];

    for (const questionRow of csvResult.questions) {
        if (!isValidCorrectChoice(questionRow.correct_choice, questionRow)) {
            return res.status(400).json({ error: "Correct choice must match one of the four options in CSV" });
        }

        const examQuestionId = await addExamQuestion({
            exam_id: validatedRequestBody.exam_id,
            ...questionRow,
            media_url: null,
            created_by: req.user?.id,
        });

        if (!examQuestionId) {
            return res.status(400).json({ error: "Failed To Import Exam Questions" });
        }

        insertedQuestions.push(await getExamQuestionById({ id: examQuestionId }));
    }

    res.status(201).json({
        count: insertedQuestions.length,
        questions: insertedQuestions,
    });
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

router.get("/:examSeriesId/enrollments", async (req, res) => {
    if (!req.params.examSeriesId) {
        return res.status(400).json({ error: "Missing Exam Series Id" });
    }

    const examSeries = await getExamSeriesById({ id: req.params.examSeriesId });
    if (!examSeries) {
        return res.status(400).json({ error: "Exam Series Not Exist" });
    }

    const enrollments = await getExamSeriesEnrollmentsByExamSeriesId({
        exam_series_id: req.params.examSeriesId,
    });

    res.status(200).json(enrollments);
});

router.get("/:examSeriesId/result", async (req, res) => {
    if (!req.params.examSeriesId) {
        return res.status(400).json({ error: "Missing Exam Series Id" });
    }

    if (!req.user?.id) {
        return res.status(401).json({ error: "Authentication Required" });
    }

    const examSeries = await getExamSeriesById({ id: req.params.examSeriesId });
    if (!examSeries) {
        return res.status(400).json({ error: "Exam Series Not Exist" });
    }

    const isEnrolled = !!(await getExamSeriesEnrollmentByUserIdAndExamSeriesId({
        user_id: req.user.id,
        exam_series_id: req.params.examSeriesId,
    }));

    if (!isEnrolled) {
        return res.status(403).json({ error: "Exam Series Enrollment Required" });
    }

    const resultRows = await getExamSeriesResultRowsByUserIdAndExamSeriesId({
        user_id: req.user.id,
        exam_series_id: req.params.examSeriesId,
    });

    const exams = buildExamSeriesResult({ rows: resultRows });

    res.status(200).json({
        exam_series_id: Number(req.params.examSeriesId),
        exam_series_title: examSeries.title,
        exams,
    });
});

router.get("/:examSeriesId/merit", async (req, res) => {
    if (!req.params.examSeriesId) {
        return res.status(400).json({ error: "Missing Exam Series Id" });
    }

    if (!req.user?.id) {
        return res.status(401).json({ error: "Authentication Required" });
    }

    const examSeries = await getExamSeriesById({ id: req.params.examSeriesId });
    if (!examSeries) {
        return res.status(400).json({ error: "Exam Series Not Exist" });
    }

    const isEnrolled = !!(await getExamSeriesEnrollmentByUserIdAndExamSeriesId({
        user_id: req.user.id,
        exam_series_id: req.params.examSeriesId,
    }));

    if (!isEnrolled) {
        return res.status(403).json({ error: "Exam Series Enrollment Required" });
    }

    if (Date.now() <= new Date(examSeries.end_at).getTime()) {
        return res.status(400).json({ error: "Merit Is Available After Exam Series Ends" });
    }

    const exams = await getExamsByExamSeriesId({ exam_series_id: req.params.examSeriesId });
    const submissionMarks = await getExamSubmissionMarksByExamSeriesId({ exam_series_id: req.params.examSeriesId });
    const merit_list = buildExamSeriesMeritList({ exams, submissionMarks });

    res.status(200).json({
        exam_series_id: Number(req.params.examSeriesId),
        exam_series_title: examSeries.title,
        total_exams: exams.length,
        exams: exams.map((exam) => ({
            id: exam.id,
            subject_title: exam.subject_title,
        })),
        merit_list,
    });
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
    examSeries.enrolled = req.user?.id
        ? !!(await getExamSeriesEnrollmentByUserIdAndExamSeriesId({
              user_id: req.user.id,
              exam_series_id: req.params.id,
          }))
        : false;
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

    const requiredBodyFields = ["subject_id", "start_at", "end_at", "positive_marks", "negative_marks"];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    if (typeof validatedRequestBody.positive_marks !== "number" || typeof validatedRequestBody.negative_marks !== "number") {
        return res.status(400).json({ error: "positive_marks and negative_marks must be numbers" });
    }

    const examId = await addExam({
        exam_series_id: req.params.examSeriesId,
        subject_id: validatedRequestBody.subject_id,
        start_at: validatedRequestBody.start_at,
        end_at: validatedRequestBody.end_at,
        positive_marks: validatedRequestBody.positive_marks,
        negative_marks: validatedRequestBody.negative_marks,
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
