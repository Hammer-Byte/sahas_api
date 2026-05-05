const libExpress = require("express");
const { addGlobalNote, deleteGlobalNoteById, updateGlobalNoteById, getGlobalNoteById } = require("../db/global_notes");
const { validateRequestBody } = require("sahas_utils");
const requires_authority = require("../middlewares/requires_authority");
const { AUTHORITIES } = require("../constants");

const router = libExpress.Router();

// Create a new note
router.post("/", requires_authority(AUTHORITIES.CREATE_GLOBAL_NOTE), async (req, res) => {
    const requiredBodyFields = ["user_id", "note"];

    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (isRequestBodyValid) {
        const globalNoteId = await addGlobalNote({ ...validatedRequestBody,  created_by: req.user.id });
        res.status(201).json(await getGlobalNoteById({ id: globalNoteId }));
    } else {
        res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }
});

// Update a note
router.patch("/", requires_authority(AUTHORITIES.UPDATE_GLOBAL_NOTE), async (req, res) => {
    const requiredBodyFields = ["id", "note"];

    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (isRequestBodyValid) {
        await updateGlobalNoteById(validatedRequestBody);
        res.status(200).json(await getGlobalNoteById({ id: validatedRequestBody.id }));
    } else {
        res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }
});

// Delete a note
router.delete("/:id", requires_authority(AUTHORITIES.DELETE_GLOBAL_NOTE), async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing note id" });
    }
    await deleteGlobalNoteById({ id: req.params.id });
    res.sendStatus(204);
});

module.exports = router;
