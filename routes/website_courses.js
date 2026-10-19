const libExpress = require("express");
const { getAllWebsiteCourses, getWebsiteCourseById, addWebsiteCourse, updateWebsiteCourseById, deleteWebsiteCourseById } = require("../db/website_courses");
const { validateRequestBody } = require("sahas_utils");
const requires_authority = require("../middlewares/requires_authority");
const { AUTHORITIES } = require("../constants");

const router = libExpress.Router();

router.get("/", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    return res.status(200).json(await getAllWebsiteCourses());
});

router.get("/:id", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing Website Course Id" });
    }

    const websiteCourse = await getWebsiteCourseById({ id: req.params.id });
    if (!websiteCourse) {
        return res.status(400).json({ error: "Website Course Not Exist" });
    }

    return res.status(200).json(websiteCourse);
});

router.post("/", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    const requiredBodyFields = ["title"];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    const id = await addWebsiteCourse({ ...validatedRequestBody, ...req.body });
    const created = await getWebsiteCourseById({ id });
    if (!created) {
        return res.status(400).json({ error: "Failed To Add Website Course" });
    }

    return res.status(201).json(created);
});

router.patch("/", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    const requiredBodyFields = ["id", ...["title"]];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    const existing = await getWebsiteCourseById({ id: validatedRequestBody.id });
    if (!existing) {
        return res.status(400).json({ error: "Website Course Not Exist" });
    }

    await updateWebsiteCourseById({ ...validatedRequestBody, ...req.body });
    return res.status(200).json(await getWebsiteCourseById({ id: validatedRequestBody.id }));
});

router.delete("/:id", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing Website Course Id" });
    }

    const existing = await getWebsiteCourseById({ id: req.params.id });
    if (!existing) {
        return res.status(400).json({ error: "Website Course Not Exist" });
    }

    await deleteWebsiteCourseById({ id: req.params.id });
    return res.sendStatus(204);
});

module.exports = router;
