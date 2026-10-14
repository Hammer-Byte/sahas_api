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

const router = libExpress.Router();

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

    if (sendChannel.type === "email") {
        requestService({
            requestServiceName: process.env.SERVICE_MAILER,
            onRequestStart: () => logger.info("Generating OTP"),
            requestMethod: "POST",
            parseResponseBody: false,
            requestPostBody: {
                to: sendChannel.to,
                subject: "Verification OTP",
                template: "otp",
                injects: { otp, otp_validity, user_email: sendChannel.userEmail },
            },
            onResponseReceieved: (_, responseCode) => {
                if (responseCode === 201) {
                    res.status(201).json({ authentication_token });
                } else {
                    logger.error(`Failed To Generate OTP - Mailer Responded With ${responseCode}`);
                    res.status(500).json({ error: "Something Seems to be Broken , Please Try Again Later" });
                }
            },
        });
    } else {
        requestService({
            requestServiceName: process.env.SERVICE_MAILER,
            requestPath: "/sms",
            onRequestStart: () => logger.info("Generating SMS OTP"),
            requestMethod: "POST",
            parseResponseBody: false,
            requestPostBody: {
                to: sendChannel.to,
                otp,
            },
            onResponseReceieved: (_, responseCode) => {
                if (responseCode === 201) {
                    res.status(201).json({ authentication_token });
                } else {
                    logger.error(`Failed To Generate SMS OTP - Mailer Responded With ${responseCode}`);
                    res.status(500).json({ error: "Something Seems to be Broken , Please Try Again Later" });
                }
            },
            onRequestFailure: (error) => {
                logger.error(`Failed To Generate SMS OTP - ${error}`);
                res.status(500).json({ error: "Something Seems to be Broken , Please Try Again Later" });
            },
        });
    }
});

router.get("/", async (req, res) => {
    if ((user = req?.user)) {
        await populateRolesAndAuthorities(user);
        return res.status(200).json(user);
    }
    return res.status(401).json({ error: "Invalid Token" });
});

module.exports = router;
