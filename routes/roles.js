const libExpress = require("express");
const { addRole, getRoleById, deleteRoleById, updateRoleById } = require("../db/roles");
const { deleteUserRolesByRoleId } = require("../db/user_roles");
const { getRoleAuthoritiesByRoleId, deleteRoleAuthoritiesByRoleId } = require("../db/role_authorities");
const { validateRequestBody } = require("sahas_utils");
const requires_authority = require("../middlewares/requires_authority");
const { AUTHORITIES } = require("../constants");

const router = libExpress.Router();

//tested
router.delete("/:id", requires_authority(AUTHORITIES.DELETE_ROLES), async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing roleId" });
    }
    //delete role
    deleteRoleById({ id: req.params.id });
    //this authority needs to go away from user-role
    deleteUserRolesByRoleId({ role_id: req.params.id });
    //need to delete role-authorities as well
    deleteRoleAuthoritiesByRoleId({ role_id: req.params.id });
    res.sendStatus(204);
});

//tested
router.get("/:id/authorities", requires_authority(AUTHORITIES.READ_ROLES_AUTHORITIES), async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing roleId" });
    }
    res.status(200).json(await getRoleAuthoritiesByRoleId({ role_id: req.params.id }));
});

//tested
router.patch("/", requires_authority(AUTHORITIES.UPDATE_ROLES), async (req, res) => {
    const requiredBodyFields = ["id", "title", "active"];

    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (isRequestBodyValid) {
        await updateRoleById({ ...validatedRequestBody });
        res.status(200).json(await getRoleById({ ...validatedRequestBody }));
    } else {
        res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }
});

//tested
router.post("/", requires_authority(AUTHORITIES.CREATE_ROLES), async (req, res) => {
    const requiredBodyFields = ["title"];

    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (isRequestBodyValid) {
        const roleId = await addRole(validatedRequestBody);
        res.status(201).json(await getRoleById({ id: roleId }));
    } else {
        res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }
});

module.exports = router;
