const libExpress = require("express");
const { validateRequestBody } = require("sahas_utils");
const { PAYMENT_POST_ROUTE, PAYMENT_ORDER_PRODUCT_STREAM_SELECTION } = require("../constants");
const { getPaymentOrderByTxnId, updatePaymentOrderPayuStatusByTxnId } = require("../db/payment_orders");
const { fulfillPaymentOrder } = require("../libs/fulfill_payment_order");
const { logger } = require("sahas_utils");

const router = libExpress.Router();

router.post("/", async (req, res) => {
    const requiredBodyFields = ["txnid", "productinfo"];

    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    const redirectionHost = process.env.PAYU_REDIRECTION_HOST;
    const txnid = validatedRequestBody.txnid;
    const payuStatus = req.body.status || req.body.unmappedstatus || null;

    const order = await getPaymentOrderByTxnId({ txnid });
    if (order) {
        if (payuStatus) {
            await updatePaymentOrderPayuStatusByTxnId({ txnid, payu_status: String(payuStatus) });
        }

        try {
            await fulfillPaymentOrder(txnid, { skipAuthCheck: true });
        } catch (error) {
            logger.error(`PayU callback fulfill failed for ${txnid}: ${error}`);
        }

        if (order.product_type === PAYMENT_ORDER_PRODUCT_STREAM_SELECTION) {
            return res.redirect(redirectionHost.concat("stream-selection-test/enroll"));
        }
    }

    return res.redirect(redirectionHost.concat(PAYMENT_POST_ROUTE.concat(txnid)));
});

module.exports = router;
