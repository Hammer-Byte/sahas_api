const libExpress = require("express");
const { getAllWebsiteInquiries, getWebsiteInquiryById, addWebsiteInquiry, deleteWebsiteInquiryById } = require("../db/website_inquiries");
const { validateRequestBody } = require("sahas_utils");
const requires_authority = require("../middlewares/requires_authority");
const { AUTHORITIES } = require("../constants");

const router = libExpress.Router();

// Same authority as other admin website management routes; guard missing user so includes() does not crash
const requiresAdminWebsite = (req, res, next) => {
    if (!req?.user?.authorities) {
        return res.status(403).json({ error: `You Don't have authority ${AUTHORITIES.USE_ADMIN_CORNER} to perform this operation` });
    }
    return requires_authority(AUTHORITIES.USE_ADMIN_CORNER)(req, res, next);
};

//tested
router.get("/", requiresAdminWebsite, async (req, res) => {
    return res.status(200).json(await getAllWebsiteInquiries());
});

// Public website form submit
router.post("/", async (req, res) => {
    const body = req.body || {};
    const full_name = String(body.full_name || body.name || "").trim();
    const phone = String(body.phone || body.contact || "").trim();
    const branch_slug = String(body.branch_slug || body.branchSlug || "").trim();
    const branch_name = String(body.branch_name || body.branchName || body.branch || "").trim();
    const course_slug = String(body.course_slug || body.courseSlug || "").trim();
    const course_title = String(body.course_title || body.courseTitle || body.course || "").trim();
    const description = String(body.description || body.note || "").trim();

    // Only set non-empty values — empty strings break validateRequestBody (Set.push)
    req.body = { source: "website" };
    if (full_name) req.body.full_name = full_name;
    if (phone) req.body.phone = phone;
    if (branch_slug) req.body.branch_slug = branch_slug;
    if (branch_name) req.body.branch_name = branch_name;
    if (course_slug) req.body.course_slug = course_slug;
    if (course_title) req.body.course_title = course_title;
    if (description) req.body.description = description;

    const requiredBodyFields = ["full_name", "phone"];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    const id = await addWebsiteInquiry({ ...validatedRequestBody, ...req.body });
    const created = await getWebsiteInquiryById({ id });
    if (!created) {
        return res.status(400).json({ error: "Failed To Add Website Inquiry" });
    }

    return res.status(201).json(created);
});

//tested
router.delete("/:id", requiresAdminWebsite, async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing Website Inquiry Id" });
    }

    const existing = await getWebsiteInquiryById({ id: req.params.id });
    if (!existing) {
        return res.status(400).json({ error: "Website Inquiry Not Exist" });
    }

    const removed = await deleteWebsiteInquiryById({ id: req.params.id });
    if (!removed) {
        return res.status(400).json({ error: "Failed To Delete" });
    }
    return res.sendStatus(204);
});

module.exports = router;
