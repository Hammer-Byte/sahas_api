const libExpress = require("express");
const { validateRequestBody } = require("sahas_utils");
const { logger } = require("sahas_utils");
const { readConfig } = require("../libs/config");

const router = libExpress.Router();

router.post("/", async (req, res) => {
    const requiredBodyFields = ["txnid"];


    console.log(req.body);

    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (isRequestBodyValid) {
        const { paymentGateWay: { redirectionHost, postPaymentRoute } = {} } = await readConfig("app");



        return res.redirect(redirectionHost.concat(postPaymentRoute.concat(validatedRequestBody.txnid)));
    }
    res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
});

module.exports = router;
