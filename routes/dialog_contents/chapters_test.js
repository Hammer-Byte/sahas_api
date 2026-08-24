const libExpress = require("express");
const { validateRequestBody } = require("sahas_utils");
const requires_authority = require("../../middlewares/requires_authority");
const { AUTHORITIES } = require("../../constants");
const { hasRequiredAuthority } = require("../../utils");
const {
    getAllSelfTestDialogContents,
    getSelfTestDialogContentById,
    getEligibleSelfTestDialogContents,
    addSelfTestDialogContent,
    updateSelfTestDialogContentById,
    updateSelfTestDialogContentViewIndexById,
    deleteSelfTestDialogContentById,
} = require("../../db/self_test_dialog_contents");

const router = libExpress.Router();

router.get("/contents", requires_authority(AUTHORITIES.UPDATE_COURSE), async (req, res) => {
    const contents = await getAllSelfTestDialogContents();
    return res.status(200).json(contents);
});

router.get("/", async (req, res) => {
    if (!req.user?.id) {
        return res.status(401).json({ error: "Authentication Required" });
    }

    if (!hasRequiredAuthority(req?.user?.authorities, AUTHORITIES.READ_CHAPTERS_TEST)) {
        return res.status(403).json({ error: `You Don't have authority ${AUTHORITIES.READ_CHAPTERS_TEST} to perform this operation` });
    }

    const contents = await getEligibleSelfTestDialogContents({ user_id: req.user.id });
    return res.status(200).json(contents);
});

router.post(
    "/",
    requires_authority(AUTHORITIES.UPDATE_COURSE),
    async (req, res, next) => {
        const requiredBodyFields = ["content", "start_date", "end_date", "frequency"];
        const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);
        if (!isRequestBodyValid) {
            return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
        }
        req.body = validatedRequestBody;
        next();
    },
    async (req, res) => {
        const existing = await getAllSelfTestDialogContents();
        const view_index = req.body.view_index ?? existing?.length ?? 0;

        const id = await addSelfTestDialogContent({
            content: req.body.content,
            redirect_url: req.body.redirect_url ?? null,
            start_date: req.body.start_date,
            end_date: req.body.end_date,
            daily: !!req.body.daily,
            frequency: req.body.frequency,
            active: req.body.active !== false,
            view_index,
            interval: req.body.interval ?? 0,
        });

        const item = await getSelfTestDialogContentById({ id });
        if (item) {
            return res.status(201).json(item);
        }

        return res.status(400).json({ error: "Failed To Add Dialog Content" });
    },
);

router.patch(
    "/",
    requires_authority(AUTHORITIES.UPDATE_COURSE),
    async (req, res, next) => {
        const requiredBodyFields = ["id", "content", "start_date", "end_date", "frequency"];
        const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);
        if (!isRequestBodyValid) {
            return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
        }
        req.body = validatedRequestBody;
        next();
    },
    async (req, res) => {
        const existing = await getSelfTestDialogContentById({ id: req.body.id });
        if (!existing) {
            return res.status(400).json({ error: "Content Not Exist" });
        }

        await updateSelfTestDialogContentById({
            id: req.body.id,
            content: req.body.content,
            redirect_url: req.body.redirect_url !== undefined ? req.body.redirect_url : existing.redirect_url,
            start_date: req.body.start_date,
            end_date: req.body.end_date,
            daily: req.body.daily !== undefined ? !!req.body.daily : existing.daily,
            frequency: req.body.frequency,
            active: req.body.active !== undefined ? !!req.body.active : existing.active,
            view_index: req.body.view_index ?? existing.view_index,
            interval: req.body.interval !== undefined ? req.body.interval : existing.interval ?? 0,
        });

        const item = await getSelfTestDialogContentById({ id: req.body.id });
        if (item) {
            return res.status(200).json(item);
        }

        return res.status(400).json({ error: "Failed To Update Dialog Content" });
    },
);

router.patch("/view_indexes", requires_authority(AUTHORITIES.UPDATE_COURSE), async (req, res) => {
    if (req.body?.length) {
        req.body.forEach(updateSelfTestDialogContentViewIndexById);
        return res.sendStatus(200);
    }

    return res.status(400).json({ error: "Missing Dialog Contents" });
});

router.delete("/:contentId", requires_authority(AUTHORITIES.UPDATE_COURSE), async (req, res) => {
    if (!req.params.contentId) {
        return res.status(400).json({ error: "Missing Content Id" });
    }

    const content = await getSelfTestDialogContentById({ id: req.params.contentId });
    if (!content) {
        return res.status(400).json({ error: "Content Not Exist" });
    }

    await deleteSelfTestDialogContentById({ id: req.params.contentId });
    res.sendStatus(204);
});

module.exports = router;
