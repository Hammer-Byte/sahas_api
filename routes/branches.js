const libExpress = require("express");
const { validateRequestBody } = require("sahas_utils");
const { AUTHORITIES } = require("../constants");
const requires_authority = require("../middlewares/requires_authority");
const { getAllBranches, getBranchById, addBranch, updateBranchById, deleteBranchById } = require("../db/branches");

const router = libExpress.Router();

router.get("/", requires_authority(AUTHORITIES.USE_PAGE_MANAGE_BRANCHES), async (req, res) => {
    return res.status(200).json(await getAllBranches());
});

router.get("/:id", requires_authority(AUTHORITIES.USE_PAGE_MANAGE_BRANCHES), async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing Branch Id" });
    }

    const branch = await getBranchById({ id: req.params.id });
    if (!branch) {
        return res.status(400).json({ error: "Branch Not Exist" });
    }

    return res.status(200).json(branch);
});

router.post("/", requires_authority(AUTHORITIES.CREATE_BRANCH), async (req, res) => {
    const requiredBodyFields = ["title", "address", "description"];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    const id = await addBranch({
        title: validatedRequestBody.title,
        address: validatedRequestBody.address,
        description: validatedRequestBody.description,
        active: req.body.active !== false,
    });

    const branch = await getBranchById({ id });
    if (branch) {
        return res.status(201).json(branch);
    }

    return res.status(400).json({ error: "Failed To Add Branch" });
});

router.patch("/", requires_authority(AUTHORITIES.UPDATE_BRANCH), async (req, res) => {
    const requiredBodyFields = ["id", "title", "address", "description"];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    const existing = await getBranchById({ id: validatedRequestBody.id });
    if (!existing) {
        return res.status(400).json({ error: "Branch Not Exist" });
    }

    await updateBranchById({
        id: validatedRequestBody.id,
        title: validatedRequestBody.title,
        address: validatedRequestBody.address,
        description: validatedRequestBody.description,
        active: req.body.active !== false && req.body.active !== 0,
    });

    return res.status(200).json(await getBranchById({ id: validatedRequestBody.id }));
});

router.delete("/:id", requires_authority(AUTHORITIES.DELETE_BRANCH), async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing Branch Id" });
    }

    const existing = await getBranchById({ id: req.params.id });
    if (!existing) {
        return res.status(400).json({ error: "Branch Not Exist" });
    }

    try {
        await deleteBranchById({ id: req.params.id });
        return res.sendStatus(204);
    } catch (error) {
        return res.status(400).json({ error: error?.sqlMessage || error?.message || "Failed To Delete Branch" });
    }
});

module.exports = router;
