const libExpress = require("express");
const {
    getAllStreamSelectionTestInvites,
    getStreamSelectionTestInviteById,
    updateStreamSelectionTestInviteById,
    addStreamSelectionTestInvite,
    deleteStreamSelectionTestInviteById,
} = require("../db/stream_selection_test_invites");
const {  patchUserStreamSelectionTestAllowedById } = require("../db/users");
const { validateRequestBody } = require("sahas_utils");
const requires_authority = require("../middlewares/requires_authority");
const { AUTHORITIES } = require("../constants");


const parseAuthenticationToken = require("../middlewares/parse_authentication_token");
const parseUserDevice = require("../middlewares/parse_user_device");
const requiresDeviceFingerPrint = require("../middlewares/requires_device_finger_print");


const router = libExpress.Router();

// Get all stream selection test invites
router.get("/",requiresDeviceFingerPrint, parseAuthenticationToken, parseUserDevice,  async (req, res) => {
    const invites = await getAllStreamSelectionTestInvites();
    res.status(200).json(invites);
});

router.post("/",requiresDeviceFingerPrint, parseAuthenticationToken, parseUserDevice,  requires_authority(AUTHORITIES.CREATE_STREAM_SELECTION_TEST_INVITE), async (req, res) => {
    const requiredBodyFields = ["title", "active"];

    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (isRequestBodyValid) {
        const streamSelectionTestInviteId = await addStreamSelectionTestInvite(validatedRequestBody);
        res.status(201).json(await getStreamSelectionTestInviteById({ id: streamSelectionTestInviteId }));
    } else {
        res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }
});

// Attend stream selection test
router.get("/:id/attend", async (req, res) => {
    const { id } = req.params;

    if (!id) {
        return res.status(400).json({ error: "Missing Invite Id" });
    }

    const invite = await getStreamSelectionTestInviteById({ id });

    if (invite && invite.active) {
        await patchUserStreamSelectionTestAllowedById({ id: req.user.id, stream_selection_test_allowed: true });
        res.sendStatus(200);
    } else {
        res.status(400).json({ error: "Invite not found or inactive" });
    }
});

// Update stream selection test invite
router.patch("/",requiresDeviceFingerPrint, parseAuthenticationToken, parseUserDevice,  requires_authority(AUTHORITIES.UPDATE_STREAM_SELECTION_TEST_INVITE), async (req, res) => {
    const requiredBodyFields = ["id", "title", "active"];

    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (isRequestBodyValid) {
        await updateStreamSelectionTestInviteById(validatedRequestBody);
        res.status(200).json(await getStreamSelectionTestInviteById({ id: validatedRequestBody.id }));
    } else {
        res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }
});

//tested
router.delete("/:id",requiresDeviceFingerPrint, parseAuthenticationToken, parseUserDevice,  requires_authority(AUTHORITIES.DELETE_STREAM_SELECTION_TEST_INVITE), async (req, res) => {
    if (!req.params?.id) {
        return res.status(400).json({ error: "Missing Invite Id" });
    }

    deleteStreamSelectionTestInviteById(req.params);

    res.sendStatus(204);
});

module.exports = router;
