const libExpress = require("express");
const { validateRequestBody } = require("sahas_utils");
const requires_authority = require("../middlewares/requires_authority");
const { AUTHORITIES } = require("../constants");
const { getCourseDialogContentById, addCourseDialogContentView } = require("../db/course_dialog_contents");
const { getCourseById } = require("../db/courses");

const router = libExpress.Router();

router.post("/", requires_authority(AUTHORITIES.READ_COURSE), async (req, res) => {
    const requiredBodyFields = ["content_id"];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    const content = await getCourseDialogContentById({ id: validatedRequestBody.content_id });
    if (!content) {
        return res.status(400).json({ error: "Content Not Exist" });
    }

    const course = await getCourseById({ id: content.course_id });
    if (!course) {
        return res.status(400).json({ error: "Course Not Exist" });
    }

    const viewId = await addCourseDialogContentView({ user_id: req.user.id, content_id: content.id });
    if (viewId) {
        return res.sendStatus(204);
    }

    return res.status(400).json({ error: "Failed To Record View" });
});

module.exports = router;
