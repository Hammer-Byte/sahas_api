const libExpress = require("express");
const { validateRequestBody } = require("sahas_utils");
const { addMedia, getMediaById, deleteMediaById, updateMediaViewIndexById, updateMediaById, getMediaByChapterIdTypeAndTitle } = require("../db/media");
const requires_active_device = require("../middlewares/requires_active_device");
const requires_authority = require("../middlewares/requires_authority");
const { AUTHORITIES } = require("../constants");

const router = libExpress.Router();

//tested
router.post(
    "/",
    requires_authority(AUTHORITIES.CREATE_MEDIA),
    async (req, res, next) => {
        const requiredBodyFields = ["chapter_id", "title", "type", "view_index"];
        const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);
        if (!isRequestBodyValid) {
            return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
        }
        req.body = validatedRequestBody;
        next();
    },
    async (req, res, next) => {
        if (!!(await getMediaByChapterIdTypeAndTitle(req.body))) {
            return res.status(400).json({ error: "Media Already Exist" });
        }
        next();
    },
    async (req, res) => {
        const mediaId = await addMedia({ ...req.body, created_by: req.user.id });
        res.status(201).json(await getMediaById({ id: mediaId }));
    }
);

//tested
router.patch("/view_indexes", requires_authority(AUTHORITIES.UPDATE_MEDIA), async (req, res) => {
    if (req.body?.length) {
        req.body.forEach(updateMediaViewIndexById);
        return res.sendStatus(200);
    }

    return res.status(400).json({ error: "Missing Media" });
});

//tested
router.patch("/", requires_authority(AUTHORITIES.UPDATE_MEDIA), async (req, res) => {
    const requiredBodyFields = ["id", "title"];

    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (isRequestBodyValid) {
        await updateMediaById(validatedRequestBody);
        res.status(200).json(await getMediaById({ id: validatedRequestBody.id }));
    } else {
        res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }
});

//tested
router.delete("/:id", requires_authority(AUTHORITIES.DELETE_MEDIA), async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing inquiryNoteId" });
    }
    deleteMediaById({ id: req.params.id });
    //remove associated media from bucket as well
    res.sendStatus(204);
});

//tested
router.get("/:id", requires_authority(AUTHORITIES.READ_MEDIA), requires_active_device, async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing Media Id" });
    }

    res.status(200).json(await getMediaById({ id: req.params.id }));
});

module.exports = router;
