const libExpress = require("express");
const { getAllWebsiteTestimonials, getWebsiteTestimonialById, addWebsiteTestimonial, updateWebsiteTestimonialById, deleteWebsiteTestimonialById } = require("../db/website_testimonials");
const { validateRequestBody } = require("sahas_utils");
const requires_authority = require("../middlewares/requires_authority");
const { AUTHORITIES } = require("../constants");

const router = libExpress.Router();

router.get("/", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    return res.status(200).json(await getAllWebsiteTestimonials());
});

router.get("/:id", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing Website Testimonial Id" });
    }

    const websiteTestimonial = await getWebsiteTestimonialById({ id: req.params.id });
    if (!websiteTestimonial) {
        return res.status(400).json({ error: "Website Testimonial Not Exist" });
    }

    return res.status(200).json(websiteTestimonial);
});

router.post("/", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    const requiredBodyFields = ["name"];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    const id = await addWebsiteTestimonial({ ...validatedRequestBody, ...req.body });
    const created = await getWebsiteTestimonialById({ id });
    if (!created) {
        return res.status(400).json({ error: "Failed To Add Website Testimonial" });
    }

    return res.status(201).json(created);
});

router.patch("/", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    const requiredBodyFields = ["id", ...["name"]];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    const existing = await getWebsiteTestimonialById({ id: validatedRequestBody.id });
    if (!existing) {
        return res.status(400).json({ error: "Website Testimonial Not Exist" });
    }

    const updated = await updateWebsiteTestimonialById({ ...validatedRequestBody, ...req.body });
    if (!updated) {
        return res.status(400).json({ error: "Failed To Save" });
    }
    return res.status(200).json(await getWebsiteTestimonialById({ id: validatedRequestBody.id }));
});

router.delete("/:id", requires_authority(AUTHORITIES.USE_ADMIN_CORNER), async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing Website Testimonial Id" });
    }

    const existing = await getWebsiteTestimonialById({ id: req.params.id });
    if (!existing) {
        return res.status(400).json({ error: "Website Testimonial Not Exist" });
    }

    const removed = await deleteWebsiteTestimonialById({ id: req.params.id });
    if (!removed) {
        return res.status(400).json({ error: "Failed To Delete" });
    }
    return res.sendStatus(204);
});

module.exports = router;
