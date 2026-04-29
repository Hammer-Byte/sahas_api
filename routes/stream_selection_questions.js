const libExpress = require("express");

const { validateRequestBody } = require("sahas_utils");
const requires_authority = require("../middlewares/requires_authority");
const { AUTHORITIES } = require("../constants");
const {
    addStreamSelectionQuestion,
    addStreamSelectionQuestionOption,
    getStreamSelectionQuestionById,
    getStreamSelectionQuestionOptionsByQuestionId,
    deleteStreamSelectionQuestionById,
    updateStreamSelectionQuestionById,
    removeStreamSelectionQuestionOptionByQuestionId,
    updatetreamSelectionQuestionViewIndexById,
    getAllStreamSelectionQuestions,
} = require("../db/stream_selection_questions");
const parseAuthenticationToken = require("../middlewares/parse_authentication_token");

const router = libExpress.Router();

//tested
router.patch("/view_indexes",parseAuthenticationToken, requires_authority(AUTHORITIES.UPDATE_CHAPTER_TYPES_VIEW_INDEXES), async (req, res) => {
    if (req.body?.length) {
        req.body.forEach(updatetreamSelectionQuestionViewIndexById);
        return res.sendStatus(200);
    }

    return res.status(400).json({ error: "Missing Chapter Types" });
});

router.get("/", async (req, res) => {
    const questions = await getAllStreamSelectionQuestions();
    for (const question of questions) {
        question.options = await getStreamSelectionQuestionOptionsByQuestionId({ question_id: question?.id });
    }

    return res.status(200).json(questions);
});

//tested
router.post("/",parseAuthenticationToken, requires_authority(AUTHORITIES.CREATE_STREAM_SELECTION_TEST_QUESTION), async (req, res) => {
    const requiredBodyFields = ["category_id", "question", "options"];

    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (isRequestBodyValid) {
        if (validatedRequestBody?.options?.length > 0 && (questionId = await addStreamSelectionQuestion({ ...validatedRequestBody }))) {
            for (const option of validatedRequestBody?.options) {
                await addStreamSelectionQuestionOption({ question_id: questionId, option });
            }
            const streamSelectionQuestion = await getStreamSelectionQuestionById({ id: questionId });
            streamSelectionQuestion.options = await getStreamSelectionQuestionOptionsByQuestionId({ question_id: questionId });

            return res.status(201).json(streamSelectionQuestion);
        }
        res.status(400).json({ error: "Unable To Add Stream Selection Question" });
    } else {
        res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }
});

//tested
router.delete("/:id",parseAuthenticationToken, requires_authority(AUTHORITIES.DELETE_STREAM_SELECTION_TEST_QUESTION), async (req, res) => {
    if (!req.params?.id) {
        return res.status(400).json({ error: "Missing Question Id" });
    }

    deleteStreamSelectionQuestionById(req.params);

    res.sendStatus(204);
});

router.put("/",parseAuthenticationToken, requires_authority(AUTHORITIES.UPDATE_STREAM_SELECTION_TEST_QUESTION), async (req, res) => {
    const requiredBodyFields = ["id", "question", "options"];

    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (isRequestBodyValid) {
        if (validatedRequestBody?.options?.length > 0 && (await updateStreamSelectionQuestionById({ ...validatedRequestBody }))) {
            await removeStreamSelectionQuestionOptionByQuestionId({ question_id: validatedRequestBody?.id });

            for (const option of validatedRequestBody?.options) {
                await addStreamSelectionQuestionOption({ question_id: validatedRequestBody?.id, option });
            }
            const streamSelectionQuestion = await getStreamSelectionQuestionById({ id: validatedRequestBody?.id });
            streamSelectionQuestion.options = await getStreamSelectionQuestionOptionsByQuestionId({ question_id: validatedRequestBody?.id });

            return res.status(200).json(streamSelectionQuestion);
        }
        res.status(400).json({ error: "Unable To Update Stream Selection Question - Missing Options" });
    } else {
        res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }
});

module.exports = router;
