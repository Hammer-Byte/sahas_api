const libExpress = require("express");
const { validateRequestBody } = require("sahas_utils");
const { PAYMENT_POST_ROUTE } = require("../constants");
const { getUserByEmail, patchUserStreamSelectionTestAllowedById } = require("../db/users");

const router = libExpress.Router();

router.post("/", async (req, res) => {
    const requiredBodyFields = ["txnid", "productinfo"];

    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (isRequestBodyValid) {
        const redirectionHost = process.env.PAYU_REDIRECTION_HOST;

        if (validatedRequestBody.productinfo === "Stream Selection Test") {
            const user = await getUserByEmail({ email: req.body.email });
            await patchUserStreamSelectionTestAllowedById({ id: user.id, stream_selection_test_allowed: true });
            return res.redirect(redirectionHost.concat("stream-selection-test/enroll"));
        }

        return res.redirect(redirectionHost.concat(PAYMENT_POST_ROUTE.concat(validatedRequestBody.txnid)));
    }
    res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
});

module.exports = router;
