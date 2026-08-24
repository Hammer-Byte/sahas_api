const libExpress = require("express");
const { readConfig, writeConfig } = require("../libs/config");
const { logger } = require("sahas_utils");
const { getAllBranches } = require("../db/branches");
const { getAllCourses } = require("../db/courses");
const { getAllRoles } = require("../db/roles");
const { getAllAuthorities } = require("../db/authorities");
const { validateRequestBody } = require("sahas_utils");
const router = libExpress.Router();
const { v4: uuidv4 } = require("uuid");
const { getAllChapterTypes } = require("../db/chapter_types");
const { getAllStreamSelectionSuggestions } = require("../db/stream_selection_suggestions");

//Template Config
router.get("/", async (req, res) => {
    let config = {};
    //configs
    try {
        config = await readConfig("template");
        config.global.branches = await getAllBranches();
        config.global.courses = await getAllCourses();
        config.global.roles = await getAllRoles();
        config.global.authorities = await getAllAuthorities();
        config.global.chapter_types = await getAllChapterTypes();
        config.stream_selection.suggestions = await getAllStreamSelectionSuggestions();
    } catch (error) {
        logger.error(error);
    } finally {
        res.status(200).json(config);
    }
});

router.post("/dashboard/carousel-images", async (req, res) => {
    const requiredBodyFields = ["click_link", "source"];

    try {
        const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);
        if (isRequestBodyValid) {
            const config = await readConfig("template");
            validatedRequestBody.id = uuidv4();
            config.dash_board.carousel_images = [...config.dash_board.carousel_images, validatedRequestBody];
            writeConfig("template", config);
            res.status(201).json(validatedRequestBody);
        } else {
            res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
        }
    } catch (error) {
        logger.error(error);
        res.status(400).json({ error });
    }
});

router.put("/stream-selection", async (req, res) => {
    const requiredBodyFields = ["external_attendees","fees"];

    try {
        const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);
        if (isRequestBodyValid) {
            const config = await readConfig("template");
            config.stream_selection = validatedRequestBody;
            writeConfig("template", config);
            res.status(200).json(validatedRequestBody);
        } else {
            res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
        }
    } catch (error) {
        logger.error(error);
        res.status(400).json({ error });
    }
});

router.delete("/dashboard/carousel-images/:id", async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing Carousel Image Id" });
    }

    try {
        const config = await readConfig("template");
        config.dash_board.carousel_images = config?.dash_board?.carousel_images?.filter((carouselImage) => carouselImage?.id !== req.params.id);
        writeConfig("template", config);
        res.sendStatus(204);
    } catch (error) {
        logger.error(error);
        res.status(400).json({ error });
    }
});

module.exports = router;
