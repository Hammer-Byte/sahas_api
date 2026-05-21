const libExpress = require("express");
const { getExamById } = require("../db/exams");

const router = libExpress.Router();

router.get("/:id", async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing Exam Id" });
    }

    const exam = await getExamById({ id: req.params.id });
    if (!exam) {
        return res.status(400).json({ error: "Exam Not Exist" });
    }

    res.status(200).json(exam);
});

module.exports = router;
