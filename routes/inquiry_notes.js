const libExpress = require("express");
const { addInquiryNote, getInquiryNoteById, deleteInquiryNoteById } = require("../db/inquiry_notes");
const { validateRequestBody } = require("sahas_utils");
const requires_authority = require("../middlewares/requires_authority");
const { AUTHORITIES } = require("../constants");
const { getInquiryById } = require("../db/inquiries");
const { createNotification } = require("../libs/notifications");

const router = libExpress.Router();

//tested
router.post("/", requires_authority(AUTHORITIES.CREATE_INQUIRY_NOTE), async (req, res) => {
    const requiredBodyFields = ["inquiry_id", "note"];

    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (isRequestBodyValid) {
        const inquityNoteId = await addInquiryNote({ ...validatedRequestBody, created_by: req.user.id });
        const inquiry = await getInquiryById({ id: validatedRequestBody.inquiry_id });
        if (inquiry?.user_id) {
            await createNotification({
                user_id: inquiry.user_id,
                title: "An inquiry note was added",
                description: "A new note was added to your inquiry.",
                created_by: req.user.id,
            });
        }
        res.status(201).json(await getInquiryNoteById({ id: inquityNoteId }));
    } else {
        res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }
});

//tested
router.delete("/:id", requires_authority(AUTHORITIES.DELETE_INQUIRY_NOTE), async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing inquiryNoteId" });
    }
    deleteInquiryNoteById({ id: req.params.id });
    res.sendStatus(204);
});

module.exports = router;
