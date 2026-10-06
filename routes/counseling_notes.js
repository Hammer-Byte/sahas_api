const libExpress = require("express");
const { addCounselingNote, deleteCounselingNoteById, updateCounselingNoteById, getCounselingNoteById } = require("../db/counseling_notes");
const { validateRequestBody } = require("sahas_utils");
const requires_authority = require("../middlewares/requires_authority");
const { AUTHORITIES } = require("../constants");
const { createNotification } = require("../libs/notifications");

const router = libExpress.Router();

// Create a new note
router.post("/", requires_authority(AUTHORITIES.CREATE_COUNSELING_NOTE), async (req, res) => {
    const requiredBodyFields = ["user_id", "note"];

    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    try {
        const counselingNoteId = await addCounselingNote({
            ...validatedRequestBody,
            type: req.body.type ?? null,
            attachment: req.body.attachment ?? null,
            created_by: req.user.id,
        });
        const note = await getCounselingNoteById({ id: counselingNoteId });
        await createNotification({
            user_id: note.user_id,
            title: "A counseling note was created",
            description: "A new counseling note has been added to your profile.",
            created_by: req.user.id,
        });
        return res.status(201).json(note);
    } catch (error) {
        return res.status(400).json({ error: error?.sqlMessage || error?.message || "Failed To Add Counseling Note" });
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
        const note = await getCounselingNoteById({ id: validatedRequestBody.id });
        await createNotification({
            user_id: note.user_id,
            title: "A counseling note was updated",
            description: "A counseling note on your profile was updated.",
            created_by: req.user.id,
        });
        res.status(200).json(note);
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
