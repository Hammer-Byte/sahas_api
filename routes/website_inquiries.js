const libExpress = require("express");
const { logger } = require("sahas_utils");
const {
    addWebsiteInquiry,
    getWebsiteInquiryById,
    getAllWebsiteInquiries,
    getCountWebsiteInquiries,
} = require("../db/website_inquiries");
const requires_authority = require("../middlewares/requires_authority");
const { AUTHORITIES } = require("../constants");

const router = libExpress.Router();

function normalizePhone(value = "") {
    return String(value || "")
        .replace(/[^\d+]/g, "")
        .trim();
}

function normalizeText(value = "", max = 500) {
    return String(value || "")
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, max);
}

/**
 * Public website inquiry form submit.
 * Body: { name|full_name, phone|contact, branch_slug?, branch_name?, course_slug?, course_title?, description|note }
 * Only name and phone are required.
 */
router.post("/", async (req, res) => {
    try {
        const body = req.body || {};
        const full_name = normalizeText(body.full_name || body.name, 100);
        const phone = normalizePhone(body.phone || body.contact);
        const branch_slug = normalizeText(body.branch_slug || body.branchSlug || "", 80) || null;
        const branch_name = normalizeText(body.branch_name || body.branchName || body.branch || "", 160) || null;
        const course_slug = normalizeText(body.course_slug || body.courseSlug || "", 80) || null;
        const course_title = normalizeText(body.course_title || body.courseTitle || body.course || "", 160) || null;
        const description = normalizeText(body.description || body.note || "", 2000) || null;

        if (!full_name) {
            return res.status(400).json({ success: false, error: "Name is required" });
        }
        if (!phone || phone.replace(/\D/g, "").length < 8) {
            return res.status(400).json({ success: false, error: "Valid phone number is required" });
        }

        const id = await addWebsiteInquiry({
            full_name,
            phone,
            branch_slug,
            branch_name,
            course_slug,
            course_title,
            description,
            source: "website",
        });

        if (!id) {
            return res.status(500).json({ success: false, error: "Unable to save inquiry" });
        }

        const record = await getWebsiteInquiryById({ id });
        logger.info(`Website inquiry created #${id} — ${full_name} / ${phone}`);
        return res.status(201).json({ success: true, data: record });
    } catch (error) {
        logger.error(`POST /website-inquiries: ${error?.message || error}`);
        return res.status(500).json({ success: false, error: "Unable to save inquiry right now" });
    }
});

/** Admin list — same authority as other inquiry reads */
router.get("/", requires_authority(AUTHORITIES.READ_USER_INQUIRIES), async (req, res) => {
    try {
        const { offSet, limit } = req.query;
        const recordsCount = await getCountWebsiteInquiries();
        const dataSet = await getAllWebsiteInquiries({ offSet, limit });
        return res.status(200).json({ recordsCount, dataSet });
    } catch (error) {
        logger.error(`GET /website-inquiries: ${error?.message || error}`);
        return res.status(500).json({ error: "Unable to load website inquiries" });
    }
});

module.exports = router;
