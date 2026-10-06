const libExpress = require("express");
const { updateUserDeviceStatusById, getUserDeviceById } = require("../db/devices");
const { validateRequestBody } = require("sahas_utils");
const requires_authority = require("../middlewares/requires_authority");
const { AUTHORITIES } = require("../constants");
const { createNotification, getWarningTypeId } = require("../libs/notifications");

const router = libExpress.Router();

//create a new device into datbase
router.patch("/", requires_authority(AUTHORITIES.UPDATE_USER_DEVICE), async (req, res) => {
    const requiredBodyFields = ["id", "active"];

    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (isRequestBodyValid) {
        await updateUserDeviceStatusById(validatedRequestBody);
        const device = await getUserDeviceById(validatedRequestBody);
        const active = !!validatedRequestBody.active;
        if (device?.user_id) {
            await createNotification({
                user_id: device.user_id,
                title: active ? "A device was activated" : "A device was deactivated",
                description: `Device #${validatedRequestBody.id} is now ${active ? "active" : "inactive"}.`,
                type_id: active ? undefined : await getWarningTypeId(),
                created_by: req.user?.id,
            });
        }
        res.status(200).json(device);
    } else {
        res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }
});

module.exports = router;
