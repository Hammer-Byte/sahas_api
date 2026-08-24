const libExpress = require("express");

const router = libExpress.Router();

router.use("/courses", require("./courses"));
router.use("/exams", require("./exams"));
router.use("/dashboard", require("./dashboard"));
router.use("/chapters-test", require("./chapters_test"));
router.use("/views", require("./views"));

module.exports = router;
