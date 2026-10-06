const libExpress = require("express");
const { validateRequestBody, logger, requestService } = require("sahas_utils");
const {
    deleteInquiryById,
    addInquiry,
    getInquiryById,
    updateInquiryById,
    getAllInquiriesBySearchAndFilters,
    getCountInquiriesBySearchAndFilters,
} = require("../db/inquiries");
const { deleteInquiryNotesByInquiryId, getInquiryNotesByInquiryId, addInquiryNote } = require("../db/inquiry_notes");
const requires_authority = require("../middlewares/requires_authority");
const { AUTHORITIES } = require("../constants");
const { getAllBranches } = require("../db/branches");
const { getAllCourses } = require("../db/courses");
const { createNotification, getAlertTypeId } = require("../libs/notifications");

const router = libExpress.Router();

//tested
router.post("/", requires_authority(AUTHORITIES.CREATE_INQUIRY), async (req, res) => {
    const requiredBodyFields = ["user_id", "course_id", "note", "branch_id"];

    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (isRequestBodyValid) {
        const inquiryId = await addInquiry({ ...validatedRequestBody, created_by: req.user.id });
        await addInquiryNote({ inquiry_id: inquiryId, note: validatedRequestBody.note, created_by: req.user.id });
        await createNotification({
            user_id: validatedRequestBody.user_id,
            title: "An inquiry was created",
            description: "A new inquiry was created on your profile.",
            created_by: req.user.id,
        });
        res.status(201).json(await getInquiryById({ id: inquiryId }));
    } else {
        res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }
});

//tested
router.get("/", requires_authority(AUTHORITIES.READ_USER_INQUIRIES), async (req, res) => {
    const { search, offSet, limit, ...appliedFilters } = req.query;
    logger.info(`Searching Inquiries - search : ${search} | filters : ${JSON.stringify(appliedFilters)} | offSet : ${offSet} | limit : ${limit}`);

    //get All Inquiries
    const inquiries = {
        recordsCount: await getCountInquiriesBySearchAndFilters(search, appliedFilters),
        dataSet: await getAllInquiriesBySearchAndFilters(search, appliedFilters, offSet, limit),
    };

    res.status(200).json(inquiries);
});

//tested
router.get("/download", async (req, res) => {
    const { search, ...appliedFilters } = req.query;
    logger.info(`Searching Inquiries - search : ${search} | filters : ${JSON.stringify(appliedFilters)} `);

    const inquiries = await getAllInquiriesBySearchAndFilters(search, appliedFilters);

    const branchSelector = {};
    const courseSelector = {};

    const branches = await getAllBranches();
    const courses = await getAllCourses();

    for (const branch of branches) branchSelector[branch?.id] = branch?.title;
    for (const course of courses) courseSelector[course?.id] = course?.title;

    for (const inquiry of inquiries) {
        if (!!inquiry?.branch_id) {
            inquiry.branch = branchSelector[inquiry?.branch_id];
            inquiry.course = courseSelector[inquiry?.course_id];
            inquiry.status = !!inquiry?.active ? "Open" : "Closed";
        }
    }

    await requestService({
        requestServiceName: process.env.SERVICE_MEDIA,
        onRequestStart: () => logger.info("Generating Inquiries"),
        requestPath: "templated/sheet",
        requestMethod: "POST",
        requestPostBody: {
            template: "inquiries",
            injects: inquiries,
        },
        onResponseReceieved: (generatedInquiries, responseCode) => {
            if (generatedInquiries?.cdn_url && responseCode === 201) logger.success(`Inquiries Sheet Generated !`);
            else logger.error(`Failed To Generate Inquiries - Media Responded With ${JSON.stringify(generatedInquiries)} - ${responseCode}`);
            return res.status(responseCode).json(generatedInquiries);
        },
    });
});

//tested
router.patch("/", requires_authority(AUTHORITIES.UPDATE_INQUIRY), async (req, res) => {
    const requiredBodyFields = ["id", "active", "branch_id", "course_id"];

    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (isRequestBodyValid) {
        await updateInquiryById({ ...validatedRequestBody });
        const inquiry = await getInquiryById(validatedRequestBody);
        if (inquiry?.user_id) {
            await createNotification({
                user_id: inquiry.user_id,
                title: "An inquiry was updated",
                description: `Your inquiry is now ${validatedRequestBody.active ? "open" : "closed"}.`,
                type_id: await getAlertTypeId(),
                created_by: req.user.id,
            });
        }
        res.status(200).json(inquiry);
    } else {
        res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }
});

//tested
router.delete("/:id", requires_authority(AUTHORITIES.DELETE_INQUIRY), async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing inquiry id" });
    }
    deleteInquiryById({ id: req.params.id });
    deleteInquiryNotesByInquiryId({ inquiry_id: req.params.id });
    res.sendStatus(204);
});

//tested
router.get("/:id/notes", requires_authority(AUTHORITIES.READ_INQUIRY_NOTE), async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing inquiryId" });
    }
    res.status(200).json(await getInquiryNotesByInquiryId({ inquiry_id: req.params.id }));
});

module.exports = router;
