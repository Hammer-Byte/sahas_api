const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

function addDeviceChangeRequest({ user_id, device_id }) {
    return executeSQLQueryParameterized(
        `INSERT INTO USER_DEVICE_CHANGE_REQUESTS(user_id, device_id)
         SELECT ?, ?
         WHERE NOT EXISTS (
             SELECT 1 FROM USER_DEVICE_CHANGE_REQUESTS
             WHERE user_id=? AND device_id=? AND status='PENDING'
         )`,
        [user_id, device_id, user_id, device_id],
    )
        .then((result) => (result.affectedRows ? result.insertId : false))
        .catch((error) => {
            logger.error(`addDeviceChangeRequest: ${error}`);
            return false;
        });
}

function getPendingDeviceChangeRequestByUserIdAndDeviceId({ user_id, device_id }) {
    return executeSQLQueryParameterized(
        `SELECT * FROM USER_DEVICE_CHANGE_REQUESTS WHERE user_id=? AND device_id=? AND status='PENDING' ORDER BY id DESC LIMIT 1`,
        [user_id, device_id],
    )
        .then((result) => (result.length ? result[0] : false))
        .catch((error) => {
            logger.error(`getPendingDeviceChangeRequestByUserIdAndDeviceId: ${error}`);
            return false;
        });
}

function getPendingDeviceChangeRequests() {
    return executeSQLQueryParameterized(
        `SELECT REQUESTS.id, REQUESTS.user_id, REQUESTS.device_id, REQUESTS.status, REQUESTS.requested_on,
                USERS.full_name, USERS.email, USERS.phone, DEVICES.finger_print
         FROM USER_DEVICE_CHANGE_REQUESTS REQUESTS
         INNER JOIN USERS ON USERS.id=REQUESTS.user_id
         INNER JOIN USER_DEVICES DEVICES ON DEVICES.id=REQUESTS.device_id
         WHERE REQUESTS.status='PENDING'
         ORDER BY REQUESTS.requested_on ASC`,
    ).catch((error) => {
        logger.error(`getPendingDeviceChangeRequests: ${error}`);
        return [];
    });
}

function getDeviceChangeRequestById({ id }) {
    return executeSQLQueryParameterized(
        `SELECT REQUESTS.*, USERS.full_name, USERS.email, USERS.phone, DEVICES.finger_print
         FROM USER_DEVICE_CHANGE_REQUESTS REQUESTS
         INNER JOIN USERS ON USERS.id=REQUESTS.user_id
         INNER JOIN USER_DEVICES DEVICES ON DEVICES.id=REQUESTS.device_id
         WHERE REQUESTS.id=?`,
        [id],
    )
        .then((result) => (result.length ? result[0] : false))
        .catch((error) => {
            logger.error(`getDeviceChangeRequestById: ${error}`);
            return false;
        });
}

function updateDeviceChangeRequestStatusById({ id, status, reviewed_by }) {
    return executeSQLQueryParameterized(
        `UPDATE USER_DEVICE_CHANGE_REQUESTS REQUESTS
         INNER JOIN USER_DEVICES DEVICES ON DEVICES.id=REQUESTS.device_id
         SET REQUESTS.status=?, REQUESTS.reviewed_by=?, REQUESTS.reviewed_on=NOW(),
             DEVICES.active=IF(?='APPROVED', TRUE, DEVICES.active)
         WHERE REQUESTS.id=? AND REQUESTS.status='PENDING'`,
        [status, reviewed_by, status, id],
    )
        .then((result) => result.affectedRows > 0)
        .catch((error) => {
            logger.error(`updateDeviceChangeRequestStatusById: ${error}`);
            return false;
        });
}

module.exports = {
    addDeviceChangeRequest,
    getPendingDeviceChangeRequestByUserIdAndDeviceId,
    getPendingDeviceChangeRequests,
    getDeviceChangeRequestById,
    updateDeviceChangeRequestStatusById,
};
