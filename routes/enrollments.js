const libExpress = require("express");
const { updateEnrollmentById, getEnrollmentById, addEnrollment, deleteEnrollmentById } = require("../db/enrollments");
const { validateRequestBody } = require("sahas_utils");
const { addEnrollmentCourse, getEnrollmentCoursesByEnrollmentId } = require("../db/enrollment_courses");
const { getTransactionsByEnrollmentId } = require("../db/enrollment_transactions");
const requires_authority = require("../middlewares/requires_authority");
const { AUTHORITIES } = require("../constants");
const { createNotification, getAlertTypeId } = require("../libs/notifications");

const router = libExpress.Router();

//tested


router.patch("/",requires_authority(AUTHORITIES.UPDATE_ENROLLMENT), async (req, res) => {
    const requiredBodyFields = ["id", "amount", "digital_access", "on_site_access", "start_date", "end_date"];

    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (isRequestBodyValid) {
        await updateEnrollmentById({ ...validatedRequestBody });
        const enrollment = await getEnrollmentById({ ...validatedRequestBody });
        await createNotification({
            user_id: enrollment.user_id,
            title: "Your enrollment was updated",
            description: `Your enrollment access was updated (digital=${!!validatedRequestBody.digital_access}, on-site=${!!validatedRequestBody.on_site_access}).`,
            type_id: await getAlertTypeId(),
            created_by: req.user.id,
        });
        res.status(200).json(enrollment);
    } else {
        res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }
});

//tested
router.post("/", requires_authority(AUTHORITIES.CREATE_ENROLLMENT), async (req, res) => {
    const requiredBodyFields = ["courses", "handler", "end_date", "start_date", "user_id", "amount"];

    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (isRequestBodyValid) {
        const enrollmentId = await addEnrollment({ created_by: req.user.id, ...validatedRequestBody });
        validatedRequestBody?.courses?.forEach((course) =>
            addEnrollmentCourse({ created_by: req.user.id, enrollment_id: enrollmentId, course_id: course?.id }),
        );

        const courseTitles = (validatedRequestBody.courses || []).map((course) => course?.title).filter(Boolean).join(", ");
        await createNotification({
            user_id: validatedRequestBody.user_id,
            title: "You were enrolled in a course",
            description: courseTitles
                ? `You were enrolled for ${courseTitles}.`
                : "A new enrollment was created for you.",
            created_by: req.user.id,
        });

        res.status(201).json(await getEnrollmentById({ id: enrollmentId }));
    } else {
        res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }
});

//tested
router.get("/:id/transactions", requires_authority(AUTHORITIES.READ_ENROLLMENT_TRANSACTION), async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing Enrollment Id" });
    }
    res.status(200).json(await getTransactionsByEnrollmentId({ enrollment_id: req.params.id }));
});

//tested
router.get("/:id/courses", requires_authority(AUTHORITIES.READ_ENROLLMENT_COURSE), async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing Enrollment Id" });
    }
    res.status(200).json(await getEnrollmentCoursesByEnrollmentId({ enrollment_id: req.params.id }));
});

//tested
router.delete("/:id", async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing Enrollment Id" });
    }
    deleteEnrollmentById(req.params);
    res.sendStatus(204);
});

module.exports = router;
