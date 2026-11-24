const libExpress = require("express");
const { fulfillPaymentOrder } = require("../libs/fulfill_payment_order");
const { getPaymentOrderByTxnId } = require("../db/payment_orders");
const { PAYMENT_ORDER_STATUS_FULFILLED, PAYMENT_ORDER_STATUS_PROCESSING } = require("../constants");
const { setTimeout: delay } = require("timers/promises");

const router = libExpress.Router();

router.get("/:id", async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing Payment GateWay PayLoad Id" });
    }

    if (!req.user?.id) {
        return res.status(401).json({ error: "Authentication Required" });
    }

    let result = await fulfillPaymentOrder(req.params.id, { requireUserId: req.user.id });

    if (!result.ok && result.statusCode) {
        return res.status(result.statusCode).json({ error: result.error || "Failed To Process Payment" });
    }

    // Another request may be mid-fulfill; wait briefly and re-check.
    if (!result.paid) {
        const current = await getPaymentOrderByTxnId({ txnid: req.params.id });
        if (current?.status === PAYMENT_ORDER_STATUS_PROCESSING) {
            await delay(1500);
            result = await fulfillPaymentOrder(req.params.id, { requireUserId: req.user.id });
        } else if (current?.status === PAYMENT_ORDER_STATUS_FULFILLED) {
            result = await fulfillPaymentOrder(req.params.id, { requireUserId: req.user.id });
        }
    }

    if (!result.ok && result.statusCode) {
        return res.status(result.statusCode).json({ error: result.error || "Failed To Process Payment" });
    }

    return res.status(200).json(
        result.response || {
            transaction: { paid: !!result.paid },
        },
    );
});

module.exports = router;
