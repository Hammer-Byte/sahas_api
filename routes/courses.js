const libExpress = require("express");
const { addCourse, getCourseById, deleteCourseById, updateCourseViewIndexById, updateCourseById, getCourseByCategoryIdAndTitle } = require("../db/courses");
const { validateRequestBody, logger } = require("sahas_utils");
const { getEnrollmentByCourseIdAndUserId } = require("../db/enrollments");
const { getCourseSubjectsByCourseId } = require("../db/course_subjects");
const { removeBundledCoursesByCourseId, addBundledCourse, getBundledCoursesByCourseId } = require("../db/bundled_courses");
const requires_authority = require("../middlewares/requires_authority");
const { AUTHORITIES } = require("../constants");
const {
    getCourseCarouselByCourseId,
    getCourseCarouselItemById,
    addCourseCarouselItem,
    deleteCourseCarouselItemById,
    updateCourseCarouselItemById,
} = require("../db/course_carousel");
const { readConfig } = require("../libs/config");
const { getDateByInterval } = require("../utils");
const libCrypto = require("crypto");
const { getWalletBalanceByUserId } = require("../db/wallet_transactions");
const { getCouponCodeCourseByCouponCodeAndCourseId } = require("../db/coupon_code_courses");
const { getUserByEmail } = require("../db/users");
const { addPaymentGateWayPayLoad } = require("../db/payment_gateway_payloads");



const router = libExpress.Router();

//tested
router.post(
    "/",
    requires_authority(AUTHORITIES.CREATE_COURSE),
    async (req, res, next) => {
        const requiredBodyFields = ["category_id", "title", "description", "image", "fees", "view_index"];
        const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);
        if (!isRequestBodyValid) {
            return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
        }
        req.body = validatedRequestBody;
        next();
    },
    async (req, res, next) => {
        if (!!(await getCourseByCategoryIdAndTitle(req.body))) {
            return res.status(400).json({ error: "Course Already Exist" });
        }
        next();
    },
    async (req, res) => {
        const courseId = await addCourse(req.body);

        const course = await getCourseById({ id: courseId });

        //if it is a bundled course
        await removeBundledCoursesByCourseId({ course_id: courseId });
        if (!!req.body.is_bundle && req.body?.bundledCourses?.length > 0) {
            for (const bundledCourse of req.body?.bundledCourses) {
                await addBundledCourse({ course_id: courseId, bundled_course_id: bundledCourse?.id });
            }

            course.bundledCourses = await getBundledCoursesByCourseId({ course_id: courseId });
        }

        res.status(201).json(course);
    },
);

//tested
router.delete("/:id", requires_authority(AUTHORITIES.DELETE_COURSE), async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing Course Id" });
    }
    deleteCourseById({ id: req.params.id });
    res.sendStatus(204);
});

//tested
router.patch("/view_indexes", requires_authority(AUTHORITIES.UPDATE_COURSE_VIEW_INDEX), async (req, res) => {
    if (req.body?.length) {
        req.body.forEach(updateCourseViewIndexById);
        return res.sendStatus(200);
    }

    return res.status(400).json({ error: "Missing Courses" });
});

router.post(
    "/carousel",
    requires_authority(AUTHORITIES.UPDATE_COURSE),
    async (req, res, next) => {
        const requiredBodyFields = ["course_id", "source"];
        const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);
        if (!isRequestBodyValid) {
            return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
        }
        req.body = validatedRequestBody;
        next();
    },
    async (req, res) => {
        const course = await getCourseById({ id: req.body.course_id });
        if (!course) {
            return res.status(400).json({ error: "Course Not Exist" });
        }

        const existing = await getCourseCarouselByCourseId({ course_id: req.body.course_id });
        const view_index = existing?.length || 0;
        const id = await addCourseCarouselItem({ ...req.body, view_index });
        const item = await getCourseCarouselItemById({ id });

        if (item) {
            return res.status(201).json(item);
        }
        return res.status(400).json({ error: "Failed To Add Carousel Item" });
    },
);

