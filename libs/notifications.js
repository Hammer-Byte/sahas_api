const { requestService, logger } = require("sahas_utils");
const { getUserById } = require("../db/users");
const { addNotification, addNotificationAttachments, getNotificationTypes } = require("../db/notifications");
const { getBatchUserIds } = require("../db/batches");

const typeIdCache = {};

async function getNotificationTypeIdByTitle(title = "Notice") {
    if (typeIdCache[title]) {
        return typeIdCache[title];
    }
    const types = await getNotificationTypes();
    const match = types.find((type) => type.title === title);
    typeIdCache[title] = match?.id || types.find((type) => type.title === "Notice")?.id || 1;
    return typeIdCache[title];
}

async function getNoticeTypeId() {
    return getNotificationTypeIdByTitle("Notice");
}

async function getAlertTypeId() {
    return getNotificationTypeIdByTitle("Alert");
}

async function getWarningTypeId() {
    return getNotificationTypeIdByTitle("Warning");
}

async function getUserIdsForBatchIds(batch_ids = []) {
    const seen = new Set();
    for (const batch_id of batch_ids) {
        const user_ids = await getBatchUserIds({ batch_id });
        for (const user_id of user_ids) {
            seen.add(Number(user_id));
        }
    }
    return [...seen].filter(Boolean);
}

async function createNotification({ user_id, title, description = null, type_id = null, created_by = null, attachments = [] }) {
    try {
        const resolvedTypeId = type_id || (await getNoticeTypeId());
        const notificationId = await addNotification({
            user_id,
            title,
            description,
            type_id: resolvedTypeId,
            created_by,
        });

        if (attachments?.length) {
            await addNotificationAttachments({ notification_id: notificationId, attachments });
        }

        const user = await getUserById({ id: user_id });
        if (user?.email) {
            const frontendUrl = (process.env.FRONTEND_URL || "").replace(/\/$/, "");
            const notifications_url = `${frontendUrl}/manage-users/${user_id}/notifications`;

            await requestService({
                requestServiceName: process.env.SERVICE_MAILER,
                onRequestStart: () => logger.info(`Sending notification email to ${user.email}`),
                requestMethod: "POST",
                parseResponseBody: false,
                requestPostBody: {
                    to: user.email,
                    subject: title,
                    template: "notification",
                    injects: {
                        user_name: user.full_name || user.email,
                        title,
                        notifications_url,
                    },
                },
                onResponseReceieved: (_, responseCode) => {
                    if (responseCode !== 201) {
                        logger.error(`Failed to send notification email to ${user.email}: ${responseCode}`);
                    }
                },
            });
        }

        return notificationId;
    } catch (error) {
        logger.error(`createNotification: ${error}`);
        return null;
    }
}

async function createNotificationsForUsers({ user_ids = [], title, description = null, type_id = null, created_by = null, attachments = [] }) {
    const uniqueUserIds = [...new Set(user_ids.map(Number).filter(Boolean))];
    for (const user_id of uniqueUserIds) {
        await createNotification({ user_id, title, description, type_id, created_by, attachments });
    }
}

module.exports = {
    getNoticeTypeId,
    getAlertTypeId,
    getWarningTypeId,
    getNotificationTypeIdByTitle,
    getUserIdsForBatchIds,
    createNotification,
    createNotificationsForUsers,
};
