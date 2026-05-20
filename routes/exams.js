const libExpress = require("express");
const { getAllExams, getExamById, getExamByTitle, addExam, updateExamById } = require("../db/exams");
const { validateRequestBody } = require("sahas_utils");

const router = libExpress.Router();

router.get("/", async (req, res) => {
    res.status(200).json(await getAllExams());
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
    if (!!(await getExamByTitle({ title: req.body.title }))) {
        return res.status(400).json({ error: "Exam Already Exist" });
    }
    next();
}, async (req, res) => {
    const examId = await addExam(req.body);
    res.status(201).json(await getExamById({ id: examId }));
});

router.patch("/", async (req, res) => {
    const requiredBodyFields = ["id", "title", "course_id", "fees", "start_at", "end_at", "active"];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    await updateExamById(validatedRequestBody);
    res.status(200).json(await getExamById({ id: validatedRequestBody.id }));
});

module.exports = router;
