const libExpress = require("express");
const { requestService } = require("sahas_utils");

const {
    getUserByEmail,
    getUserByGuardianEmail,
    getUserByPhone,
    addUserByEmail,
    addUserByPhone,
    getUserById,
    getAuthoritiesByRoleIds,
} = require("../db/users");
const libValidator = require("validator");
const { generateToken, normalizeIndianPhone, toMsg91Mobile } = require("../utils");
const { addInactiveToken, getTokenByOTP, activateToken } = require("../db/authentication_tokens");
const { getConfigByKey } = require("../db/configs");
const { logger } = require("sahas_utils");
const { getUserRolesByUserId } = require("../db/user_roles");
const { getUpcomingExamByUserId } = require("../db/exams");
const { getUnseenCountByUserId } = require("../db/notifications");
const { recordActivity } = require("../libs/activities");

const router = libExpress.Router();

function accountEmail(user) {
    for (const value of [user?.email, user?.guardian_email]) {
        if (value == null) continue;
        const normalized = String(value).trim().toLowerCase();
        if (libValidator.isEmail(normalized)) return normalized;
    }
    return null;
}

function smsRecipientForUser(user) {
    if (user?.phone == null || String(user.phone).trim() === "") return null;
    const { phone, error } = normalizeIndianPhone(user.phone);
    if (error) return null;
    return toMsg91Mobile(phone);
}

async function postMailer({ requestPath = "/", body, startMessage }) {
    let responseCode = 500;
    await requestService({
        requestServiceName: process.env.SERVICE_MAILER,
        requestPath,
        onRequestStart: () => logger.info(startMessage),
        requestMethod: "POST",
        parseResponseBody: false,
        requestPostBody: body,
        onResponseReceieved: (_, code) => {
            responseCode = code;
        },
        onRequestFailure: (error) => {
            logger.error(`${startMessage} - ${error}`);
            responseCode = 500;
        },
    });
    return responseCode;
}

//work on blocked user #2
//once receieved the info on UI save into reudx
//check what fields need to be sent
//logout with invalidate call from front end
//if user already has the token then validate from ui side

async function populateRolesAndAuthorities(user) {
    const userRoles = await getUserRolesByUserId({ user_id: user.id });
    const authorities = await getAuthoritiesByRoleIds(userRoles.map(({ role_id }) => role_id).join(","));
    user.roles = userRoles?.map(({ title }) => title);
    user.authorities = authorities?.map((authority) => authority.title);
    user.upcoming_exam = (await getUpcomingExamByUserId({ user_id: user.id })) || null;
    user.unseen_notification_count = await getUnseenCountByUserId({ user_id: user.id });
}

router.patch("/", async (req, res) => {
    if (!req.body.otp || !req.body.authentication_token) {
        return res.status(400).json({ error: "Missing Required Parameters - OTP or Token" });
    }

    if ((authenticationToken = await getTokenByOTP(req.body.authentication_token, req.body.otp))) {
        activateToken(req.body.authentication_token);
        const user = await getUserById({ id: authenticationToken.user_id });
        await populateRolesAndAuthorities(user);
        await recordActivity({ user_id: user.id, key: "LOGIN" });

        return res.status(200).json(user);
    }
    return res.status(400).json({ error: "Invalid Token" });
});

router.post("/", async (req, res) => {
    const token_validity = Number(await getConfigByKey("auth_token_validity"));
    const otp_validity = Number(await getConfigByKey("auth_otp_validity"));

    if (!token_validity || !otp_validity) {
        return res.status(500).json({ error: "Missing Configuration token_validity or otp_validity" });
    }

    const hasEmail = req.body.email != null && String(req.body.email).trim() !== "";
    const hasPhone = req.body.phone != null && String(req.body.phone).trim() !== "";

    if (hasEmail === hasPhone) {
        return res.status(400).json({ error: "Provide exactly one of email or phone" });
    }

    let user;
    let sendChannel;

    if (hasEmail) {
        if (!libValidator.isEmail(String(req.body.email))) {
            return res.status(400).json({ error: "Missing or Invalid Email" });
        }

        const normalizedEmail = String(req.body.email).toLowerCase().trim();

        user = await getUserByEmail({ email: normalizedEmail });
        if (!user) {
            user = await getUserByGuardianEmail({ guardian_email: normalizedEmail });
        }
        if (!user) {
            await addUserByEmail({ email: normalizedEmail });
            user = await getUserByEmail({ email: normalizedEmail });
        }

        sendChannel = { type: "email", to: normalizedEmail, userEmail: user?.email || normalizedEmail };
    } else {
        const { phone, error } = normalizeIndianPhone(req.body.phone);
        if (error) {
            return res.status(400).json({ error });
        }

        user = await getUserByPhone({ phone });
        if (!user) {
            await addUserByPhone({ phone });
            user = await getUserByPhone({ phone });
        }

        sendChannel = { type: "sms", to: toMsg91Mobile(phone) };
    }

    if (!user) {
        return res.status(500).json({ error: "Something Seems to be Broken , Please Try Again Later" });
    }

    const otp = Math.floor(1000 + Math.random() * 9000);
    const authentication_token = generateToken();
    logger.info("Generated Inactive Token");
    await addInactiveToken({
        user_id: user.id,
        otp,
        token: authentication_token,
        validity: new Date(Date.now() + token_validity * 24 * 60 * 60 * 1000),
    });

    const emailRecipient = sendChannel.type === "email" ? sendChannel.to : accountEmail(user);
    const smsRecipient = sendChannel.type === "sms" ? sendChannel.to : smsRecipientForUser(user);
    const deliveries = [];

    if (smsRecipient) {
        deliveries.push(
            postMailer({
                requestPath: "/sms",
                body: { to: smsRecipient, otp },
                startMessage: "Generating SMS OTP",
            }).then((code) => ({ channel: "sms", code })),
        );
    }

    if (emailRecipient) {
        deliveries.push(
            postMailer({
                body: {
                    to: emailRecipient,
                    subject: "Verification OTP",
                    template: "otp",
                    injects: { otp, otp_validity, user_email: sendChannel.userEmail || emailRecipient },
                },
                startMessage: "Generating OTP",
            }).then((code) => ({ channel: "email", code })),
        );
    }

    if (!deliveries.length) {
        logger.error("Failed To Generate OTP - no phone or email to deliver");
        return res.status(500).json({ error: "Something Seems to be Broken , Please Try Again Later" });
    }

    const results = await Promise.all(deliveries);
    for (const result of results) {
        if (result.code !== 201) {
            logger.error(`Failed To Generate OTP via ${result.channel} - Mailer Responded With ${result.code}`);
        }
    }

    const primaryOk = results.some((result) => result.channel === sendChannel.type && result.code === 201);
    if (!primaryOk) {
        return res.status(500).json({ error: "Something Seems to be Broken , Please Try Again Later" });
    }

    return res.status(201).json({ authentication_token });
});

router.get("/", async (req, res) => {
    if ((user = req?.user)) {
        await populateRolesAndAuthorities(user);
        return res.status(200).json(user);
    }
    return res.status(401).json({ error: "Invalid Token" });
});

module.exports = router;
