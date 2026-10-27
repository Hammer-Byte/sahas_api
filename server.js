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
    "/dialog-contents": {
        middlewares: [requiresDeviceFingerPrint, parseAuthenticationToken, parseUserDevice, logRequest],
        router: require("./routes/dialog_contents"),
    },
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

    "/website-inquiries": { middlewares: [parseAuthenticationToken, logRequest], router: require("./routes/website_inquiries") },
    "/sahaswebsite": { middlewares: [], router: require("./routes/sahaswebsite") },
    "/website/settings": { middlewares: [requiresDeviceFingerPrint, parseAuthenticationToken, parseUserDevice, logRequest], router: require("./routes/website_settings") },
    "/website/header": { middlewares: [requiresDeviceFingerPrint, parseAuthenticationToken, parseUserDevice, logRequest], router: require("./routes/website_header") },
    "/website/footer": { middlewares: [requiresDeviceFingerPrint, parseAuthenticationToken, parseUserDevice, logRequest], router: require("./routes/website_footer") },
    "/website/mobile-bar": { middlewares: [requiresDeviceFingerPrint, parseAuthenticationToken, parseUserDevice, logRequest], router: require("./routes/website_mobile_bar") },
    "/website/home": { middlewares: [requiresDeviceFingerPrint, parseAuthenticationToken, parseUserDevice, logRequest], router: require("./routes/website_home") },
    "/website/about": { middlewares: [requiresDeviceFingerPrint, parseAuthenticationToken, parseUserDevice, logRequest], router: require("./routes/website_about") },
    "/website/contact": { middlewares: [requiresDeviceFingerPrint, parseAuthenticationToken, parseUserDevice, logRequest], router: require("./routes/website_contact") },
    "/website/courses-page": { middlewares: [requiresDeviceFingerPrint, parseAuthenticationToken, parseUserDevice, logRequest], router: require("./routes/website_courses_page") },
    "/website/facilities-page": { middlewares: [requiresDeviceFingerPrint, parseAuthenticationToken, parseUserDevice, logRequest], router: require("./routes/website_facilities_page") },
    "/website/notifications-page": { middlewares: [requiresDeviceFingerPrint, parseAuthenticationToken, parseUserDevice, logRequest], router: require("./routes/website_notifications_page") },
    "/website/gallery-page": { middlewares: [requiresDeviceFingerPrint, parseAuthenticationToken, parseUserDevice, logRequest], router: require("./routes/website_gallery_page") },
    "/website/brochures-page": { middlewares: [requiresDeviceFingerPrint, parseAuthenticationToken, parseUserDevice, logRequest], router: require("./routes/website_brochures_page") },
    "/website/links": { middlewares: [requiresDeviceFingerPrint, parseAuthenticationToken, parseUserDevice, logRequest], router: require("./routes/website_links") },
    "/website/seo": { middlewares: [requiresDeviceFingerPrint, parseAuthenticationToken, parseUserDevice, logRequest], router: require("./routes/website_seo") },
    "/website/branches": { middlewares: [requiresDeviceFingerPrint, parseAuthenticationToken, parseUserDevice, logRequest], router: require("./routes/website_branches") },
    "/website/courses": { middlewares: [requiresDeviceFingerPrint, parseAuthenticationToken, parseUserDevice, logRequest], router: require("./routes/website_courses") },
    "/website/course-features": { middlewares: [requiresDeviceFingerPrint, parseAuthenticationToken, parseUserDevice, logRequest], router: require("./routes/website_course_features") },
    "/website/facilities": { middlewares: [requiresDeviceFingerPrint, parseAuthenticationToken, parseUserDevice, logRequest], router: require("./routes/website_facilities") },
    "/website/notifications": { middlewares: [requiresDeviceFingerPrint, parseAuthenticationToken, parseUserDevice, logRequest], router: require("./routes/website_notifications") },
    "/website/notification-images": { middlewares: [requiresDeviceFingerPrint, parseAuthenticationToken, parseUserDevice, logRequest], router: require("./routes/website_notification_images") },
    "/website/notification-files": { middlewares: [requiresDeviceFingerPrint, parseAuthenticationToken, parseUserDevice, logRequest], router: require("./routes/website_notification_files") },
    "/website/testimonials": { middlewares: [requiresDeviceFingerPrint, parseAuthenticationToken, parseUserDevice, logRequest], router: require("./routes/website_testimonials") },
    "/website/social-links": { middlewares: [requiresDeviceFingerPrint, parseAuthenticationToken, parseUserDevice, logRequest], router: require("./routes/website_social_links") },
    "/website/stats": { middlewares: [requiresDeviceFingerPrint, parseAuthenticationToken, parseUserDevice, logRequest], router: require("./routes/website_stats") },
    "/website/home-highlights": { middlewares: [requiresDeviceFingerPrint, parseAuthenticationToken, parseUserDevice, logRequest], router: require("./routes/website_home_highlights") },
    "/website/home-app-features": { middlewares: [requiresDeviceFingerPrint, parseAuthenticationToken, parseUserDevice, logRequest], router: require("./routes/website_home_app_features") },
    "/website/home-achievements": { middlewares: [requiresDeviceFingerPrint, parseAuthenticationToken, parseUserDevice, logRequest], router: require("./routes/website_home_achievements") },
    "/website/home-gallery-tiles": { middlewares: [requiresDeviceFingerPrint, parseAuthenticationToken, parseUserDevice, logRequest], router: require("./routes/website_home_gallery_tiles") },
    "/website/home-brochure-cards": { middlewares: [requiresDeviceFingerPrint, parseAuthenticationToken, parseUserDevice, logRequest], router: require("./routes/website_home_brochure_cards") },
    "/website/gallery-categories": { middlewares: [requiresDeviceFingerPrint, parseAuthenticationToken, parseUserDevice, logRequest], router: require("./routes/website_gallery_categories") },
    "/website/gallery-albums": { middlewares: [requiresDeviceFingerPrint, parseAuthenticationToken, parseUserDevice, logRequest], router: require("./routes/website_gallery_albums") },
    "/website/gallery-media": { middlewares: [requiresDeviceFingerPrint, parseAuthenticationToken, parseUserDevice, logRequest], router: require("./routes/website_gallery_media") },
    "/website/brochures": { middlewares: [requiresDeviceFingerPrint, parseAuthenticationToken, parseUserDevice, logRequest], router: require("./routes/website_brochures") },

    "/inquiry-notes": {
        middlewares: [requiresDeviceFingerPrint, parseAuthenticationToken, parseUserDevice, logRequest],
        router: require("./routes/inquiry_notes"),
    },
    "/global-notes": {
        middlewares: [requiresDeviceFingerPrint, parseAuthenticationToken, parseUserDevice, logRequest],
        router: require("./routes/global_notes"),
    },
    "/counseling-notes": {
        middlewares: [requiresDeviceFingerPrint, parseAuthenticationToken, parseUserDevice, logRequest],
        router: require("./routes/counseling_notes"),
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
    "/batches": {
        middlewares: [requiresDeviceFingerPrint, parseAuthenticationToken, parseUserDevice, logRequest],
        router: require("./routes/batches"),
    },
    "/calendar": {
        middlewares: [requiresDeviceFingerPrint, parseAuthenticationToken, parseUserDevice, logRequest],
        router: require("./routes/calendar"),
    },
    "/batch-events": {
        middlewares: [requiresDeviceFingerPrint, parseAuthenticationToken, parseUserDevice, logRequest],
        router: require("./routes/batch_events"),
    },
    "/user-tasks": {
        middlewares: [requiresDeviceFingerPrint, parseAuthenticationToken, parseUserDevice, logRequest],
        router: require("./routes/user_tasks"),
    },
    "/notifications": {
        middlewares: [requiresDeviceFingerPrint, parseAuthenticationToken, parseUserDevice, logRequest],
        router: require("./routes/notifications"),
    },
    "/branches": {
        middlewares: [requiresDeviceFingerPrint, parseAuthenticationToken, parseUserDevice, logRequest],
        router: require("./routes/branches"),
    },
    "/exam-series": {
        middlewares: [requiresDeviceFingerPrint, parseAuthenticationToken, parseUserDevice, logRequest],
        router: require("./routes/exam_series"),
    },
    "/exams": {
        middlewares: [requiresDeviceFingerPrint, parseAuthenticationToken, parseUserDevice, logRequest],
        router: require("./routes/exams"),
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



