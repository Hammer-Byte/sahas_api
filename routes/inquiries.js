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
const { recordActivity } = require("../libs/activities");
const { getCourseById } = require("../db/courses");
const { getUserByPhone, getUserByEmail, addUser } = require("../db/users");
const { addUserHistory } = require("../db/user_history");
const { hasRequiredAuthority, normalizeIndianPhone } = require("../utils");

const router = libExpress.Router();

async function createInquiryForUser({ user_id, course_id, note, branch_id, created_by }) {
    const inquiryId = await addInquiry({ user_id, course_id, branch_id, created_by });
    await addInquiryNote({ inquiry_id: inquiryId, note, created_by });
    await createNotification({
        user_id,
        title: "An inquiry was created",
        description: "A new inquiry was created on your profile.",
        created_by,
    });
    const course = await getCourseById({ id: course_id });
    await recordActivity({
        user_id,
        key: "CREATE_INQUIRY",
        values: { course: course?.title },
    });
    return getInquiryById({ id: inquiryId });
}

//tested
router.post("/", requires_authority(AUTHORITIES.CREATE_INQUIRY), async (req, res) => {
    const requiredBodyFields = ["user_id", "course_id", "note", "branch_id"];

    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (isRequestBodyValid) {
        res.status(201).json(
            await createInquiryForUser({
                ...validatedRequestBody,
                created_by: req.user.id,
            }),
        );
    } else {
        res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }
});

/**
 * Create inquiry from Manage Inquiries: resolve/create user by phone/email, then create inquiry.
 * Body: user fields (full_name, email, phone, branch_id, address, …) + course_id, note, inquiry_branch_id
 */
router.post("/with-user", requires_authority(AUTHORITIES.CREATE_INQUIRY), async (req, res) => {
    const requiredBodyFields = ["full_name", "email", "phone", "branch_id", "address", "course_id", "note", "inquiry_branch_id"];

    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    const { phone, error: phoneError } = normalizeIndianPhone(validatedRequestBody.phone);
    if (phoneError) {
        return res.status(400).json({ error: phoneError });
    }

    const email = String(validatedRequestBody.email).toLowerCase().trim();
    if (!email) {
        return res.status(400).json({ error: "Missing email" });
    }

    let user = (await getUserByPhone({ phone })) || (await getUserByEmail({ email }));
    let user_created = false;

    if (!user) {
        if (!hasRequiredAuthority(req.user.authorities, AUTHORITIES.CREATE_USER)) {
            return res.status(403).json({ error: `You Don't have authority ${AUTHORITIES.CREATE_USER} to perform this operation` });
        }

        const userId = await addUser({
            full_name: validatedRequestBody.full_name,
            email,
            phone,
            branch_id: validatedRequestBody.branch_id,
            address: validatedRequestBody.address,
            guardian_phone: req.body.guardian_phone,
            image: req.body.image,
        });

        if (!userId) {
            // Race: phone/email inserted concurrently — reuse existing user
            user = (await getUserByPhone({ phone })) || (await getUserByEmail({ email }));
            if (!user) {
                return res.status(400).json({ error: "Unable To Add User - User Might Already Exist" });
            }
        } else {
            await addUserHistory({ user_id: userId, ...req.body?.history });
            user = { id: userId };
            user_created = true;
        }
    }

    const inquiry = await createInquiryForUser({
        user_id: user.id,
        course_id: validatedRequestBody.course_id,
        note: validatedRequestBody.note,
        branch_id: validatedRequestBody.inquiry_branch_id,
        created_by: req.user.id,
    });

    return res.status(201).json({ ...inquiry, user_created });
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
            const course = await getCourseById({ id: inquiry.course_id });
            await recordActivity({
                user_id: inquiry.user_id,
                key: "UPDATE_INQUIRY",
                values: { course: course?.title },
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
