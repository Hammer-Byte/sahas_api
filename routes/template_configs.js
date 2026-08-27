const libExpress = require("express");
const { logger, validateRequestBody } = require("sahas_utils");
const { getAllBranches } = require("../db/branches");
const { getAllCourses } = require("../db/courses");
const { getAllRoles } = require("../db/roles");
const { getAllAuthorities } = require("../db/authorities");
const { getAllChapterTypes } = require("../db/chapter_types");
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

    try {
        config.global.branches = await getAllBranches();
        config.global.courses = await getAllCourses();
        config.global.roles = await getAllRoles();
        config.global.authorities = await getAllAuthorities();
        config.global.chapter_types = await getAllChapterTypes();
        config.dash_board.carousel_images = await getAllDashboardCarouselItems();
        config.stream_selection = {
            fees: Number(await getConfigByKey("stream_selection_fees")),
            external_attendees: (await getConfigByKey("stream_selection_external_attendees")) === "true",
            suggestions: await getAllStreamSelectionSuggestions(),
        };
    } catch (error) {
        logger.error(error);
    } finally {
        res.status(200).json(config);
    }
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