router.delete("/carousel/:id", requires_authority(AUTHORITIES.UPDATE_COURSE), async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing Carousel Id" });
    }

    const item = await getCourseCarouselItemById({ id: req.params.id });
    if (!item) {
        return res.status(400).json({ error: "Carousel Item Not Exist" });
    }

    await deleteCourseCarouselItemById({ id: req.params.id });
    res.sendStatus(204);
});

router.patch(
    "/carousel",
    requires_authority(AUTHORITIES.UPDATE_COURSE),
    async (req, res, next) => {
        const requiredBodyFields = ["id", "source"];
        const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);
        if (!isRequestBodyValid) {
            return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
        }
        req.body = validatedRequestBody;
        next();
    },
    async (req, res) => {
        const existing = await getCourseCarouselItemById({ id: req.body.id });
        if (!existing) {
            return res.status(400).json({ error: "Carousel Item Not Exist" });
        }

        await updateCourseCarouselItemById({
            id: req.body.id,
            source: req.body.source,
            click_link: req.body.click_link || null,
        });

        const item = await getCourseCarouselItemById({ id: req.body.id });
        if (item) {
            return res.status(200).json(item);
        }
        return res.status(400).json({ error: "Failed To Update Carousel Item" });
    },
);

//tested
router.patch(
    "/",
    requires_authority(AUTHORITIES.UPDATE_COURSE),
    async (req, res, next) => {
        const requiredBodyFields = ["id", "title", "description", "image", "fees"];
        const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);
        if (!isRequestBodyValid) {
            return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
        }
        req.body = validatedRequestBody;
        next();
    },
    async (req, res) => {
        const course = req.body;

        updateCourseById(course);

        await removeBundledCoursesByCourseId({ course_id: course.id });
        if (!!course.is_bundle && course?.bundledCourses?.length > 0) {
            for (const bundledCourse of course?.bundledCourses) {
                await addBundledCourse({ course_id: course?.id, bundled_course_id: bundledCourse?.id });
            }

            course.bundledCourses = await getBundledCoursesByCourseId({ course_id: course?.id });
        }

        res.status(200).json(course);
    },
);

//tested
router.get("/:id", requires_authority(AUTHORITIES.READ_COURSE), async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing Course Id" });
    }

    const course = await getCourseById({ id: req.params.id });

    if (course) {
        course.enrollment = await getEnrollmentByCourseIdAndUserId({ course_id: course?.id, user_id: req?.user?.id });
        course.subjects = await getCourseSubjectsByCourseId({ course_id: req.params.id });

        if (course?.is_bundle) course.bundledCourses = await getBundledCoursesByCourseId({ course_id: course.id });

        course.carousel = await getCourseCarouselByCourseId({ course_id: course?.id });

        return res.status(200).json(course);
    }

    res.status(400).json({ error: "Course Not Exist" });
});



