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
    if (active) {
        return executeSQLQueryParameterized(`UPDATE USER_DEVICES SET active=?, change_request_pending=FALSE WHERE id=?`, [active, id]).catch((error) =>
            logger.error(`updateUserDeviceStatusById: ${error}`),
        );
    }

    return executeSQLQueryParameterized(`UPDATE USER_DEVICES SET active=? WHERE id=?`, [active, id]).catch((error) =>
        logger.error(`updateUserDeviceStatusById: ${error}`)
    );
}

function getUserDeviceById({ id }) {
    return executeSQLQueryParameterized(`SELECT * FROM USER_DEVICES  WHERE id=?`, [id])
        .then((result) => (result.length ? result[0] : false))
        .catch((error) => logger.error(`getUserDeviceById: ${error}`));
}

function getUserDeviceByUserIdAndFingerPrint({ user_id, finger_print }) {
    return executeSQLQueryParameterized(`SELECT * FROM USER_DEVICES WHERE user_id=? AND finger_print=?`, [user_id, finger_print])
        .then((result) => (result.length ? result[0] : false))
        .catch((error) => logger.error(`getUserDeviceByUserIdAndFingerPrint: ${error}`));
}

function deactivateOtherUserDevices({ user_id, finger_print }) {
    return executeSQLQueryParameterized(`UPDATE USER_DEVICES SET active=FALSE WHERE user_id=? AND finger_print!=?`, [user_id, finger_print]).catch((error) =>
        logger.error(`deactivateOtherUserDevices: ${error}`),
    );
}

function getPendingDeviceChangeRequests() {
    return executeSQLQueryParameterized(
        `SELECT USER_DEVICES.*, USERS.email, USERS.full_name, USERS.phone
        FROM USER_DEVICES
        LEFT JOIN USERS ON USER_DEVICES.user_id = USERS.id
        WHERE USER_DEVICES.change_request_pending=TRUE AND USER_DEVICES.active=FALSE
        ORDER BY USER_DEVICES.id DESC`,
    ).catch((error) => {
        logger.error(`getPendingDeviceChangeRequests: ${error}`);
        return [];
    });
}

async function raiseDeviceChangeRequest({ user_id, finger_print }) {
    let device = await getUserDeviceByUserIdAndFingerPrint({ user_id, finger_print });

    if (!device) {
        await addInActiveUserDevice(user_id, finger_print);
        device = await getUserDeviceByUserIdAndFingerPrint({ user_id, finger_print });
    }

    if (!device) {
        return false;
    }

    if (device.active) {
        return { error: "Device Is Already Active" };
    }

    if (device.change_request_pending) {
        return { error: "Device Change Request Already Pending" };
    }

    await executeSQLQueryParameterized(`UPDATE USER_DEVICES SET change_request_pending=TRUE WHERE id=?`, [device.id]);

    return getUserDeviceById({ id: device.id });
}

async function reviewDeviceChangeRequest({ id, status }) {
    const device = await getUserDeviceById({ id });

    if (!device || !device.change_request_pending || device.active) {
        return false;
    }

    if (status === "APPROVED") {
        await deactivateOtherUserDevices({ user_id: device.user_id, finger_print: device.finger_print });
        await executeSQLQueryParameterized(`UPDATE USER_DEVICES SET active=TRUE, change_request_pending=FALSE WHERE id=?`, [id]);
    } else {
        await executeSQLQueryParameterized(`UPDATE USER_DEVICES SET change_request_pending=FALSE WHERE id=?`, [id]);
    }

    return getUserDeviceById({ id });
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
    deactivateOtherUserDevices,
    getPendingDeviceChangeRequests,
    raiseDeviceChangeRequest,
    reviewDeviceChangeRequest,
};
