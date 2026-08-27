const libExpress = require("express");
const { validateRequestBody } = require("sahas_utils");
const {
    addCouponCodeCourse,
    getCouponCodeCoursesByIds,
    deleteCouponCodeCourseById,
    updateCouponCodeCourseById,
    getCouponCodeCourseById,
} = require("../db/coupon_code_courses");
const router = libExpress.Router();
const requires_authority = require("../middlewares/requires_authority");
const { AUTHORITIES } = require("../constants");

//tested
router.post("/", requires_authority(AUTHORITIES.CREATE_COUPON_CODE_COURSES), async (req, res) => {
    const requiredBodyFields = ["course_ids", "discount", "discount_type"];

    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (isRequestBodyValid) {
        const { course_ids: courseIds, ...rest } = validatedRequestBody;

        const couponCodeCourseIds = await Promise.all(courseIds.map(({ id }) => addCouponCodeCourse({ course_id: id, ...rest })));

        res.status(201).json(await getCouponCodeCoursesByIds({ couponCodeCourseIds: couponCodeCourseIds.join(",") }));
    } else {
        res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }
});

//tested
router.delete("/:id", requires_authority(AUTHORITIES.DELETE_COUPON_CODE_COURSES), (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing Coupon Code Course Id" });
    }
    //delete coupon code course
    deleteCouponCodeCourseById({ id: req.params.id });
    res.sendStatus(204);
});

//tested
router.patch("/", requires_authority(AUTHORITIES.UPDATE_COUPON_CODE_COURSES), async (req, res) => {
    const requiredBodyFields = ["id", "discount", "discount_type"];

    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (isRequestBodyValid) {
        await updateCouponCodeCourseById(validatedRequestBody);
        res.status(200).json(await getCouponCodeCourseById({ id: validatedRequestBody.id }));
    } else {
        res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }
});

module.exports = router;
