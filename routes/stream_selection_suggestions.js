const libExpress = require("express");
const { validateRequestBody } = require("sahas_utils");
const {
    getAllStreamSelectionSuggestions,
    getStreamSelectionSuggestionById,
    addStreamSelectionSuggestion,
    updateStreamSelectionSuggestionById,
    updateStreamSelectionSuggestionViewIndexById,
    deleteStreamSelectionSuggestionById,
} = require("../db/stream_selection_suggestions");

const router = libExpress.Router();

router.get("/", async (req, res) => {
    const suggestions = await getAllStreamSelectionSuggestions();
    return res.status(200).json(suggestions);
});

router.post("/", async (req, res) => {
    const requiredBodyFields = ["title", "pdf"];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (isRequestBodyValid) {
        const suggestionId = await addStreamSelectionSuggestion(validatedRequestBody);
        return res.status(201).json(await getStreamSelectionSuggestionById({ id: suggestionId }));
    }

    return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
});

router.put("/", async (req, res) => {
    const requiredBodyFields = ["id", "title", "pdf"];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (isRequestBodyValid) {
        await updateStreamSelectionSuggestionById(validatedRequestBody);
        return res.status(200).json(await getStreamSelectionSuggestionById({ id: validatedRequestBody.id }));
    }

    return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
});

router.delete("/:id", async (req, res) => {
    if (!req.params?.id) {
        return res.status(400).json({ error: "Missing Suggestion Id" });
    }

    deleteStreamSelectionSuggestionById(req.params);
    return res.sendStatus(204);
});

router.patch("/view_indexes", async (req, res) => {
    if (req.body?.length) {
        req.body.forEach(updateStreamSelectionSuggestionViewIndexById);
        return res.sendStatus(200);
    }

    return res.status(400).json({ error: "Missing Stream Selection Suggestions" });
});

module.exports = router;
