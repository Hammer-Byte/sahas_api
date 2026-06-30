const libExpress = require("express");
const { addCounselingNote, deleteCounselingNoteById, updateCounselingNoteById, getCounselingNoteById } = require("../db/counseling_notes");
const { validateRequestBody } = require("sahas_utils");
const requires_authority = require("../middlewares/requires_authority");
const { AUTHORITIES } = require("../constants");

const router = libExpress.Router();

// Create a new note
router.post("/", requires_authority(AUTHORITIES.CREATE_COUNSELING_NOTE), async (req, res) => {
    const requiredBodyFields = ["user_id", "note"];

    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (isRequestBodyValid) {
        const counselingNoteId = await addCounselingNote({
            ...validatedRequestBody,
            type: req.body.type ?? null,
            attachment: req.body.attachment ?? null,
            created_by: req.user.id,
        });
        res.status(201).json(await getCounselingNoteById({ id: counselingNoteId }));
    } else {
        res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }
});

// Update a note
router.patch("/", requires_authority(AUTHORITIES.UPDATE_COUNSELING_NOTE), async (req, res) => {
    const requiredBodyFields = ["id", "note"];

    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (isRequestBodyValid) {
        await updateCounselingNoteById({
            id: validatedRequestBody.id,
            note: validatedRequestBody.note,
            type: req.body.type ?? null,
            attachment: req.body.attachment ?? null,
        });
        res.status(200).json(await getCounselingNoteById({ id: validatedRequestBody.id }));
    } else {
        res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }
});

// Delete a note
router.delete("/:id", requires_authority(AUTHORITIES.DELETE_COUNSELING_NOTE), async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing note id" });
    }
    await deleteCounselingNoteById({ id: req.params.id });
    res.sendStatus(204);
});

module.exports = router;
