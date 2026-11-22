const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

function getCareerInterestByUserId({ user_id }) {
    return executeSQLQueryParameterized(`SELECT * FROM USER_CAREER_INTERESTS WHERE user_id=?`, [user_id])
        .then((result) => (result.length > 0 ? result[0] : null))
        .catch((error) => {
            logger.error(`getCareerInterestByUserId: ${error}`);
            return null;
        });
}

function getCareerInterestsByUserIds({ user_ids = [] }) {
    if (!user_ids?.length) {
        return Promise.resolve([]);
    }
    const placeholders = user_ids.map(() => "?").join(",");
    return executeSQLQueryParameterized(`SELECT * FROM USER_CAREER_INTERESTS WHERE user_id IN (${placeholders})`, user_ids).catch((error) => {
        logger.error(`getCareerInterestsByUserIds: ${error}`);
        return [];
    });
}

function upsertCareerInterestByUserId({ user_id, preference_1 = null, preference_2 = null, preference_3 = null }) {
    return executeSQLQueryParameterized(
        `INSERT INTO USER_CAREER_INTERESTS (user_id, preference_1, preference_2, preference_3)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE preference_1=VALUES(preference_1), preference_2=VALUES(preference_2), preference_3=VALUES(preference_3)`,
        [user_id, preference_1, preference_2, preference_3],
    )
        .then(() => getCareerInterestByUserId({ user_id }))
        .catch((error) => {
            logger.error(`upsertCareerInterestByUserId: ${error}`);
            throw error;
        });
}

function getTargetResultsByUserId({ user_id }) {
    return executeSQLQueryParameterized(
        `SELECT USER_TARGET_RESULTS.*, COURSES.title AS course_title
         FROM USER_TARGET_RESULTS
         LEFT JOIN COURSES ON COURSES.id = USER_TARGET_RESULTS.course_id
         WHERE USER_TARGET_RESULTS.user_id=?
         ORDER BY USER_TARGET_RESULTS.id ASC`,
        [user_id],
    ).catch((error) => {
        logger.error(`getTargetResultsByUserId: ${error}`);
        return [];
    });
}

function getTargetResultsByUserIds({ user_ids = [] }) {
    if (!user_ids?.length) {
        return Promise.resolve([]);
    }
    const placeholders = user_ids.map(() => "?").join(",");
    return executeSQLQueryParameterized(
        `SELECT USER_TARGET_RESULTS.*, COURSES.title AS course_title
         FROM USER_TARGET_RESULTS
         LEFT JOIN COURSES ON COURSES.id = USER_TARGET_RESULTS.course_id
         WHERE USER_TARGET_RESULTS.user_id IN (${placeholders})
         ORDER BY USER_TARGET_RESULTS.id ASC`,
        user_ids,
    ).catch((error) => {
        logger.error(`getTargetResultsByUserIds: ${error}`);
        return [];
    });
}

function getTargetResultById({ id }) {
    return executeSQLQueryParameterized(
        `SELECT USER_TARGET_RESULTS.*, COURSES.title AS course_title
         FROM USER_TARGET_RESULTS
         LEFT JOIN COURSES ON COURSES.id = USER_TARGET_RESULTS.course_id
         WHERE USER_TARGET_RESULTS.id=?`,
        [id],
    )
        .then((result) => (result.length > 0 ? result[0] : false))
        .catch((error) => {
            logger.error(`getTargetResultById: ${error}`);
            return false;
        });
}

function addTargetResult({ user_id, course_id, target_percentage, created_by = null }) {
    return executeSQLQueryParameterized(
        `INSERT INTO USER_TARGET_RESULTS (user_id, course_id, target_percentage, created_by) VALUES (?, ?, ?, ?)`,
        [user_id, course_id, target_percentage, created_by],
    )
        .then((result) => getTargetResultById({ id: result.insertId }))
        .catch((error) => {
            logger.error(`addTargetResult: ${error}`);
            throw error;
        });
}

function updateTargetResultById({ id, course_id, target_percentage }) {
    return executeSQLQueryParameterized(`UPDATE USER_TARGET_RESULTS SET course_id=?, target_percentage=? WHERE id=?`, [
        course_id,
        target_percentage,
        id,
    ])
        .then(() => getTargetResultById({ id }))
        .catch((error) => {
            logger.error(`updateTargetResultById: ${error}`);
            throw error;
        });
}

function deleteTargetResultById({ id }) {
    return executeSQLQueryParameterized(`DELETE FROM USER_TARGET_RESULTS WHERE id=?`, [id]).catch((error) => {
        logger.error(`deleteTargetResultById: ${error}`);
        throw error;
    });
}

module.exports = {
    getCareerInterestByUserId,
    getCareerInterestsByUserIds,
    upsertCareerInterestByUserId,
    getTargetResultsByUserId,
    getTargetResultsByUserIds,
    getTargetResultById,
    addTargetResult,
    updateTargetResultById,
    deleteTargetResultById,
};
