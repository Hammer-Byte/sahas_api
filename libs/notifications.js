const { requestService, logger } = require("sahas_utils");
const { getUserById } = require("../db/users");
const { addNotification, addNotificationAttachments, getNotificationTypes } = require("../db/notifications");

let noticeTypeIdCache = null;

async function getNoticeTypeId() {
    if (noticeTypeIdCache) {
        return noticeTypeIdCache;
    }
    const types = await getNotificationTypes();
    const notice = types.find((type) => type.title === "Notice");
    noticeTypeIdCache = notice?.id || 1;
    return noticeTypeIdCache;
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
    createNotification,
    createNotificationsForUsers,
};
