const libExpress = require("express");
const {
    addEnrollmentCourse,
    getEnrollmentCourseById,
    deleteEnrollmentCourseById,
} = require("../db/enrollment_courses");
const { validateRequestBody } = require("sahas_utils");
const requires_authority = require("../middlewares/requires_authority");
const { AUTHORITIES } = require("../constants");

const router = libExpress.Router();

//tested
router.post("/", requires_authority(AUTHORITIES.CREATE_ENROLLMENT_COURSE), async (req, res) => {
    const requiredBodyFields = ["enrollment_id", "course_id"];

    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (isRequestBodyValid) {
        const enrollmentCourseId = await addEnrollmentCourse({ created_by: req.user.id, ...validatedRequestBody });
        res.status(201).json(await getEnrollmentCourseById({ id: enrollmentCourseId }));
    } else {
        res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }
});

//tested
router.delete("/:id", requires_authority(AUTHORITIES.DELETE_ENROLLMENT_COURSE), async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing enrollmentCourseId" });
    }
    deleteEnrollmentCourseById({ id: req.params.id });
    res.sendStatus(204);
});

module.exports = router;
