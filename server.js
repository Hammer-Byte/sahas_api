const libExpress = require("express");
const { logger } = require("sahas_utils");
const cors = require("cors");
const { ROUTE_NOT_FOUND } = require("./constants");

//Required Middlewares #7
const requiresDeviceFingerPrint = require("./middlewares/requires_device_finger_print");
const requiresNoMaintenance = require("./middlewares/requires_no_maintenance");

//Common Middlewares
const parseGuestUser = require("./middlewares/parse_guest_user");
const parseAuthenticationToken = require("./middlewares/parse_authentication_token");
const parseUserDevice = require("./middlewares/parse_user_device");
const logRequest = require("./middlewares/log_request");

//api server
const sahasAPI = libExpress();

// Use the CORS middleware to allow cross origin request in case of testing UI Localhost and Cookies as well
sahasAPI.use(cors({ origin: process.env.ALLOWED_CORS_ORIGINS ? process.env.ALLOWED_CORS_ORIGINS.split(",") : [] }));

//allow json request payloads and cookies only by express
sahasAPI.use(libExpress.json());
sahasAPI.use(libExpress.urlencoded({ extended: true }));

//Apply Middlewares
sahasAPI.use(requiresNoMaintenance);

//api end points and routers
const routers = {
    "/template-configs": {
        middlewares: [requiresDeviceFingerPrint, parseAuthenticationToken, parseUserDevice, logRequest],
        router: require("./routes/template_configs"),
    },
    "/authentication-tokens": {
        middlewares: [requiresDeviceFingerPrint, parseAuthenticationToken,parseGuestUser, parseUserDevice, logRequest],
        router: require("./routes/authentication_tokens"),
    },
    "/course-categories": {
        middlewares: [requiresDeviceFingerPrint, parseAuthenticationToken, parseUserDevice, logRequest],
        router: require("./routes/course_categories"),
    },
    "/courses": { middlewares: [requiresDeviceFingerPrint, parseAuthenticationToken, parseUserDevice, logRequest], router: require("./routes/courses") },
    "/course-subjects": {
        middlewares: [requiresDeviceFingerPrint, parseAuthenticationToken, parseUserDevice, logRequest],
        router: require("./routes/course_subjects"),
    },
    "/subjects": { middlewares: [requiresDeviceFingerPrint, parseAuthenticationToken, parseUserDevice, logRequest], router: require("./routes/subjects") },
    "/chapter-types": {
        middlewares: [requiresDeviceFingerPrint, parseAuthenticationToken, parseUserDevice, logRequest],
        router: require("./routes/chapter_types"),
    },
    "/chapters": { middlewares: [requiresDeviceFingerPrint, parseAuthenticationToken, parseUserDevice, logRequest], router: require("./routes/chapters") },

    "/media": {
        middlewares: [requiresDeviceFingerPrint, parseAuthenticationToken, parseUserDevice, logRequest],
        router: require("./routes/media"),
    },

    "/filters": { middlewares: [requiresDeviceFingerPrint, parseAuthenticationToken, parseUserDevice, logRequest], router: require("./routes/filters") },

    "/users": { middlewares: [requiresDeviceFingerPrint, parseAuthenticationToken, parseUserDevice, logRequest], router: require("./routes/users") },

    "/inquiries": { middlewares: [requiresDeviceFingerPrint, parseAuthenticationToken, parseUserDevice, logRequest], router: require("./routes/inquiries") },

    "/inquiry-notes": {
        middlewares: [requiresDeviceFingerPrint, parseAuthenticationToken, parseUserDevice, logRequest],
        router: require("./routes/inquiry_notes"),
    },
    "/global-notes": {
        middlewares: [requiresDeviceFingerPrint, parseAuthenticationToken, parseUserDevice, logRequest],
        router: require("./routes/global_notes"),
    },

    "/payment-gateway-payloads": {
        middlewares: [requiresDeviceFingerPrint, parseAuthenticationToken, parseUserDevice, logRequest],
        router: require("./routes/payment_gateway_payloads"),
    },
    "/payment-gateway-payload-results": {
        middlewares: [],
        router: require("./routes/payment_gateway_payload_results"),
    },

    "/enrollments": {
        middlewares: [requiresDeviceFingerPrint, parseAuthenticationToken, parseUserDevice, logRequest],
        router: require("./routes/enrollments"),
    },
    "/enrollment-transactions": {
        middlewares: [requiresDeviceFingerPrint, parseAuthenticationToken, parseUserDevice, logRequest],
        router: require("./routes/enrollment_transactions"),
    },
    "/enrollment-courses": {
        middlewares: [requiresDeviceFingerPrint, parseAuthenticationToken, parseUserDevice, logRequest],
        router: require("./routes/enrollment_courses"),
    },

    "/wallet-transactions": {
        middlewares: [requiresDeviceFingerPrint, parseAuthenticationToken, parseUserDevice, logRequest],
        router: require("./routes/wallet_transactions"),
    },
    "/devices": {
        middlewares: [requiresDeviceFingerPrint, parseAuthenticationToken, parseUserDevice, logRequest],
        router: require("./routes/devices"),
    },

    "/coupon-codes": {
        middlewares: [requiresDeviceFingerPrint, parseAuthenticationToken, parseUserDevice, logRequest],
        router: require("./routes/coupon_codes"),
    },
    "/coupon-code-courses": {
        middlewares: [requiresDeviceFingerPrint, parseAuthenticationToken, parseUserDevice, logRequest],
        router: require("./routes/coupon_code_courses"),
    },
    "/roles": { middlewares: [requiresDeviceFingerPrint, parseAuthenticationToken, parseUserDevice, logRequest], router: require("./routes/roles") },
    "/user-roles": { middlewares: [requiresDeviceFingerPrint, parseAuthenticationToken, parseUserDevice, logRequest], router: require("./routes/user_roles") },

    "/authorities": {
        middlewares: [requiresDeviceFingerPrint, parseAuthenticationToken, parseUserDevice, logRequest],
        router: require("./routes/authorities"),
    },
    "/role-authorities": {
        middlewares: [requiresDeviceFingerPrint, parseAuthenticationToken, parseUserDevice, logRequest],
        router: require("./routes/role_authorities"),
    },
    "/policies": {
        middlewares: [requiresDeviceFingerPrint, parseAuthenticationToken, parseUserDevice, logRequest],
        router: require("./routes/policies"),
    },
    "/stream-selection-question-categories": {
        middlewares: [requiresDeviceFingerPrint, parseAuthenticationToken, parseUserDevice, logRequest],
        router: require("./routes/stream_selection_questions_categories"),
    },
    "/stream-selection-questions": {
        middlewares: [requiresDeviceFingerPrint,  parseUserDevice, logRequest],
        router: require("./routes/stream_selection_questions"),
    },
    "/stream-selection-tests": {
        middlewares: [requiresDeviceFingerPrint, parseAuthenticationToken, parseUserDevice, logRequest],
        router: require("./routes/stream_selection_tests"),
    },
    "/stream-selection-suggestions": {
        middlewares: [requiresDeviceFingerPrint, parseAuthenticationToken, parseUserDevice, logRequest],
        router: require("./routes/stream_selection_suggestions"),
    },
    "/stream-selection-test-invites": {
        middlewares: [logRequest],
        router: require("./routes/stream_selection_test_invites"),
    },
  
};

//apply all routes
Object.entries(routers).forEach(([path, routeHandler]) => sahasAPI.use(path, ...routeHandler?.middlewares, routeHandler.router));

//if api path is not processable
sahasAPI.use((req, res) => res.status(404).json({ error: ROUTE_NOT_FOUND }));

//APP Port and start app
const allowTraffic = () => sahasAPI.listen(process.env.SERVER_PORT, () => logger.success(`APIs started at ${process.env.SERVER_PORT}`));

//global exception handling
process.on("uncaughtException", (error) => logger.error(error));

module.exports = { allowTraffic };
