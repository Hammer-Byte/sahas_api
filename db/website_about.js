const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

function getWebsiteAbout() {
    return executeSQLQueryParameterized("SELECT id, eyebrow, title, description, image, image_alt, show_history, history_eyebrow, history_title, history_text, show_journey, journey_eyebrow, journey_title, journey_description, show_founder, show_founder_placeholder, founder_placeholder_title, founder_placeholder_text, show_academic, academic_eyebrow, academic_title, academic_description, show_mission_vision, show_philosophy, philosophy_eyebrow, philosophy_title, philosophy_description, show_map, map_eyebrow, map_title, map_description, show_online, online_eyebrow, online_title, online_description, online_image, online_cta_url, show_social, social_eyebrow, social_title, social_description, show_brand, brand_line_1, brand_line_2, highlights, journey, learning, philosophy, course_overview FROM WEBSITE_PAGE_ABOUT WHERE id=1", [])
        .then((result) => (result.length > 0 ? result[0] : false))
        .catch((error) => {
            logger.error(`getWebsiteAbout: ${error}`);
            return false;
        });
}

function updateWebsiteAbout({ eyebrow, title, description, image, image_alt, show_history, history_eyebrow, history_title, history_text, show_journey, journey_eyebrow, journey_title, journey_description, show_founder, show_founder_placeholder, founder_placeholder_title, founder_placeholder_text, show_academic, academic_eyebrow, academic_title, academic_description, show_mission_vision, show_philosophy, philosophy_eyebrow, philosophy_title, philosophy_description, show_map, map_eyebrow, map_title, map_description, show_online, online_eyebrow, online_title, online_description, online_image, online_cta_url, show_social, social_eyebrow, social_title, social_description, show_brand, brand_line_1, brand_line_2, highlights, journey, learning, philosophy, course_overview }) {
    return executeSQLQueryParameterized("UPDATE WEBSITE_PAGE_ABOUT SET eyebrow=?, title=?, description=?, image=?, image_alt=?, show_history=?, history_eyebrow=?, history_title=?, history_text=?, show_journey=?, journey_eyebrow=?, journey_title=?, journey_description=?, show_founder=?, show_founder_placeholder=?, founder_placeholder_title=?, founder_placeholder_text=?, show_academic=?, academic_eyebrow=?, academic_title=?, academic_description=?, show_mission_vision=?, show_philosophy=?, philosophy_eyebrow=?, philosophy_title=?, philosophy_description=?, show_map=?, map_eyebrow=?, map_title=?, map_description=?, show_online=?, online_eyebrow=?, online_title=?, online_description=?, online_image=?, online_cta_url=?, show_social=?, social_eyebrow=?, social_title=?, social_description=?, show_brand=?, brand_line_1=?, brand_line_2=?, highlights=?, journey=?, learning=?, philosophy=?, course_overview=? WHERE id=1", [eyebrow, title, description, image, image_alt, show_history, history_eyebrow, history_title, history_text, show_journey, journey_eyebrow, journey_title, journey_description, show_founder, show_founder_placeholder, founder_placeholder_title, founder_placeholder_text, show_academic, academic_eyebrow, academic_title, academic_description, show_mission_vision, show_philosophy, philosophy_eyebrow, philosophy_title, philosophy_description, show_map, map_eyebrow, map_title, map_description, show_online, online_eyebrow, online_title, online_description, online_image, online_cta_url, show_social, social_eyebrow, social_title, social_description, show_brand, brand_line_1, brand_line_2, highlights, journey, learning, philosophy, course_overview]).catch((error) => {
        logger.error(`updateWebsiteAbout: ${error}`);
        return false;
    });
}

module.exports = { getWebsiteAbout, updateWebsiteAbout };
