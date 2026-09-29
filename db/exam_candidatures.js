const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

function getExamCandidatureByUserIdAndExamId({ user_id, exam_id }) {
    return executeSQLQueryParameterized(`SELECT * FROM EXAM_CANDIDATURE WHERE user_id = ? AND exam_id = ?`, [user_id, exam_id])
        .then((result) => (result.length > 0 ? result[0] : false))
        .catch((error) => logger.error(`getExamCandidatureByUserIdAndExamId: ${error}`));
}

function addExamCandidature({ user_id, exam_id, identity, selfie }) {
    return executeSQLQueryParameterized(`INSERT INTO EXAM_CANDIDATURE (user_id, exam_id, identity, selfie) VALUES (?,?,?,?)`, [
        user_id,
        exam_id,
        identity,
        selfie,
    ])
        .then((result) => result.insertId)
        .catch((error) => logger.error(`addExamCandidature: ${error}`));
}

function updateExamCandidatureByUserIdAndExamId({ user_id, exam_id, identity, selfie }) {
    return executeSQLQueryParameterized(`UPDATE EXAM_CANDIDATURE SET identity = ?, selfie = ? WHERE user_id = ? AND exam_id = ?`, [
        identity,
        selfie,
        user_id,
        exam_id,
    ])
        .then((result) => result.affectedRows > 0)
        .catch((error) => logger.error(`updateExamCandidatureByUserIdAndExamId: ${error}`));
}

function incrementExamInterruptions({ user_id, exam_id }) {
    return executeSQLQueryParameterized(
        `UPDATE EXAM_CANDIDATURE SET interruptions = interruptions + 1 WHERE user_id = ? AND exam_id = ?`,
        [user_id, exam_id],
    )
        .then(async (result) => {
            if (!result?.affectedRows) return false;
            const candidature = await getExamCandidatureByUserIdAndExamId({ user_id, exam_id });
            return candidature ? Number(candidature.interruptions) || 0 : false;
        })
        .catch((error) => logger.error(`incrementExamInterruptions: ${error}`));
}

function getExamCandidaturesByUserIdAndExamSeriesId({ user_id, exam_series_id }) {
    return executeSQLQueryParameterized(
        `SELECT EXAM_CANDIDATURE.*
         FROM EXAM_CANDIDATURE
         INNER JOIN EXAMS ON EXAMS.id = EXAM_CANDIDATURE.exam_id
         WHERE EXAM_CANDIDATURE.user_id = ? AND EXAMS.exam_series_id = ?`,
        [user_id, exam_series_id],
    ).catch((error) => {
        logger.error(`getExamCandidaturesByUserIdAndExamSeriesId: ${error}`);
        return [];
    });
}

module.exports = {
    getExamCandidatureByUserIdAndExamId,
    addExamCandidature,
    updateExamCandidatureByUserIdAndExamId,
    incrementExamInterruptions,
    getExamCandidaturesByUserIdAndExamSeriesId,
};
