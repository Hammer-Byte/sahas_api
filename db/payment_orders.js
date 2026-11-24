const { executeSQLQueryParameterized } = require("../libs/db");
const { logger } = require("sahas_utils");
const {
    PAYMENT_ORDER_STATUS_PENDING,
    PAYMENT_ORDER_STATUS_PROCESSING,
    PAYMENT_ORDER_STATUS_FULFILLED,
    PAYMENT_ORDER_PENDING_TTL_MINUTES,
    PAYMENT_ORDER_STALE_PROCESSING_MINUTES,
} = require("../constants");

function parseSnapshot(row) {
    if (!row) return row;
    let snapshot = row.snapshot;
    if (typeof snapshot === "string") {
        try {
            snapshot = JSON.parse(snapshot);
        } catch (_) {
            snapshot = null;
        }
    }
    return { ...row, snapshot };
}

function getPaymentOrderByTxnId({ txnid }) {
    return executeSQLQueryParameterized(`SELECT * FROM PAYMENT_ORDERS WHERE txnid=? LIMIT 1`, [txnid])
        .then((rows) => (rows?.length ? parseSnapshot(rows[0]) : null))
        .catch((error) => {
            logger.error(`getPaymentOrderByTxnId: ${error}`);
            return null;
        });
}

function getPendingPaymentOrderForUserProduct({ user_id, product_type, product_id, ttlMinutes = PAYMENT_ORDER_PENDING_TTL_MINUTES }) {
    const params = [user_id, product_type, PAYMENT_ORDER_STATUS_PENDING, ttlMinutes];
    let productClause = "product_id IS NULL";
    if (product_id != null) {
        productClause = "product_id=?";
        params.splice(2, 0, product_id);
    }

    return executeSQLQueryParameterized(
        `SELECT * FROM PAYMENT_ORDERS
         WHERE user_id=? AND product_type=? AND ${productClause} AND status=?
           AND created_on >= DATE_SUB(NOW(), INTERVAL ? MINUTE)
         ORDER BY id DESC LIMIT 1`,
        params,
    )
        .then((rows) => (rows?.length ? parseSnapshot(rows[0]) : null))
        .catch((error) => {
            logger.error(`getPendingPaymentOrderForUserProduct: ${error}`);
            return null;
        });
}

