const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");

function getNotificationTypes() {
    return executeSQLQueryParameterized("SELECT id, title, color FROM NOTIFICATION_TYPES ORDER BY id ASC").catch((error) => {
        logger.error(`getNotificationTypes: ${error}`);
        return [];
    });
}

function addNotification({ user_id, title, description = null, type_id, created_by = null }) {
    return executeSQLQueryParameterized("INSERT INTO NOTIFICATIONS (user_id, title, description, type_id, created_by) VALUES (?,?,?,?,?)", [
        user_id,
        title,
        description,
        type_id,
        created_by,
    ])
        .then((result) => result.insertId)
        .catch((error) => {
            logger.error(`addNotification: ${error}`);
            throw error;
        });
}

function addNotificationAttachments({ notification_id, attachments = [] }) {
    if (!attachments?.length) {
        return Promise.resolve();
    }
    const placeholders = attachments.map(() => "(?,?)").join(",");
    const parameters = [];
    for (const attachment of attachments) {
        parameters.push(notification_id, attachment);
    }
    return executeSQLQueryParameterized(`INSERT INTO NOTIFICATION_ATTACHMENTS (notification_id, attachment) VALUES ${placeholders}`, parameters).catch(
        (error) => {
            logger.error(`addNotificationAttachments: ${error}`);
            throw error;
        },
    );
}

function getNotificationAttachmentsByNotificationIds({ notification_ids }) {
    if (!notification_ids?.length) {
        return Promise.resolve([]);
    }
    const placeholders = notification_ids.map(() => "?").join(",");
    return executeSQLQueryParameterized(
        `SELECT id, notification_id, attachment FROM NOTIFICATION_ATTACHMENTS WHERE notification_id IN (${placeholders}) ORDER BY id ASC`,
        notification_ids,
    ).catch((error) => {
        logger.error(`getNotificationAttachmentsByNotificationIds: ${error}`);
        return [];
    });
}

async function getNotificationsByUserId({ user_id }) {
    const notifications = await executeSQLQueryParameterized(
        `SELECT NOTIFICATIONS.*,
                NOTIFICATION_TYPES.title AS type_title,
                NOTIFICATION_TYPES.color AS type_color
         FROM NOTIFICATIONS
         LEFT JOIN NOTIFICATION_TYPES ON NOTIFICATIONS.type_id = NOTIFICATION_TYPES.id
         WHERE NOTIFICATIONS.user_id = ?
         ORDER BY NOTIFICATIONS.id DESC`,
        [user_id],
    ).catch((error) => {
        logger.error(`getNotificationsByUserId: ${error}`);
        return [];
    });

    if (!notifications.length) {
        return [];
    }

    const attachments = await getNotificationAttachmentsByNotificationIds({
        notification_ids: notifications.map((notification) => notification.id),
    });

    const attachmentsByNotificationId = attachments.reduce((acc, row) => {
        if (!acc[row.notification_id]) {
            acc[row.notification_id] = [];
        }
        acc[row.notification_id].push({ id: row.id, attachment: row.attachment });
        return acc;
    }, {});

    return notifications.map((notification) => ({
        ...notification,
        attachments: attachmentsByNotificationId[notification.id] || [],
    }));
}

function getUnseenCountByUserId({ user_id }) {
    return executeSQLQueryParameterized("SELECT COUNT(*) AS count FROM NOTIFICATIONS WHERE user_id = ? AND seen = 0", [user_id])
        .then((result) => Number(result?.[0]?.count) || 0)
        .catch((error) => {
            logger.error(`getUnseenCountByUserId: ${error}`);
            return 0;
        });
}

function markAllSeenByUserId({ user_id }) {
    return executeSQLQueryParameterized("UPDATE NOTIFICATIONS SET seen = 1 WHERE user_id = ? AND seen = 0", [user_id]).catch((error) => {
        logger.error(`markAllSeenByUserId: ${error}`);
    });
}

module.exports = {
    getNotificationTypes,
    addNotification,
    addNotificationAttachments,
    getNotificationsByUserId,
    getUnseenCountByUserId,
    markAllSeenByUserId,
};
