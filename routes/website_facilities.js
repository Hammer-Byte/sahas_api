const libExpress = require("express");
const { getAllWebsiteFacilities, getWebsiteFacilityById, addWebsiteFacility, updateWebsiteFacilityById, deleteWebsiteFacilityById } = require("../db/website_facilities");
const { validateRequestBody } = require("sahas_utils");
const requires_authority = require("../middlewares/requires_authority");
const { AUTHORITIES } = require("../constants");

const router = libExpress.Router();

router.get("/", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    return res.status(200).json(await getAllWebsiteFacilities());
});

router.get("/:id", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing Website Facility Id" });
    }

    const websiteFacility = await getWebsiteFacilityById({ id: req.params.id });
    if (!websiteFacility) {
        return res.status(400).json({ error: "Website Facility Not Exist" });
    }

    return res.status(200).json(websiteFacility);
});

router.post("/", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    const requiredBodyFields = ["title"];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    const id = await addWebsiteFacility({ ...validatedRequestBody, ...req.body });
    const created = await getWebsiteFacilityById({ id });
    if (!created) {
        return res.status(400).json({ error: "Failed To Add Website Facility" });
    }

    return res.status(201).json(created);
});

router.patch("/", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    const requiredBodyFields = ["id", ...["title"]];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    const existing = await getWebsiteFacilityById({ id: validatedRequestBody.id });
    if (!existing) {
        return res.status(400).json({ error: "Website Facility Not Exist" });
    }

    await updateWebsiteFacilityById({ ...validatedRequestBody, ...req.body });
    return res.status(200).json(await getWebsiteFacilityById({ id: validatedRequestBody.id }));
});

router.delete("/:id", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing Website Facility Id" });
    }

    const existing = await getWebsiteFacilityById({ id: req.params.id });
    if (!existing) {
        return res.status(400).json({ error: "Website Facility Not Exist" });
    }

    await deleteWebsiteFacilityById({ id: req.params.id });
    return res.sendStatus(204);
});

module.exports = router;
