const libExpress = require("express");
const { requestService } = require("sahas_utils");

const { getUserByEmail, addUserByEmail, getUserById, getAuthoritiesByRoleIds } = require("../db/users");
const libValidator = require("validator");
const { generateToken } = require("../utils");
const { addInactiveToken, getTokenByOTP, activateToken } = require("../db/authentication_tokens");
const { readConfig } = require("../libs/config");
const { logger, validateRequestBody } = require("sahas_utils");
const { getUserRolesByUserId } = require("../db/user_roles");

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
    const { authentication: { token_validity, otp_validity } = {} } = await readConfig("app");

    if (!token_validity || !otp_validity) {
        return res.status(500).json({ error: "Missing Configuration token_validity or otp_validity" });
    }

    const requiredBodyFields = ["email"];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (isRequestBodyValid) {
        if (!libValidator.isEmail(validatedRequestBody.email)) {
            return res.status(400).json({ error: "Missing or Invalid Email" });
        }

        //Get The user
        await addUserByEmail({ email: validatedRequestBody.email.toLowerCase() });

        const user = await getUserByEmail({ email: validatedRequestBody.email.toLowerCase() });

        //generate an otp and token
        const otp = Math.floor(1000 + Math.random() * 9000);
        const authentication_token = generateToken();
        //add token into table
        logger.info("Generated Inactive Token");
        await addInactiveToken({ user_id: user.id, otp, token: authentication_token, validity: new Date(Date.now() + token_validity * 24 * 60 * 60 * 1000) });

        //send otp through the mailed
        requestService({
            requestServiceName: process.env.SERVICE_MAILER,
            onRequestStart: () => logger.info("Generating OTP"),
            requestMethod: "POST",
            parseResponseBody: false,
            requestPostBody: {
                to: req.body.email,
                subject: "Verification OTP",
                template: "otp",
                injects: { otp, otp_validity, user_email: user.email },
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
        res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
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