function addPaymentOrder({
    txnid,
    user_id,
    product_type,
    product_id = null,
    product_title,
    amount,
    pre_tax_amount,
    cgst,
    sgst,
    discount = 0,
    used_wallet_balance = 0,
    coupon_code = null,
    commission = null,
    distributor_user_id = null,
    hash = null,
    status = PAYMENT_ORDER_STATUS_PENDING,
    snapshot = null,
}) {
    return executeSQLQueryParameterized(
        `INSERT INTO PAYMENT_ORDERS (
            txnid, user_id, product_type, product_id, product_title,
            amount, pre_tax_amount, cgst, sgst, discount, used_wallet_balance,
            coupon_code, commission, distributor_user_id, hash, status, snapshot
         ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
            txnid,
            user_id,
            product_type,
            product_id,
            product_title,
            amount,
            pre_tax_amount,
            cgst,
            sgst,
            discount,
            used_wallet_balance,
            coupon_code,
            commission,
            distributor_user_id,
            hash,
            status,
            snapshot ? JSON.stringify(snapshot) : null,
        ],
    )
        .then((result) => result.insertId)
        .catch((error) => {
            logger.error(`addPaymentOrder: ${error}`);
            return null;
        });
}

function updatePaymentOrderCheckoutByTxnId({
    txnid,
    amount,
    pre_tax_amount,
    cgst,
    sgst,
    discount = 0,
    used_wallet_balance = 0,
    coupon_code = null,
    commission = null,
    distributor_user_id = null,
    hash = null,
    product_title,
    snapshot = null,
}) {
    return executeSQLQueryParameterized(
        `UPDATE PAYMENT_ORDERS SET
            amount=?, pre_tax_amount=?, cgst=?, sgst=?, discount=?, used_wallet_balance=?,
            coupon_code=?, commission=?, distributor_user_id=?, hash=?, product_title=?, snapshot=?,
            status=?
         WHERE txnid=? AND status=?`,
        [
            amount,
            pre_tax_amount,
            cgst,
            sgst,
            discount,
            used_wallet_balance,
            coupon_code,
            commission,
            distributor_user_id,
            hash,
            product_title,
            snapshot ? JSON.stringify(snapshot) : null,
            PAYMENT_ORDER_STATUS_PENDING,
            txnid,
            PAYMENT_ORDER_STATUS_PENDING,
        ],
    ).catch((error) => logger.error(`updatePaymentOrderCheckoutByTxnId: ${error}`));
}

function updatePaymentOrderPayuStatusByTxnId({ txnid, payu_status }) {
    return executeSQLQueryParameterized(`UPDATE PAYMENT_ORDERS SET payu_status=? WHERE txnid=?`, [payu_status, txnid]).catch((error) =>
        logger.error(`updatePaymentOrderPayuStatusByTxnId: ${error}`),
    );
}

function claimPaymentOrderByTxnId({ txnid, staleProcessingMinutes = PAYMENT_ORDER_STALE_PROCESSING_MINUTES }) {
    return executeSQLQueryParameterized(
        `UPDATE PAYMENT_ORDERS
         SET status=?
         WHERE txnid=?
           AND (
             status IN (?, ?)
             OR (status=? AND updated_at < DATE_SUB(NOW(), INTERVAL ? MINUTE))
           )`,
        [
            PAYMENT_ORDER_STATUS_PROCESSING,
            txnid,
            PAYMENT_ORDER_STATUS_PENDING,
            "paid",
            PAYMENT_ORDER_STATUS_PROCESSING,
            staleProcessingMinutes,
        ],
    )
        .then((result) => result?.affectedRows > 0)
        .catch((error) => {
            logger.error(`claimPaymentOrderByTxnId: ${error}`);
            return false;
        });
}

function markPaymentOrderFulfilled({ txnid, enrollment_id = null, enrollment_transaction_id = null }) {
    return executeSQLQueryParameterized(
        `UPDATE PAYMENT_ORDERS
         SET status=?, enrollment_id=?, enrollment_transaction_id=?, fulfilled_at=NOW()
         WHERE txnid=?`,
        [PAYMENT_ORDER_STATUS_FULFILLED, enrollment_id, enrollment_transaction_id, txnid],
    ).catch((error) => logger.error(`markPaymentOrderFulfilled: ${error}`));
}

function updatePaymentOrderStatusByTxnId({ txnid, status, payu_status = undefined }) {
    if (payu_status !== undefined) {
        return executeSQLQueryParameterized(`UPDATE PAYMENT_ORDERS SET status=?, payu_status=? WHERE txnid=?`, [status, payu_status, txnid]).catch((error) =>
            logger.error(`updatePaymentOrderStatusByTxnId: ${error}`),
        );
    }
    return executeSQLQueryParameterized(`UPDATE PAYMENT_ORDERS SET status=? WHERE txnid=?`, [status, txnid]).catch((error) =>
        logger.error(`updatePaymentOrderStatusByTxnId: ${error}`),
    );
}

function getPaymentOrdersForReconcile({ minAgeMinutes, maxAgeHours, limit = 50 }) {
    return executeSQLQueryParameterized(
        `SELECT * FROM PAYMENT_ORDERS
         WHERE status IN (?, ?, ?)
           AND created_on <= DATE_SUB(NOW(), INTERVAL ? MINUTE)
           AND created_on >= DATE_SUB(NOW(), INTERVAL ? HOUR)
         ORDER BY created_on ASC
         LIMIT ?`,
        [PAYMENT_ORDER_STATUS_PENDING, PAYMENT_ORDER_STATUS_PROCESSING, "paid", minAgeMinutes, maxAgeHours, limit],
    )
        .then((rows) => (rows || []).map(parseSnapshot))
        .catch((error) => {
            logger.error(`getPaymentOrdersForReconcile: ${error}`);
            return [];
        });
}

function expireStalePendingOrders({ ttlMinutes = PAYMENT_ORDER_PENDING_TTL_MINUTES, maxAgeHours = 168 }) {
    return executeSQLQueryParameterized(
        `UPDATE PAYMENT_ORDERS
         SET status=?
         WHERE status=?
           AND created_on < DATE_SUB(NOW(), INTERVAL ? MINUTE)
           AND created_on >= DATE_SUB(NOW(), INTERVAL ? HOUR)`,
        ["expired", PAYMENT_ORDER_STATUS_PENDING, ttlMinutes, maxAgeHours],
    ).catch((error) => logger.error(`expireStalePendingOrders: ${error}`));
}

module.exports = {
    getPaymentOrderByTxnId,
    getPendingPaymentOrderForUserProduct,
    addPaymentOrder,
    updatePaymentOrderCheckoutByTxnId,
    updatePaymentOrderPayuStatusByTxnId,
    claimPaymentOrderByTxnId,
    markPaymentOrderFulfilled,
    updatePaymentOrderStatusByTxnId,
    getPaymentOrdersForReconcile,
    expireStalePendingOrders,
    parseSnapshot,
};
