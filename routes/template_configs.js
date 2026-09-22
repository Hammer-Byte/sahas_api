const libExpress = require("express");
const { logger, validateRequestBody } = require("sahas_utils");
const { getAllBranches } = require("../db/branches");
const { getAllCourses } = require("../db/courses");
const { getAllRoles } = require("../db/roles");
const { getAllAuthorities } = require("../db/authorities");
const { getAllChapterTypes } = require("../db/chapter_types");
const { getAllUserTaskStatuses } = require("../db/user_tasks");
const { getAllStreamSelectionSuggestions } = require("../db/stream_selection_suggestions");
const { getConfigByKey, writeConfigByKey } = require("../db/configs");
const {
    getAllDashboardCarouselItems,
    addDashboardCarouselItem,
    getDashboardCarouselItemById,
    deleteDashboardCarouselItemById,
} = require("../db/dashboard_carousel");
const { PAYMENT_TYPES, ENROLLMENT_HANDLERS, NOTE_TYPES, MEDIA_TYPES, AUTHORITIES } = require("../constants");
const requires_authority = require("../middlewares/requires_authority");

const router = libExpress.Router();

router.get("/", async (req, res) => {
    let config = {
        global: {
            paymentTypes: PAYMENT_TYPES,
            enrollmentHandlers: ENROLLMENT_HANDLERS,
        },
        user: {
            note_types: NOTE_TYPES,
        },
        chapter: {
            media_types: MEDIA_TYPES,
        },
        dash_board: {
            carousel_images: [],
        },
        stream_selection: {},
    };

    const load = async (label, fn) => {
        try {
            return await fn();
        } catch (error) {
            logger.error(`template-configs ${label}: ${error}`);
            return undefined;
        }
    };

    config.global.branches = (await load("branches", getAllBranches)) ?? [];
    config.global.courses = (await load("courses", getAllCourses)) ?? [];
    config.global.roles = (await load("roles", getAllRoles)) ?? [];
    config.global.authorities = (await load("authorities", getAllAuthorities)) ?? [];
    config.global.chapter_types = (await load("chapter_types", getAllChapterTypes)) ?? [];
    config.global.user_task_statuses = (await load("user_task_statuses", getAllUserTaskStatuses)) ?? [];
    config.dash_board.carousel_images = (await load("carousel_images", getAllDashboardCarouselItems)) ?? [];

    const fees = await load("stream_selection_fees", () => getConfigByKey("stream_selection_fees"));
    const externalAttendees = await load("stream_selection_external_attendees", () => getConfigByKey("stream_selection_external_attendees"));
    const suggestions = await load("stream_selection_suggestions", getAllStreamSelectionSuggestions);
    config.stream_selection = {
        fees: Number(fees ?? 0),
        external_attendees: externalAttendees === "true",
        suggestions: suggestions ?? [],
    };

    res.status(200).json(config);
});

router.post(
    "/dashboard/carousel-images",
    requires_authority(AUTHORITIES.CREATE_CAROUSEL),
    async (req, res, next) => {
        const requiredBodyFields = ["click_link", "source"];
        const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);
        if (!isRequestBodyValid) {
            return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
        }
        req.body = validatedRequestBody;
        next();
    },
    async (req, res) => {
        const existing = await getAllDashboardCarouselItems();
        const view_index = existing?.length || 0;
        const id = await addDashboardCarouselItem({ ...req.body, view_index });
        const item = await getDashboardCarouselItemById({ id });

        if (item) {
            return res.status(201).json(item);
        }
        return res.status(400).json({ error: "Failed To Add Carousel Item" });
    },
);

router.put("/stream-selection", requires_authority(AUTHORITIES.UPDATE_USER), async (req, res) => {
    const requiredBodyFields = ["external_attendees", "fees"];

    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    await writeConfigByKey("stream_selection_fees", validatedRequestBody.fees);
    await writeConfigByKey("stream_selection_external_attendees", validatedRequestBody.external_attendees ? "true" : "false");

    return res.status(200).json({
        fees: Number(validatedRequestBody.fees),
        external_attendees: !!validatedRequestBody.external_attendees,
    });
});

router.delete("/dashboard/carousel-images/:id", requires_authority(AUTHORITIES.DELETE_CAROUSEL), async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing Carousel Image Id" });
    }

    const item = await getDashboardCarouselItemById({ id: req.params.id });
    if (!item) {
        return res.status(400).json({ error: "Carousel Item Not Exist" });
    }

    await deleteDashboardCarouselItemById({ id: req.params.id });
    res.sendStatus(204);
});

module.exports = router;
