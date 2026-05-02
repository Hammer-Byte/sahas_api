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

//tested
router.get("/", requires_authority(AUTHORITIES.READ_USER), async (req, res) => {
    const { search, offSet, limit, ...appliedFilters } = req.query;
    logger.info(`Searching Users - search : ${search} | filters : ${JSON.stringify(appliedFilters)} | offSet : ${offSet} | limit : ${limit}`);

    //get All Users
    const users = {
        recordsCount: await getCountUsersBySearchAndFilters(search, appliedFilters),
        dataSet: await getAllUsersBySearchAndFilters(search, appliedFilters, offSet, limit),
    };

    res.status(200).json(users);
});

//tested
router.get("/download", async (req, res) => {
    const { search, ...appliedFilters } = req.query;
    logger.info(`Searching Users - search : ${search} | filters : ${JSON.stringify(appliedFilters)} `);

    const users = await getAllUsersBySearchAndFilters(search, appliedFilters);

    const branchSelector = {};
    const courseSelector = {};

    const branches = await getAllBranches();
    const courses = await getAllCourses();

    for (const branch of branches) branchSelector[branch?.id] = branch?.title;
    for (const course of courses) courseSelector[course?.id] = course?.title;

    for (const user of users) {
        if (!!user?.branch_id) {
            user.branch = branchSelector[user?.branch_id];
        }
    }

    await requestService({
        requestServiceName: process.env.SERVICE_MEDIA,
        onRequestStart: () => logger.info("Generating Users"),
        requestPath: "templated/sheet",
        requestMethod: "POST",
        requestPostBody: {
            template: "users",
            injects: users,
        },
        onResponseReceieved: (generatedUsers, responseCode) => {
            if (generatedUsers?.cdn_url && responseCode === 201) logger.success(`Users Sheet Generated !`);
            else logger.error(`Failed To Generate Users - Media Responded With ${JSON.stringify(generatedUsers)} - ${responseCode}`);
            return res.status(responseCode).json(generatedUsers);
        },
    });
});

//tested
router.get("/stream-selection-test-results/latest", parseGuestUser, async (req, res) => {
    const streamSelectionTest = await getLatestStreamSelectionTestByUserId({ user_id: req?.user?.id });
    if (!!streamSelectionTest) {
        streamSelectionTest.answers = await getStreamSelectionTestAnswersByStreamSelectionTestId({ stream_selection_test_id: streamSelectionTest?.id });
        streamSelectionTest.result= JSON.parse(streamSelectionTest.result);
        return res.status(200).json(streamSelectionTest);
    }

    return res.status(400).json({ error: "No Stream Selection Test Given" });
});

//tested
router.get("/:id/stream-selection-test-results", async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing User Id" });
    }

    const streamSelectionTests = await getStreamSelectionTestsByUserId({ user_id: req.params.id });

    for (const streamSelectionTest of streamSelectionTests) {
        streamSelectionTest.answers = await getStreamSelectionTestAnswersByStreamSelectionTestId({ stream_selection_test_id: streamSelectionTest?.id });
    }
    res.status(200).json(streamSelectionTests);
});

//tested
router.get("/stream-selection-test-results", async (req, res) => {
    const streamSelectionTests = await getStreamSelectionTestsByUserId({ user_id: req?.user?.id });

    for (const streamSelectionTest of streamSelectionTests) {
        streamSelectionTest.answers = await getStreamSelectionTestAnswersByStreamSelectionTestId({ stream_selection_test_id: streamSelectionTest?.id });
    }
    res.status(200).json(streamSelectionTests);
});

//tested
router.get("/:id", requires_authority(AUTHORITIES.READ_USER), async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing User Id" });
    }

    const user = await getUserById({ ...req.params });
    user.history = await getUserHistoryById({ user_id: user.id });

    return res.status(200).json(user);
});

//tested
router.get("/:id/courses", requires_authority(AUTHORITIES.READ_USER_ENROLLMENT_COURSES), async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing User Id" });
    }

    return res.status(200).json(await getEnrollmentCoursesByUserId({ user_id: req.params.id }));
});

//tested
router.get("/:id/chapters-test-catalogue", requires_authority(AUTHORITIES.READ_USER_CHAPTERS_TEST_CATALOGUE), async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing User Id" });
    }

    const courses = await getEnrollmentCoursesByUserId({ user_id: req.params.id });

    for (const course of courses) {
        course.subjects = await getCourseSubjectsByCourseId({ course_id: course?.id });

        for (const subject of course.subjects) {
            subject.chapters = await getTestAttainableChaptersBySubjectId(subject);
        }
    }

    return res.status(200).json(courses);
});

