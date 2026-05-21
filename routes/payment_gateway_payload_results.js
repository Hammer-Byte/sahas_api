const libExpress = require("express");
const { validateRequestBody } = require("sahas_utils");
const { logger } = require("sahas_utils");
const { readConfig } = require("../libs/config");
const { getUserByEmail, patchUserStreamSelectionTestAllowedById } = require("../db/users");

const router = libExpress.Router();

router.post("/", async (req, res) => {
    const requiredBodyFields = ["txnid","productinfo"];


    console.log(req.body);

    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (isRequestBodyValid) {
        const { paymentGateWay: { redirectionHost, postPaymentRoute } = {} } = await readConfig("app");

        if (validatedRequestBody.productinfo === "Stream Selection Test") {
            const user = await getUserByEmail({ email: req.body.email });
            await patchUserStreamSelectionTestAllowedById({ id: user.id, stream_selection_test_allowed: true });
            return res.redirect(redirectionHost.concat("stream-selection-test/enroll"));
        }

        if (validatedRequestBody.productinfo === "Exam Series") {
            return res.redirect(redirectionHost.concat(postPaymentRoute.concat(validatedRequestBody.txnid)));
        }

        return res.redirect(redirectionHost.concat(postPaymentRoute.concat(validatedRequestBody.txnid)));
    }
    res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
});

module.exports = router;
