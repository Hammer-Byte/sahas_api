const libExpress = require("express");
const { validateRequestBody } = require("sahas_utils");
const { AUTHORITIES } = require("../constants");
const requires_authority = require("../middlewares/requires_authority");
const {
    addDeviceChangeRequest,
    getPendingDeviceChangeRequestByUserIdAndDeviceId,
    getPendingDeviceChangeRequests,
    getDeviceChangeRequestById,
    updateDeviceChangeRequestStatusById,
} = require("../db/device_change_requests");
const {
    addInActiveUserDevice,
    getUserDeviceByUserIdAndFingerPrint,
} = require("../db/devices");

const router = libExpress.Router();

function requireAuthentication(req, res) {
    if (req?.user?.id) return true;

    res.status(401).json({ error: "Authentication Required" });
    return false;
}

async function getCurrentUserDevice(req) {
    let device = await getUserDeviceByUserIdAndFingerPrint({
        user_id: req.user.id,
        finger_print: req.device?.fingerPrint,
    });

    if (!device && req.device?.fingerPrint) {
        await addInActiveUserDevice(req.user.id, req.device.fingerPrint);
        device = await getUserDeviceByUserIdAndFingerPrint({
            user_id: req.user.id,
            finger_print: req.device.fingerPrint,
        });
    }

    return device;
}

router.get("/current", async (req, res) => {
    if (!requireAuthentication(req, res)) return;

    const device = await getCurrentUserDevice(req);
    if (!device) return res.status(500).json({ error: "Could Not Find Device" });

    const request = await getPendingDeviceChangeRequestByUserIdAndDeviceId({
        user_id: req.user.id,
        device_id: device.id,
    });

    return res.status(200).json({ pending: !!request });
});

router.post("/", async (req, res) => {
    if (!requireAuthentication(req, res)) return;

    const device = await getCurrentUserDevice(req);
    if (!device) return res.status(500).json({ error: "Could Not Find Device" });
    if (device.active) return res.status(400).json({ error: "Device Already Allowed" });

    const existingRequest = await getPendingDeviceChangeRequestByUserIdAndDeviceId({
        user_id: req.user.id,
        device_id: device.id,
    });
    if (existingRequest) return res.status(200).json(existingRequest);

    const requestId = await addDeviceChangeRequest({ user_id: req.user.id, device_id: device.id });
    if (!requestId) {
        const pendingRequest = await getPendingDeviceChangeRequestByUserIdAndDeviceId({
            user_id: req.user.id,
            device_id: device.id,
        });
        if (pendingRequest) return res.status(200).json(pendingRequest);
        return res.status(500).json({ error: "Failed To Create Device Change Request" });
    }

    return res.status(201).json(await getDeviceChangeRequestById({ id: requestId }));
});

router.get("/", requires_authority(AUTHORITIES.USE_PAGE_MANAGE_STREAMING_DEVICES_REQUESTS), async (req, res) => {
    return res.status(200).json(await getPendingDeviceChangeRequests());
});

router.patch("/:id", requires_authority(AUTHORITIES.USE_PAGE_MANAGE_STREAMING_DEVICES_REQUESTS), async (req, res) => {
    const requiredBodyFields = ["status"];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    const status = String(validatedRequestBody.status).toUpperCase();
    if (!["APPROVED", "REJECTED"].includes(status)) {
        return res.status(400).json({ error: "Invalid Device Change Request Status" });
    }

    const request = await getDeviceChangeRequestById({ id: req.params.id });
    if (!request) return res.status(404).json({ error: "Device Change Request Not Found" });
    if (request.status !== "PENDING") return res.status(400).json({ error: "Device Change Request Already Reviewed" });

    const requestUpdated = await updateDeviceChangeRequestStatusById({
        id: request.id,
        status,
        reviewed_by: req.user.id,
    });
    if (!requestUpdated) return res.status(409).json({ error: "Device Change Request Already Reviewed" });

    return res.status(200).json(await getDeviceChangeRequestById({ id: request.id }));
});

module.exports = router;
