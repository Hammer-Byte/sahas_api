const { logger } = require("sahas_utils");
const { ACTIVITIES } = require("../constants/activities");
const { addUserActivity } = require("../db/user_activities");

async function recordActivity({ user_id, key, values = {} }) {
    try {
        if (user_id == null || user_id === "") return;
        const template = ACTIVITIES[key];
        if (typeof template !== "function") return;
        const activity = String(template(values) ?? "").trim().slice(0, 512);
        if (!activity) return;
        await addUserActivity({ user_id, activity });
    } catch (error) {
        logger.error(`recordActivity: ${error}`);
    }
}

module.exports = { recordActivity };
