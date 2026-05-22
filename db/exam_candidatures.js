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

module.exports = {
    getExamCandidatureByUserIdAndExamId,
    addExamCandidature,
};
