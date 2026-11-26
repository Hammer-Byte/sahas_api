const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

//tested
function addUserHistory({ user_id, institute = null, course = null, course_exam_seat = null, pnr_gr_number = null, refered_by = null }) {
    return executeSQLQueryParameterized(
        `INSERT INTO USER_HISTORY (user_id, institute, course, course_exam_seat, pnr_gr_number, refered_by) VALUES (?,?,?,?,?,?)`,
        [user_id, institute, course, course_exam_seat, pnr_gr_number, refered_by],
    ).catch((error) => logger.error(`addUserHistory: ${error}`));
}

function getUserHistoryById({ user_id }) {
    return executeSQLQueryParameterized(`SELECT * FROM USER_HISTORY WHERE user_id=?`, [user_id])
        .then((result) => (result.length > 0 ? result[0] : false))
        .catch((error) => logger.error(`getUserHistoryById: ${error}`));
}

function updateUserHistoryById({ id, institute = null, course = null, pnr_gr_number = null, refered_by = null }) {
    return executeSQLQueryParameterized(`UPDATE USER_HISTORY SET institute=?, course=?, pnr_gr_number=?, refered_by=? WHERE id=?`, [
        institute,
        course,
        pnr_gr_number,
        refered_by,
        id,
    ]).catch((error) => logger.error(`updateUserHistory: ${error}`));
}

async function upsertUserEnrollmentHistory({ user_id, institute = null, course = null }) {
    const existing = await getUserHistoryById({ user_id });
    if (existing?.id) {
        return executeSQLQueryParameterized(`UPDATE USER_HISTORY SET institute=?, course=? WHERE id=?`, [institute, course, existing.id]).catch(
            (error) => logger.error(`upsertUserEnrollmentHistory update: ${error}`),
        );
    }

    return executeSQLQueryParameterized(`INSERT INTO USER_HISTORY (user_id, institute, course) VALUES (?,?,?)`, [
        user_id,
        institute,
        course,
    ]).catch((error) => logger.error(`upsertUserEnrollmentHistory insert: ${error}`));
}

module.exports = {
    addUserHistory,
    getUserHistoryById,
    updateUserHistoryById,
    upsertUserEnrollmentHistory,
};
