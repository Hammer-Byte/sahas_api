const libExpress = require("express");
const { getAllExams } = require("../db/exams");

const router = libExpress.Router();

router.get("/", async (req, res) => {
    res.status(200).json(await getAllExams());
});

module.exports = router;
