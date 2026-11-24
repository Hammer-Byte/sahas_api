const { logger } = require("sahas_utils");
const {
    PAYMENT_RECONCILE_INTERVAL_MS,
    PAYMENT_RECONCILE_MIN_AGE_MINUTES,
    PAYMENT_RECONCILE_MAX_AGE_HOURS,
    PAYMENT_ORDER_PENDING_TTL_MINUTES,
} = require("../constants");
const { getPaymentOrdersForReconcile, expireStalePendingOrders } = require("../db/payment_orders");
const { fulfillPaymentOrder } = require("./fulfill_payment_order");

let reconcileTimer = null;
let reconcileRunning = false;

async function reconcileAbandonedPaymentOrders() {
    if (reconcileRunning) return;
    reconcileRunning = true;

    try {
        await expireStalePendingOrders({ ttlMinutes: PAYMENT_ORDER_PENDING_TTL_MINUTES });

        const orders = await getPaymentOrdersForReconcile({
            minAgeMinutes: PAYMENT_RECONCILE_MIN_AGE_MINUTES,
            maxAgeHours: PAYMENT_RECONCILE_MAX_AGE_HOURS,
            limit: 50,
        });

        for (const order of orders) {
            try {
                const result = await fulfillPaymentOrder(order.txnid, { skipAuthCheck: true });
                if (result.paid) {
                    logger.success(`Reconciled payment order ${order.txnid}`);
                }
            } catch (error) {
                logger.error(`Reconcile failed for ${order.txnid}: ${error}`);
            }
        }
    } catch (error) {
        logger.error(`reconcileAbandonedPaymentOrders: ${error}`);
    } finally {
        reconcileRunning = false;
    }
}

function startPaymentOrderReconciler() {
    if (reconcileTimer) return;
    reconcileTimer = setInterval(() => {
        reconcileAbandonedPaymentOrders();
    }, PAYMENT_RECONCILE_INTERVAL_MS);
    if (typeof reconcileTimer.unref === "function") reconcileTimer.unref();
    logger.info(`Payment order reconciler started (every ${PAYMENT_RECONCILE_INTERVAL_MS}ms)`);
}

module.exports = {
    reconcileAbandonedPaymentOrders,
    startPaymentOrderReconciler,
};
