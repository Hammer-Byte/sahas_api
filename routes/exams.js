const libExpress = require("express");
const { validateRequestBody } = require("sahas_utils");
const { getExamById } = require("../db/exams");
const { getExamQuestionsForAttendByExamId } = require("../db/exam_questions");
const { userHasExamAccessViaSeriesEnrollment } = require("../db/exam_series_enrollments");
const { getExamCandidatureByUserIdAndExamId, addExamCandidature } = require("../db/exam_candidatures");

const router = libExpress.Router();

function isExamWithinWindow({ start_at, end_at }) {
    const now = Date.now();
    const start = new Date(start_at).getTime();
    const end = new Date(end_at).getTime();
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

module.exports = router;