// Get all notes for a specific user
router.get("/:id/global-notes", requires_authority(AUTHORITIES.READ_GLOBAL_NOTE), async (req, res) => {
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({ error: "Missing User Id" });
    }
    const notes = await getGlobalNotesByUserId({ user_id: id });
    res.status(200).json(notes);
});

//tested
router.put("/", requires_authority(AUTHORITIES.UPDATE_USER), async (req, res) => {
    const requiredBodyFields = ["id", "email", "full_name", "phone", "address", "active"];

    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (isRequestBodyValid) {
        await updateUserById({ ...validatedRequestBody });
        await updateUserHistoryById({ id: validatedRequestBody.id, ...validatedRequestBody?.history });

        const user = await getUserById({ ...validatedRequestBody });
        user.history = await getUserHistoryById({ user_id: user.id });

        res.status(200).json(user);
    } else {
        res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }
});

//tested
router.patch(
    "/name",
    requires_authority(AUTHORITIES.UPDATE_USER),
    async (req, res, next) => {
        const requiredBodyFields = ["id", "full_name"];
        const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);
        if (!isRequestBodyValid) {
            return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
        }
        req.body = validatedRequestBody;
        next();
    },
    async (req, res) => {
        await patchUserFullNameById({ ...req.body });
        res.status(200).json(await getUserById({ id: req.body.id }));
    },
);

//tested
router.patch(
    "/phone",
    requires_authority(AUTHORITIES.UPDATE_USER),
    async (req, res, next) => {
        const requiredBodyFields = ["id", "phone"];
        const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);
        if (!isRequestBodyValid) {
            return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
        }
        req.body = validatedRequestBody;
        next();
    },
    async (req, res) => {
        await patchUserPhoneById({ ...req.body });
        res.status(200).json(await getUserById({ id: req.body.id }));
    },
);

//tested
router.get("/:id/inquiries", requires_authority(AUTHORITIES.READ_USER_INQUIRIES), async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing User Id" });
    }
    res.status(200).json(await getInquiriesByUserId({ user_id: req.params.id }));
});

//tested
router.get("/:id/enrollments", requires_authority(AUTHORITIES.READ_USER_ENROLLMENTS), async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing User Id" });
    }

    const enrollments = await getEnrollmentsByUserId({ user_id: req.params.id });

    for (const enrollment of enrollments) {
        const courses = await getEnrollmentCoursesByEnrollmentId({ enrollment_id: enrollment?.id });
        enrollment.courses = courses?.map(({ title }) => title);
    }

    return res.status(200).json(enrollments);
});

//tested
router.get("/:id/devices", requires_authority(AUTHORITIES.READ_USER_DEVICES), async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing User Id" });
    }

    return res.status(200).json(await getDevicesByUserId({ user_id: req.params.id }));
});

//tested
router.get("/:id/wallet-transactions", requires_authority(AUTHORITIES.READ_USER_WALLET_TRANSACTIONS), async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing User Id" });
    }

    res.status(200).json(await getWalletTransactionsByUserId({ user_id: req.params.id }));
});

//tested
router.get("/:id/roles", requires_authority(AUTHORITIES.READ_USER_ROLES), async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing User Id" });
    }

    res.status(200).json(await getUserRolesByUserId({ user_id: req.params.id }));
});

//tested
router.post("/", requires_authority(AUTHORITIES.CREATE_USER), async (req, res) => {
    const requiredBodyFields = ["full_name", "email", "phone", "branch_id", "address"];

    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (isRequestBodyValid) {
        if ((userId = await addUser({ ...validatedRequestBody }))) {
            await addUserHistory({ user_id: userId, ...validatedRequestBody?.history });

            const user = await getUserById({ id: userId });
            user.history = await getUserHistoryById({ user_id: user.id });

            return res.status(201).json(user);
        }
        res.status(400).json({ error: "Unable To Add User - User Might Already Exist" });
    } else {
        res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }
});

router.post("/guest", async (req, res) => {
    const requiredBodyFields = ["full_name", "email", "phone", "address"];

    const { authentication: { token_validity } = {} } = await readConfig("app");

    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (isRequestBodyValid) {
        await addGuestUser(validatedRequestBody)
        const user =await getUserByEmail({ email: validatedRequestBody?.email });

        addUserHistory({ user_id: user.id, ...validatedRequestBody?.history });

        user.token = generateToken();

        await addInactiveToken({ user_id: user.id,  token: user.token, validity: new Date(Date.now() + token_validity * 24 * 60 * 60 * 1000) });

        return res.status(201).json(user);
    }

    return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
});

module.exports = router;

