const libExpress = require("express");

const { deleteUserRoleById, addUserRole, getUserRoleById } = require("../db/user_roles");
const { validateRequestBody } = require("sahas_utils");
const requires_authority = require("../middlewares/requires_authority");
const { AUTHORITIES } = require("../constants");
const { createNotification, getAlertTypeId } = require("../libs/notifications");

const router = libExpress.Router();

//tested
router.post("/", requires_authority(AUTHORITIES.CREATE_USER_ROLES), async (req, res) => {
    const requiredBodyFields = ["user_id", "role_id"];

    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (isRequestBodyValid) {
        const userRoleId = await addUserRole({ created_by: req.user.id, ...validatedRequestBody });
        const userRole = await getUserRoleById({ id: userRoleId });
        await createNotification({
            user_id: validatedRequestBody.user_id,
            title: "A role was assigned to you",
            description: `You were granted the "${userRole?.title || "new"}" role.`,
            type_id: await getAlertTypeId(),
            created_by: req.user.id,
        });

        res.status(201).json(userRole);
    } else {
        res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }
});

//tested
router.delete("/:userRoleId", requires_authority(AUTHORITIES.DELETE_USER_ROLES), async (req, res) => {
    if (!req.params.userRoleId) {
        return res.status(400).json({ error: "Missing User Role Id" });
    }

    deleteUserRoleById({ id: req.params.userRoleId });
    res.sendStatus(204);
});

module.exports = router;
