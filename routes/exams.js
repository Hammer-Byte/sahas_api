const libExpress = require("express");
const { getExamById } = require("../db/exams");
const { getExamQuestionsForAttendByExamId } = require("../db/exam_questions");
const { userHasExamAccessViaSeriesEnrollment } = require("../db/exam_series_enrollments");

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

    const questions = await getExamQuestionsForAttendByExamId({ exam_id: req.params.id });

    if (!questions?.length) {
        return res.status(400).json({ error: "No Questions Available For This Exam" });
    }

    res.status(200).json(questions);
});

module.exports = router;
