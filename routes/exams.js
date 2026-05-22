const libExpress = require("express");
const { validateRequestBody } = require("sahas_utils");
const { getExamById } = require("../db/exams");
const { getExamQuestionsForAttendByExamId, getExamQuestionsByExamId } = require("../db/exam_questions");
const { userHasExamAccessViaSeriesEnrollment } = require("../db/exam_series_enrollments");
const { getExamCandidatureByUserIdAndExamId, addExamCandidature, markExamCandidatureSubmitted } = require("../db/exam_candidatures");
const { addExamSubmission } = require("../db/exam_submissions");

const router = libExpress.Router();

const EXAM_SUBMISSION_GRACE_MS = 5 * 60 * 1000;

function isExamWithinWindow({ start_at, end_at }) {
    const now = Date.now();
    const start = new Date(start_at).getTime();
    const end = new Date(end_at).getTime();
    return now >= start && now <= end;
}

function isExamWithinSubmissionWindow({ start_at, end_at }) {
    const now = Date.now();
    const start = new Date(start_at).getTime();
    const end = new Date(end_at).getTime() + EXAM_SUBMISSION_GRACE_MS;
    return now >= start && now <= end;
}

router.get("/:id", async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing Exam Id" });
    }

    if (!req.user?.id) {
        return res.status(401).json({ error: "Authentication Required" });
    }

    const exam = await getExamById({ id: req.params.id });
    if (!exam) {
        return res.status(400).json({ error: "Exam Not Exist" });
    }

    const hasExamAccess = await userHasExamAccessViaSeriesEnrollment({
        user_id: req.user.id,
        exam_id: req.params.id,
    });

    if (!hasExamAccess) {
        return res.status(403).json({ error: "Exam Series Enrollment Required" });
    }

    const candidature = await getExamCandidatureByUserIdAndExamId({
        user_id: req.user.id,
        exam_id: req.params.id,
    });

    exam.attempted = !!candidature?.submitted_on;

    res.status(200).json(exam);
});

router.post("/:id/candidature", async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing Exam Id" });
    }

    if (!req.user?.id) {
        return res.status(401).json({ error: "Authentication Required" });
    }

    const requiredBodyFields = ["identity", "selfie"];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    const exam = await getExamById({ id: req.params.id });
    if (!exam) {
        return res.status(400).json({ error: "Exam Not Exist" });
    }

    if (!isExamWithinWindow({ start_at: exam.start_at, end_at: exam.end_at })) {
        return res.status(400).json({ error: "Exam Is Not Available At This Time" });
    }

    const hasExamAccess = await userHasExamAccessViaSeriesEnrollment({
        user_id: req.user.id,
        exam_id: req.params.id,
    });

    if (!hasExamAccess) {
        return res.status(403).json({ error: "Exam Series Enrollment Required" });
    }

    const existingCandidature = await getExamCandidatureByUserIdAndExamId({
        user_id: req.user.id,
        exam_id: req.params.id,
    });

    if (existingCandidature) {
        return res.status(400).json({ error: "Exam Attempt Already Recorded" });
    }

    const candidatureId = await addExamCandidature({
        user_id: req.user.id,
        exam_id: req.params.id,
        identity: validatedRequestBody.identity,
        selfie: validatedRequestBody.selfie,
    });

    if (!candidatureId) {
        return res.status(400).json({ error: "Failed To Record Exam Candidature" });
    }

    res.status(201).json({ id: candidatureId });
});

router.get("/:id/questions", async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing Exam Id" });
    }

    if (!req.user?.id) {
        return res.status(401).json({ error: "Authentication Required" });
    }

    const exam = await getExamById({ id: req.params.id });
    if (!exam) {
        return res.status(400).json({ error: "Exam Not Exist" });
    }

    if (!isExamWithinWindow({ start_at: exam.start_at, end_at: exam.end_at })) {
        return res.status(400).json({ error: "Exam Is Not Available At This Time" });
    }

    const hasExamAccess = await userHasExamAccessViaSeriesEnrollment({
        user_id: req.user.id,
        exam_id: req.params.id,
    });

    if (!hasExamAccess) {
        return res.status(403).json({ error: "Exam Series Enrollment Required" });
    }

    const candidature = await getExamCandidatureByUserIdAndExamId({
        user_id: req.user.id,
        exam_id: req.params.id,
    });

    if (!candidature) {
        return res.status(400).json({ error: "Exam Candidature Required Before Attending" });
    }

    const questions = await getExamQuestionsForAttendByExamId({ exam_id: req.params.id });

    if (!questions?.length) {
        return res.status(400).json({ error: "No Questions Available For This Exam" });
    }

    res.status(200).json(questions);
});

router.post("/:id/submissions", async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing Exam Id" });
    }

    if (!req.user?.id) {
        return res.status(401).json({ error: "Authentication Required" });
    }

    const submissions = req.body?.submissions;
    if (!Array.isArray(submissions)) {
        return res.status(400).json({ error: "Missing Submissions" });
    }

    const exam = await getExamById({ id: req.params.id });
    if (!exam) {
        return res.status(400).json({ error: "Exam Not Exist" });
    }

    const hasExamAccess = await userHasExamAccessViaSeriesEnrollment({
        user_id: req.user.id,
        exam_id: req.params.id,
    });

    if (!hasExamAccess) {
        return res.status(403).json({ error: "Exam Series Enrollment Required" });
    }

    const candidature = await getExamCandidatureByUserIdAndExamId({
        user_id: req.user.id,
        exam_id: req.params.id,
    });

    if (!candidature) {
        return res.status(400).json({ error: "Exam Candidature Required Before Submitting" });
    }

    if (!isExamWithinSubmissionWindow({ start_at: exam.start_at, end_at: exam.end_at })) {
        return res.status(400).json({ error: "Exam Submission Window Has Closed" });
    }

    if (candidature.submitted_on) {
        return res.status(400).json({ error: "Exam Submissions Already Recorded" });
    }

    const examQuestions = await getExamQuestionsByExamId({ exam_id: req.params.id });
    const questionsById = new Map(examQuestions.map((question) => [question.id, question]));

    for (const submission of submissions) {
        const questionId = Number(submission?.question_id);
        const submittedAnswer = submission?.submitted_answer;

        if (!questionId || !submittedAnswer) {
            return res.status(400).json({ error: "Invalid Submission Entry" });
        }

        const question = questionsById.get(questionId);
        if (!question) {
            return res.status(400).json({ error: "Invalid Question For This Exam" });
        }

        const validChoices = [question.choice_one, question.choice_two, question.choice_three, question.choice_four].filter(Boolean);
        if (!validChoices.includes(submittedAnswer)) {
            return res.status(400).json({ error: "Invalid Answer For Question" });
        }
    }

    const insertedSubmissions = [];
    for (const submission of submissions) {
        const questionId = Number(submission.question_id);
        const question = questionsById.get(questionId);
        const marks = question.correct_choice === submission.submitted_answer ? 1 : 0;

        const submissionId = await addExamSubmission({
            user_id: req.user.id,
            exam_id: req.params.id,
            question_id: questionId,
            submitted_answer: submission.submitted_answer,
            marks,
        });

        if (!submissionId) {
            return res.status(400).json({ error: "Failed To Record Exam Submissions" });
        }

        insertedSubmissions.push({
            id: submissionId,
            question_id: questionId,
            submitted_answer: submission.submitted_answer,
            marks,
        });
    }

    await markExamCandidatureSubmitted({ user_id: req.user.id, exam_id: req.params.id });

    res.status(201).json({ submissions: insertedSubmissions });
});

module.exports = router;
