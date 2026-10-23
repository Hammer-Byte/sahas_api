const libExpress = require("express");
const { getAllWebsiteBranches, getWebsiteBranchById, addWebsiteBranch, updateWebsiteBranchById, deleteWebsiteBranchById } = require("../db/website_branches");
const { validateRequestBody } = require("sahas_utils");
const requires_authority = require("../middlewares/requires_authority");
const { AUTHORITIES } = require("../constants");

const router = libExpress.Router();

router.get("/", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    return res.status(200).json(await getAllWebsiteBranches());
});

router.get("/:id", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing Website Branch Id" });
    }

    const websiteBranch = await getWebsiteBranchById({ id: req.params.id });
    if (!websiteBranch) {
        return res.status(400).json({ error: "Website Branch Not Exist" });
    }

    return res.status(200).json(websiteBranch);
});

router.post("/", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    const requiredBodyFields = ["name"];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    const id = await addWebsiteBranch({ ...validatedRequestBody, ...req.body });
    const created = await getWebsiteBranchById({ id });
    if (!created) {
        return res.status(400).json({ error: "Failed To Add Website Branch" });
    }

    return res.status(201).json(created);
});

router.patch("/", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    const requiredBodyFields = ["id", ...["name"]];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    const existing = await getWebsiteBranchById({ id: validatedRequestBody.id });
    if (!existing) {
        return res.status(400).json({ error: "Website Branch Not Exist" });
    }

    const updated = await updateWebsiteBranchById({ ...validatedRequestBody, ...req.body });
    if (!updated) {
        return res.status(400).json({ error: "Failed To Save" });
    }
    return res.status(200).json(await getWebsiteBranchById({ id: validatedRequestBody.id }));
});

router.delete("/:id", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing Website Branch Id" });
    }

    const existing = await getWebsiteBranchById({ id: req.params.id });
    if (!existing) {
        return res.status(400).json({ error: "Website Branch Not Exist" });
    }

    const removed = await deleteWebsiteBranchById({ id: req.params.id });
    if (!removed) {
        return res.status(400).json({ error: "Failed To Delete" });
    }
    return res.sendStatus(204);
});

module.exports = router;
