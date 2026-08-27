const libExpress = require("express");
const { updateUserDeviceStatusById, getUserDeviceById } = require("../db/devices");
const { validateRequestBody } = require("sahas_utils");
const requires_authority = require("../middlewares/requires_authority");
const { AUTHORITIES } = require("../constants");

const router = libExpress.Router();

//create a new device into datbase
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

module.exports = router;
