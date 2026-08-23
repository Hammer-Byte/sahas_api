const libExpress = require("express");
const { logger, validateRequestBody } = require("sahas_utils");
const {
    updateUserDeviceStatusById,
    getUserDeviceById,
    getUserDeviceByUserIdAndFingerPrint,
    getPendingDeviceChangeRequests,
    raiseDeviceChangeRequest,
    reviewDeviceChangeRequest,
} = require("../db/devices");
const requires_authority = require("../middlewares/requires_authority");
const { AUTHORITIES } = require("../constants");

const router = libExpress.Router();

router.patch("/", requires_authority(AUTHORITIES.UPDATE_USER_DEVICE), async (req, res) => {
    const requiredBodyFields = ["id", "active"];

    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (isRequestBodyValid) {
        await updateUserDeviceStatusById(validatedRequestBody);
        res.status(200).json(await getUserDeviceById(validatedRequestBody));
    } else {
        res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }
});

router.get("/change-requests/current", async (req, res) => {
    if (!req?.user?.id || !req?.device?.fingerPrint) {
        return res.status(401).json({ error: "Authentication Required" });
    }

    const device = await getUserDeviceByUserIdAndFingerPrint({ user_id: req.user.id, finger_print: req.device.fingerPrint });

    res.status(200).json({ pending: !!(device?.change_request_pending && !device?.active) });
});

router.post("/change-requests", async (req, res) => {
    if (!req?.user?.id) {
        return res.status(401).json({ error: "Authentication Required" });
    }

    if (!req?.device?.fingerPrint) {
        return res.status(400).json({ error: "Device Information Is Missing" });
    }

    if (req.device.active) {
        return res.status(400).json({ error: "Device Is Already Active" });
    }

    const result = await raiseDeviceChangeRequest({ user_id: req.user.id, finger_print: req.device.fingerPrint });

    if (result?.error === "Device Change Request Already Pending") {
        return res.status(409).json({ error: result.error });
    }

    if (result?.error) {
        return res.status(400).json({ error: result.error });
    }

    if (!result) {
        return res.status(500).json({ error: "Failed To Create Device Change Request" });
    }

    res.status(201).json(result);
});

router.get("/change-requests", requires_authority(AUTHORITIES.READ_USER_STREAMING_DEVICES), async (req, res) => {
    logger.info("Fetching Pending Device Change Requests");
    res.status(200).json(await getPendingDeviceChangeRequests());
});

router.patch("/change-requests", requires_authority(AUTHORITIES.MANAGE_USER_STREAMING_DEVICES), async (req, res) => {
    const requiredBodyFields = ["id", "status"];

    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    const { id, status } = validatedRequestBody;

    if (!["APPROVED", "REJECTED"].includes(status)) {
        return res.status(400).json({ error: "Invalid Status" });
    }

    const device = await reviewDeviceChangeRequest({ id, status });

    if (!device) {
        return res.status(400).json({ error: "Invalid Device Change Request" });
    }

    res.status(200).json(device);
});

module.exports = router;
