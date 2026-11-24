const libCrypto = require("crypto");
const {
    addPaymentOrder,
    getPendingPaymentOrderForUserProduct,
    updatePaymentOrderCheckoutByTxnId,
    getPaymentOrderByTxnId,
} = require("../db/payment_orders");
const { buildOrderSnapshotFromPayload, buildPaymentGatewayResponseFromOrder } = require("./payment_order_payload");
const { PAYMENT_ORDER_PENDING_TTL_MINUTES } = require("../constants");

function computePayuHash({ txnid, amount, product, firstName, email }) {
    const merchantKey = process.env.PAYU_MERCHANT_KEY;
    const merchantSalt = process.env.PAYU_MERCHANT_SALT;
    return libCrypto
        .createHash("sha512")
        .update(`${merchantKey}|${txnid}|${amount}|${product}|${firstName}|${email}|||||||||||${merchantSalt}`)
        .digest("hex");
}

async function persistPaymentGatewayOrder({ userId, productType, productId, paymentGateWayPayLoad }) {
    const amount = paymentGateWayPayLoad.transaction.amount;
    const pre_tax_amount = paymentGateWayPayLoad.transaction.preTaxAmount;
    const cgst = paymentGateWayPayLoad.transaction.cgst;
    const sgst = paymentGateWayPayLoad.transaction.sgst;
    const discount = paymentGateWayPayLoad.transaction.discount || 0;
    const used_wallet_balance = paymentGateWayPayLoad.transaction.usedWalletBalance || 0;
    const coupon_code = paymentGateWayPayLoad.transaction.couponCode || null;
    const commission = paymentGateWayPayLoad.transaction.commision ?? null;
    const distributor_user_id = paymentGateWayPayLoad.transaction.distributor_user?.id || null;
    const product_title = paymentGateWayPayLoad.product;

    const existing = await getPendingPaymentOrderForUserProduct({
        user_id: userId,
        product_type: productType,
        product_id: productId,
        ttlMinutes: PAYMENT_ORDER_PENDING_TTL_MINUTES,
    });

    const txnid = existing?.txnid || libCrypto.randomUUID();
    const hash = computePayuHash({
        txnid,
        amount,
        product: product_title,
        firstName: paymentGateWayPayLoad.user.firstName,
        email: paymentGateWayPayLoad.user.email,
    });

    paymentGateWayPayLoad.transaction.id = txnid;
    paymentGateWayPayLoad.transaction.hash = hash;

    const finalSnapshot = buildOrderSnapshotFromPayload(paymentGateWayPayLoad);

    if (existing) {
        await updatePaymentOrderCheckoutByTxnId({
            txnid,
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
            snapshot: finalSnapshot,
        });
    } else {
        await addPaymentOrder({
            txnid,
            user_id: userId,
            product_type: productType,
            product_id: productId,
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
            snapshot: finalSnapshot,
        });
    }

    const saved = await getPaymentOrderByTxnId({ txnid });
    return buildPaymentGatewayResponseFromOrder(saved);
}

module.exports = { persistPaymentGatewayOrder, computePayuHash };
