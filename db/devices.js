const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

function addActiveUserDevice(userId, fingerPrint) {
    return executeSQLQueryParameterized(`INSERT INTO  USER_DEVICES(user_id,finger_print,active)  VALUES (?,?,TRUE)`, [userId, fingerPrint]).catch((error) => {
        logger.error(`addActiveUserDevice: ${error}`);
        return false;
    });
}

function userDeviceExist(userId, fingerPrint) {
    return executeSQLQueryParameterized(`SELECT COUNT(*) AS count FROM USER_DEVICES WHERE user_id = ? AND finger_print=? `, [userId, fingerPrint])
        .then(([result]) => result.count > 0)
        .catch((error) => {
            logger.error(`userDeviceExist: ${error}`);
            return false;
        });
}

function getActiveDevicesByUserId(userId) {
    return executeSQLQueryParameterized(`SELECT * FROM USER_DEVICES WHERE user_id=? AND active=TRUE`, [userId])
        .then((result) => (result.length ? result : false))
        .catch((error) => logger.error(`getActiveDevicesByUserId: ${error}`));
}

function getDevicesByUserId({ user_id }) {
    return executeSQLQueryParameterized(`SELECT * FROM USER_DEVICES WHERE user_id=? ORDER BY created_on DESC`, [user_id])
        .then((result) => (result.length ? result : false))
        .catch((error) => logger.error(`getDevicesByUserId: ${error}`));
}

function addInActiveUserDevice(userId, fingerPrint) {
    return executeSQLQueryParameterized(`INSERT  INTO USER_DEVICES(user_id,finger_print,active)  VALUES (?,?,FALSE)`, [userId, fingerPrint]).catch((error) => {
        logger.error(`addInActiveUserDevice: ${error}`);
        return false;
    });
}

function updateUserDeviceStatusById({ id, active }) {
    return executeSQLQueryParameterized(`UPDATE USER_DEVICES SET active=? WHERE id=?`, [active, id]).catch((error) =>
        logger.error(`updateUserDeviceStatusById: ${error}`)
    );
}

function getUserDeviceById({ id }) {
    return executeSQLQueryParameterized(`SELECT * FROM USER_DEVICES  WHERE id=?`, [id])
        .then((result) => (result.length ? result[0] : false))
        .catch((error) => logger.error(`updateUserDeviceStatusById: ${error}`));
}

function getUserDeviceByUserIdAndFingerPrint({ user_id, finger_print }) {
    return executeSQLQueryParameterized(`SELECT * FROM USER_DEVICES WHERE user_id=? AND finger_print=?`, [user_id, finger_print])
        .then((result) => (result.length ? result[0] : false))
        .catch((error) => logger.error(`getUserDeviceByUserIdAndFingerPrint: ${error}`));
}

module.exports = {
    addActiveUserDevice,
    userDeviceExist,
    addInActiveUserDevice,
    getActiveDevicesByUserId,
    getDevicesByUserId,
    updateUserDeviceStatusById,
    getUserDeviceById,
    getUserDeviceByUserIdAndFingerPrint,
};
