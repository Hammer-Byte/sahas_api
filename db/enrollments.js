const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

//freeze
function getEnrollmentsByUserId({ user_id }) {
    return executeSQLQueryParameterized(
        "SELECT ENROLLMENTS.*,USERS.full_name AS created_by_full_name FROM ENROLLMENTS LEFT JOIN USERS ON ENROLLMENTS.created_by=USERS.id WHERE ENROLLMENTS.user_id=? ORDER BY id DESC",
        [user_id],
    ).catch((error) => {
        logger.error(`getEnrollmentsByUserId: ${error}`);
        return [];
    });
}

//freeze
function getEnrollmentsAmountByEnrollmentIds({ enrollment_ids }) {
    return executeSQLQueryParameterized(`SELECT SUM(amount) as total FROM ENROLLMENTS where id in (${enrollment_ids.join(",")})`)
        .then((results) => (results.length > 0 ? Number(results[0]?.total) : 0))
        .catch((error) => {
            logger.error(`getEnrollmentsByUserId: ${error}`);
            return [];
        });
}

//freeze
function updateEnrollmentById({ id, amount, start_date, end_date, on_site_access = false, digital_access = false, note = null }) {
    return executeSQLQueryParameterized("UPDATE ENROLLMENTS SET amount=?,start_date=?,end_date=?,on_site_access=?,digital_access=?,note=? WHERE id=?", [
        amount,
        start_date,
        end_date,
        on_site_access,
        digital_access,
        note,
        id,
    ]).catch((error) => logger.error(`updateEnrollmentById: ${error}`));
}

//freeze
function getEnrollmentById({ id }) {
    return executeSQLQueryParameterized(
        "SELECT ENROLLMENTS.*,USERS.full_name AS created_by_full_name FROM ENROLLMENTS LEFT JOIN USERS ON ENROLLMENTS.created_by=USERS.id WHERE ENROLLMENTS.id=?",
        [id],
    )
        .then((results) => (results.length > 0 ? results[0] : null))
        .catch((error) => logger.error(`getEnrollmentById: ${error}`));
}

//freeze
function deleteEnrollmentById({ id }) {
    return executeSQLQueryParameterized("DELETE FROM ENROLLMENTS WHERE id=?", [id]).catch((error) => logger.error(`deleteEnrollmentById: ${error}`));
}

//freeze
function addEnrollment({
    user_id,
    start_date,
    end_date,
    amount,
    on_site_access = false,
    digital_access = false,
    created_by,
    handler = "SAHAS INSTITUTE PVT LTD",
    note = null,
}) {
    return executeSQLQueryParameterized(
        "INSERT INTO ENROLLMENTS(user_id,start_date,end_date,amount,on_site_access,digital_access,created_by,handler,note) VALUES(?,?,?,?,?,?,?,?,?)",
        [user_id, start_date, end_date, amount, on_site_access, digital_access, created_by, handler, note],
    )
        .then((result) => result.insertId)
        .catch((error) => logger.error(`addEnrollment: ${error}`));
}

//freeze
function getEnrollmentByCourseIdAndUserId({ user_id, course_id }) {
    return executeSQLQueryParameterized(
        "SELECT ENROLLMENTS.* FROM ENROLLMENTS LEFT JOIN ENROLLMENT_COURSES ON ENROLLMENTS.id=ENROLLMENT_COURSES.enrollment_id WHERE ENROLLMENTS.user_id=? AND ENROLLMENT_COURSES.course_id=?  AND ENROLLMENTS.end_date >= NOW()",
        [user_id, course_id],
    )
        .then((results) => (results.length > 0 ? results[0] : null))
        .catch((error) => logger.error(`getEnrollmentByCourseIdAndUserId: ${error}`));
}

function getActiveUserIdsBySubjectId({ subject_id }) {
    return executeSQLQueryParameterized(
        `SELECT DISTINCT e.user_id
         FROM COURSE_SUBJECTS cs
         JOIN ENROLLMENT_COURSES ec ON ec.course_id = cs.course_id
         JOIN ENROLLMENTS e ON e.id = ec.enrollment_id
         WHERE cs.subject_id = ?
           AND e.end_date >= NOW()`,
        [subject_id],
    )
        .then((results) => results.map((row) => row.user_id))
        .catch((error) => {
            logger.error(`getActiveUserIdsBySubjectId: ${error}`);
            return [];
        });
}

module.exports = {
    getEnrollmentsByUserId,
    getEnrollmentsAmountByEnrollmentIds,
    updateEnrollmentById,
    getEnrollmentById,
    addEnrollment,
    getEnrollmentByCourseIdAndUserId,
    getActiveUserIdsBySubjectId,
    deleteEnrollmentById,
};