router.post("/payment-gateway-payloads", async (req, res) => {
    const requiredBodyFields = ["courseId"];

    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    const { payment: { cgst, sgst } = {}, paymentGateWay: { merchantKey, merchantSalt, redirectionHost, resultAPI, url } = {} } = await readConfig("app");

    //if already existing enrollment is there then do not give back the payment hash

    if (isRequestBodyValid) {
        const course = await getCourseById({ id: validatedRequestBody.courseId });

        const paymentGateWayPayLoad = {
            course: { ...course, validity: getDateByInterval({ days: course?.validity }) },
            paymentGateWay: {
                merchantKey,
                url,
            },
            transaction: {
                id: libCrypto.randomUUID(),
                successURL: redirectionHost.concat(resultAPI),
                failureURL: redirectionHost.concat(resultAPI),
                amount: Number(course.fees),
            },
            user: {
                email: req.user.email,
                firstName: req.user.full_name?.split(" ")[0],
                lastName: req.user.full_name?.split(" ")?.[1] || "NA",
                phone: req.user.phone,
                wallet: (await getWalletBalanceByUserId({ user_id: req?.user?.id })).toFixed(2),
            },
            product: course.title,
        };

        //calculate coupon code first
        paymentGateWayPayLoad.transaction.discount = 0;
        paymentGateWayPayLoad.transaction.couponCode = validatedRequestBody?.couponCode || null;

        if (!!paymentGateWayPayLoad?.transaction?.couponCode) {
            if (
                (couponCodeCourse = await getCouponCodeCourseByCouponCodeAndCourseId({
                    code: paymentGateWayPayLoad.transaction.couponCode,
                    course_id: course?.id,
                }))
            ) {
                //if having discount
                if (couponCodeCourse?.discount > 0) {
                    paymentGateWayPayLoad.transaction.discount = Number(couponCodeCourse?.discount);
                    if (couponCodeCourse?.discount_type === "%") {
                        paymentGateWayPayLoad.transaction.discount = (paymentGateWayPayLoad.transaction.amount * couponCodeCourse.discount) / 100;
                    }
                    paymentGateWayPayLoad.transaction.discount = paymentGateWayPayLoad.transaction.discount.toFixed(2);
                }

                //if coupon code is there that means we will pick validity from there - default 365
                paymentGateWayPayLoad.course.validity =
                    couponCodeCourse.validity_type === "DAYS" ? getDateByInterval({ days: couponCodeCourse.validity_days }) : couponCodeCourse.validity_date;
                //if we have coupon code distributor commision is there
                //it will also check if given email is correct or not
                if (
                    !!couponCodeCourse.distributor_email &&
                    !!couponCodeCourse.commision &&
                    (distributorUser = await getUserByEmail({ email: couponCodeCourse.distributor_email }))
                ) {
                    paymentGateWayPayLoad.transaction.distributor_user = distributorUser;
                    paymentGateWayPayLoad.transaction.commision = couponCodeCourse.commision;

                    if (couponCodeCourse?.commision_type === "%") {
                        paymentGateWayPayLoad.transaction.commision = (paymentGateWayPayLoad.course.fees * couponCodeCourse.discount) / 100;
                    }
                }
            }

            paymentGateWayPayLoad.transaction.amount -= Number(paymentGateWayPayLoad.transaction.discount);
        }

        //if use wallet is required
        if (validatedRequestBody?.useWalletBalance && paymentGateWayPayLoad?.user?.wallet > 0 && paymentGateWayPayLoad.transaction.amount > 0) {
            paymentGateWayPayLoad.transaction.usedWalletBalance = Math.min(
                paymentGateWayPayLoad?.user?.wallet,
                paymentGateWayPayLoad.transaction.amount,
            ).toFixed(2);

            paymentGateWayPayLoad.transaction.amount = Math.max(
                paymentGateWayPayLoad.transaction.amount - paymentGateWayPayLoad.transaction.usedWalletBalance,
                0,
            );
        }


        //pre tax amount
        paymentGateWayPayLoad.transaction.preTaxAmount =
            (Number(paymentGateWayPayLoad.transaction.amount) /
                Number((100 + Number(cgst) + Number(sgst)) / 100)).toFixed(2);


        //add cgst and sgst
        paymentGateWayPayLoad.transaction.cgst = ((paymentGateWayPayLoad.transaction.preTaxAmount * cgst) / 100).toFixed(2);
        paymentGateWayPayLoad.transaction.sgst = ((paymentGateWayPayLoad.transaction.preTaxAmount * sgst) / 100).toFixed(2);

        //final amount
        paymentGateWayPayLoad.transaction.amount = (
            Number(paymentGateWayPayLoad.transaction.preTaxAmount) +
            Number(paymentGateWayPayLoad.transaction.sgst) +
            Number(paymentGateWayPayLoad.transaction.cgst)
        ).toFixed(2);

        //hash generation
        paymentGateWayPayLoad.transaction.hash = libCrypto
            .createHash("sha512")
            .update(
                `${merchantKey}|${paymentGateWayPayLoad.transaction.id}|${paymentGateWayPayLoad.transaction.amount}|${paymentGateWayPayLoad.product}|${paymentGateWayPayLoad.user.firstName}|${paymentGateWayPayLoad.user.email}|||||||||||${merchantSalt}`,
            )
            .digest("hex");



        //add post payment route to the payment gate way payload
        //type will be course

        //add transcation in to table
        addPaymentGateWayPayLoad(paymentGateWayPayLoad);

        res.status(201).json(paymentGateWayPayLoad);
    } else {
        res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }
});


module.exports = router;
