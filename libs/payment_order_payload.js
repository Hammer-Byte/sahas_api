const { PAYMENT_GATEWAY_TYPE_EXAM_SERIES, PAYMENT_ORDER_PRODUCT_EXAM_SERIES, PAYMENT_RESULT_API_PATH } = require("../constants");

function buildPaymentGatewayResponseFromOrder(order) {
    const snapshot = order?.snapshot || {};
    const merchantKey = process.env.PAYU_MERCHANT_KEY;
    const redirectionHost = process.env.PAYU_REDIRECTION_HOST;
    const url = process.env.PAYU_URL;

    const response = {
        paymentGateWay: {
            merchantKey,
            url,
        },
        transaction: {
            id: order.txnid,
            successURL: redirectionHost.concat(PAYMENT_RESULT_API_PATH),
            failureURL: redirectionHost.concat(PAYMENT_RESULT_API_PATH),
            amount: Number(order.amount),
            preTaxAmount: order.pre_tax_amount,
            cgst: order.cgst,
            sgst: order.sgst,
            discount: order.discount,
            couponCode: order.coupon_code,
            usedWalletBalance: Number(order.used_wallet_balance) > 0 ? order.used_wallet_balance : undefined,
            hash: order.hash,
            paid: order.status === "fulfilled",
            distributor_user: snapshot.distributor_user || undefined,
            commision: order.commission != null ? order.commission : undefined,
        },
        user: snapshot.user || {
            email: snapshot.user_email,
            firstName: snapshot.user_first_name,
            lastName: snapshot.user_last_name,
            phone: snapshot.user_phone,
            wallet: snapshot.user_wallet,
        },
        product: order.product_title,
        status: order.status,
    };

    if (order.product_type === PAYMENT_ORDER_PRODUCT_EXAM_SERIES || snapshot.type === PAYMENT_GATEWAY_TYPE_EXAM_SERIES) {
        response.type = PAYMENT_GATEWAY_TYPE_EXAM_SERIES;
        response.exam_series_id = order.product_id;
        response.examSeries = snapshot.examSeries;
    }

    if (snapshot.course) {
        response.course = snapshot.course;
    }

    return response;
}

function buildOrderSnapshotFromPayload(paymentGateWayPayLoad) {
    return {
        course: paymentGateWayPayLoad.course || null,
        examSeries: paymentGateWayPayLoad.examSeries || null,
        type: paymentGateWayPayLoad.type || null,
        user: paymentGateWayPayLoad.user || null,
        distributor_user: paymentGateWayPayLoad?.transaction?.distributor_user || null,
        product: paymentGateWayPayLoad.product,
    };
}

module.exports = {
    buildPaymentGatewayResponseFromOrder,
    buildOrderSnapshotFromPayload,
};
