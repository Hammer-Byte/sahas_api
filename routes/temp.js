const libExpress = require("express");
const { logger } = require("sahas_utils");
const {
    getAllUsersBySearchAndFilters,
    getCountUsersBySearchAndFilters,
    getUserById,
    updateUserById,
    addUser,
    patchUserFullNameById,
    patchUserPhoneById,
    addGuestUser,
    getUserByEmail,
    patchUserStreamSelectionTestAllowedById,
} = require("../db/users");
const { getInquiriesByUserId } = require("../db/inquiries");
const { validateRequestBody } = require("sahas_utils");
const { getEnrollmentsByUserId } = require("../db/enrollments");
const { getWalletTransactionsByUserId } = require("../db/wallet_transactions");
const { getUserRolesByUserId } = require("../db/user_roles");
const { getEnrollmentCoursesByUserId, getEnrollmentCoursesByEnrollmentId } = require("../db/enrollment_courses");
const { getDevicesByUserId } = require("../db/devices");
const { getCourseSubjectsByCourseId } = require("../db/course_subjects");

const { getTestAttainableChaptersBySubjectId } = require("../db/chapters");
const { requestService } = require("sahas_utils");
const { getAllBranches } = require("../db/branches");
const { getAllCourses } = require("../db/courses");
const { getGlobalNotesByUserId } = require("../db/global_notes");
const requires_authority = require("../middlewares/requires_authority");
const { AUTHORITIES } = require("../constants");
const { addUserHistory, getUserHistoryById, updateUserHistoryById } = require("../db/user_history");
const {
    getLatestStreamSelectionTestByUserId,
    getStreamSelectionTestsByUserId,
    getStreamSelectionTestAnswersByStreamSelectionTestId,
} = require("../db/stream_selection_tests");

const parseGuestUser = require("../middlewares/parse_guest_user");
const { addInactiveToken } = require("../db/authentication_tokens");
const { generateToken } = require("../utils");
const { readConfig } = require("../libs/config");


const router = libExpress.Router();



//external end point to enroll automatically into stream selection test
//tested
router.patch(
    "/stream-selection-test-allowed",
   
    async (req, res, next) => {

        const { stream_selection = {} } = await readConfig("template");
        const amount = Number(stream_selection?.fees)

        if (amount > 0) {
            return res.status(400).json({ error: "Amount is not valid to enroll into stream selection test" });
        }
        next()
    },
    async (req, res) => {
        await patchUserStreamSelectionTestAllowedById({ id: req.user.id, stream_selection_test_allowed: true });

        return res.redirect(redirectionHost.concat("stream-selection-test/enroll"));
    },
);


module.exports = router;
