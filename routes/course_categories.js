const libExpress = require("express");
const {
    addCourseCategory,
    getCourseCategoryById,
    deleteCourseCategoryById,
    updateCourseCategoryViewIndexById,
    updateCourseCategoryById,
    getCourseCategoryByTitle,
    getCourseCategoryByTitleAndNotId,
    getAllCourseCategories,
} = require("../db/course_categories");
const { validateRequestBody } = require("sahas_utils");
const { getCoursesByCategoryId } = require("../db/courses");
const { getBundledCoursesByCourseId } = require("../db/bundled_courses");
const requires_authority = require("../middlewares/requires_authority");
const { AUTHORITIES } = require("../constants");

const router = libExpress.Router();

//tested
router.get("/", requires_authority(AUTHORITIES.READ_COURSE_CATEGORY), async (req, res) => {
    //provide all the product categories
    res.status(200).json(await getAllCourseCategories());
});

//tested
router.post(
    "/",
    requires_authority(AUTHORITIES.CREATE_COURSE_CATEGORY),
    async (req, res, next) => {
        const requiredBodyFields = ["title", "image", "view_index"];
        const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);
        if (!isRequestBodyValid) {
            return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
        }
        req.body = validatedRequestBody;
        next();
    },
    async (req, res, next) => {
        if (!!(await getCourseCategoryByTitle(req.body))) {
            return res.status(400).json({ error: "Course Category Already Exist" });
        }
        next();
    },
    async (req, res) => {
        const CourseCategoryId = await addCourseCategory(req.body);
        res.status(201).json(await getCourseCategoryById({ id: CourseCategoryId }));
    },
);

//tested
router.patch("/view_indexes", requires_authority(AUTHORITIES.UPDATE_COURSE_CATEGORY_VIEW_INDEX), async (req, res) => {
    if (req.body?.length) {
        req.body.forEach(updateCourseCategoryViewIndexById);
        return res.sendStatus(200);
    }

    return res.status(400).json({ error: "Missing Course Categories" });
});

//tested
router.patch(
    "/",
    requires_authority(AUTHORITIES.UPDATE_COURSE_CATEGORY),
    async (req, res, next) => {
        const requiredBodyFields = ["id", "title", "image"];
        const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);
        if (!isRequestBodyValid) {
            return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
        }
        req.body = validatedRequestBody;
        next();
    },
    async (req, res, next) => {
        if (!(await getCourseCategoryById({ id: req.body.id }))) {
            return res.status(400).json({ error: "Course Category Not Exist" });
        }
        next();
    },
    async (req, res, next) => {
        if (!!(await getCourseCategoryByTitleAndNotId(req.body))) {
            return res.status(400).json({ error: "Course Category Already Exist" });
        }
        next();
    },
    async (req, res) => {
        await updateCourseCategoryById(req.body);
        res.status(200).json(await getCourseCategoryById({ id: req.body.id }));
    },
);

//tested
router.delete("/:id", requires_authority(AUTHORITIES.DELETE_COURSE_CATEGORY), async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing Course Category Id" });
    }
    //delete category
    deleteCourseCategoryById({ id: req.params.id });
    //courses releated to category needs to be deleted
    res.sendStatus(204);
});

//tested
router.get("/:id/courses", requires_authority(AUTHORITIES.READ_COURSE_BY_CATEGORY), async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing Course Category Id" });
    }

    const courses = await getCoursesByCategoryId({ category_id: req.params.id });

    for (const course of courses) {
        if (course?.is_bundle) course.bundledCourses = await getBundledCoursesByCourseId({ course_id: course.id });
    }

    res.status(200).json(courses);
});

module.exports = router;
