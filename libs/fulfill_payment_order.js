const libMoment = require("moment");
const libNumbersToWords = require("number-to-words");
const { requestService, logger } = require("sahas_utils");
const { verifyPaymentGatewayPayLoadStatus, getFormattedDate } = require("../utils");
const { getConfigByKey } = require("../db/configs");
const { getEnrollmentByCourseIdAndUserId } = require("../db/enrollments");
const { getEnrollmentTransactionByGatewayTxnId, updateEnrollmentTransactionInvoiceById } = require("../db/enrollment_transactions");
const { getBundledCoursesByCourseId } = require("../db/bundled_courses");
const { addExamSeriesEnrollment, getExamSeriesEnrollmentByUserIdAndExamSeriesId } = require("../db/exam_series_enrollments");
const { patchUserStreamSelectionTestAllowedById } = require("../db/users");
const {
    claimPaymentOrderByTxnId,
    getPaymentOrderByTxnId,
    markPaymentOrderFulfilled,
    updatePaymentOrderStatusByTxnId,
} = require("../db/payment_orders");
const { buildPaymentGatewayResponseFromOrder } = require("./payment_order_payload");
const { createNotification } = require("./notifications");
const { recordActivity } = require("./activities");
const { withTransaction } = require("./db");
const {
    PAYMENT_ORDER_PRODUCT_EXAM_SERIES,
    PAYMENT_ORDER_PRODUCT_STREAM_SELECTION,
    PAYMENT_ORDER_STATUS_FULFILLED,
    PAYMENT_ORDER_STATUS_PENDING,
    PAYMENT_ORDER_STATUS_FAILED,
    PAYMENT_ORDER_STATUS_EXPIRED,
    PAYMENT_GATEWAY_TYPE_EXAM_SERIES,
} = require("../constants");

function toVerifyPayload(order) {
    return {
        transaction: {
            id: order.txnid,
            amount: Number(order.amount),
        },
    };
}

async function generateCourseInvoiceAndEmail({ order, payload, enrollmentTransactionId, cgst, sgst }) {
    const dateTime = libMoment();
    let invoiceUrl;

    await requestService({
        requestServiceName: process.env.SERVICE_MEDIA,
        onRequestStart: () => logger.info("Generating Invoice"),
        requestPath: "templated/pdf",
        requestMethod: "POST",
        requestPostBody: {
            template: "invoice",
            injects: {
                invoice_date: getFormattedDate({ date: dateTime, format: "DD-MM-YY" }),
                transaction_id: enrollmentTransactionId,
                course_title: payload?.course?.title || order.product_title,
                user_name: `${payload?.user?.firstName || ""} ${payload?.user?.lastName || ""}`.trim(),
                user_email: payload?.user?.email,
                user_phone: payload?.user?.phone,
                validity: getFormattedDate({ date: payload?.course?.validity, format: "DD-MM-YY" }),
                payment_date: getFormattedDate({ date: dateTime, format: "DD-MM-YY HH:mm:ss" }),
                cgst_percentage: cgst,
                sgst_percentage: sgst,
                price_original: payload?.course?.fees,
                price_pre_tax: order.pre_tax_amount,
                discount: order.discount,
                coupon_code: order.coupon_code || "No Coupon Code",
                total_tax: (Number(order.cgst) + Number(order.sgst)).toFixed(2),
                cgst: order.cgst,
                sgst: order.sgst,
                price_pay: order.amount,
                price_pay_words: libNumbersToWords.toWords(Number(order.amount) || 0).toUpperCase(),
                received_by: "PayU",
                mode_payment: "Online",
                note: "NA",
            },
        },
        onResponseReceieved: (generatedInvoice, responseCode) => {
            if (generatedInvoice?.cdn_url && responseCode === 201) {
                logger.success(`Invoice For Transaction - ${enrollmentTransactionId} Generated !`);
                invoiceUrl = generatedInvoice.cdn_url;
                updateEnrollmentTransactionInvoiceById({ id: enrollmentTransactionId, invoice: generatedInvoice.cdn_url });
            } else {
                logger.error(
                    `Failed To Generate Invoice For Transaction - ${enrollmentTransactionId} - Media Responded With ${JSON.stringify(generatedInvoice)}`,
                );
            }
        },
    });

    await requestService({
        requestServiceName: process.env.SERVICE_MAILER,
        onRequestStart: () => logger.info("Sending Enrollment Transcation Email"),
        requestMethod: "POST",
        parseResponseBody: false,
        requestPostBody: {
            to: payload?.user?.email,
            subject: "Course Enrollment Transaction",
            template: "enrollment",
            injects: {
                user_name: `${payload?.user?.firstName || ""} ${payload?.user?.lastName || ""}`.trim(),
                course_title: payload?.course?.title || order.product_title,
                amount: order.amount,
                invoice: invoiceUrl,
            },
        },
        onResponseReceieved: (_, responseCode) => {
            if (responseCode === 201) {
                logger.success(`Enrollment Email Sent`);
            } else {
                logger.error(`Failed To Send Enrollment Email`);
            }
        },
    });
}

async function fulfillCourseOrder({ order, payload, userId }) {
    const existingTxn = await getEnrollmentTransactionByGatewayTxnId({ gateway_txn_id: order.txnid });
    if (existingTxn) {
        await markPaymentOrderFulfilled({
            txnid: order.txnid,
            enrollment_id: existingTxn.enrollment_id,
            enrollment_transaction_id: existingTxn.id,
        });
        return { enrollment_id: existingTxn.enrollment_id, enrollment_transaction_id: existingTxn.id };
    }

    const existingEnrollment = payload?.course?.id
        ? await getEnrollmentByCourseIdAndUserId({ user_id: userId, course_id: payload.course.id })
        : null;

    let enrollmentCourses = [payload?.course];
    if (payload?.course?.is_bundle) {
        enrollmentCourses = await getBundledCoursesByCourseId({ course_id: payload.course.id });
    }

    const discount = (Number(order.discount || 0) + Number(order.used_wallet_balance || 0)).toFixed(2);
    const startDate = getFormattedDate({ date: libMoment() });
    const endDate = getFormattedDate({ date: payload?.course?.validity });

    let enrollmentId;
    let enrollmentTransactionId;

    try {
        ({ enrollmentId, enrollmentTransactionId } = await withTransaction(async (execute) => {
            let nextEnrollmentId = existingEnrollment?.id;

            if (!nextEnrollmentId) {
                const enrollmentResult = await execute(
                    "INSERT INTO ENROLLMENTS(user_id,start_date,end_date,amount,on_site_access,digital_access,created_by,handler,note) VALUES(?,?,?,?,?,?,?,?,?)",
                    [userId, startDate, endDate, order.amount, false, true, userId, "SAHAS INSTITUTE PVT LTD", null],
                );
                nextEnrollmentId = enrollmentResult.insertId;

                for (const enrollmentCourse of enrollmentCourses || []) {
                    if (enrollmentCourse?.id) {
                        await execute("INSERT INTO ENROLLMENT_COURSES(enrollment_id,course_id,created_by) VALUES(?,?,?)", [
                            nextEnrollmentId,
                            enrollmentCourse.id,
                            userId,
                        ]);
                    }
                }
            }

            const txnResult = await execute(
                `INSERT INTO ENROLLMENT_TRANSACTIONS(enrollment_id,amount,cgst,sgst,created_by,coupon_code,discount,note,type,image,gateway_txn_id)
                 VALUES(?,?,?,?,?,?,?,?,?,?,?)`,
                [
                    nextEnrollmentId,
                    order.amount,
                    order.cgst,
                    order.sgst,
                    userId,
                    order.coupon_code,
                    discount,
                    "Self Purchased",
                    "PAYMENT_GATEWAY",
                    null,
                    order.txnid,
                ],
            );

            if (Number(order.used_wallet_balance) > 0) {
                await execute(`INSERT INTO WALLET_TRANSACTIONS (user_id,amount,note,created_by) VALUES(?,?,?,?)`, [
                    userId,
                    -order.used_wallet_balance,
                    `Course Purchase - ${payload?.course?.title || order.product_title}`,
                    userId,
                ]);
            }

            if (order.coupon_code && payload?.distributor_user?.id && order.commission) {
                await execute(`INSERT INTO WALLET_TRANSACTIONS (user_id,amount,note,created_by) VALUES(?,?,?,?)`, [
                    payload.distributor_user.id,
                    order.commission,
                    `Coupon Distribution Benifit - ${order.coupon_code} - ${payload?.user?.email}`,
                    userId,
                ]);
            }

            await execute(
                `UPDATE PAYMENT_ORDERS SET status=?, enrollment_id=?, enrollment_transaction_id=?, fulfilled_at=NOW() WHERE txnid=?`,
                ["fulfilled", nextEnrollmentId, txnResult.insertId, order.txnid],
            );

            return { enrollmentId: nextEnrollmentId, enrollmentTransactionId: txnResult.insertId };
        }));
    } catch (error) {
        const raced = await getEnrollmentTransactionByGatewayTxnId({ gateway_txn_id: order.txnid });
        if (raced) {
            await markPaymentOrderFulfilled({
                txnid: order.txnid,
                enrollment_id: raced.enrollment_id,
                enrollment_transaction_id: raced.id,
            });
            return { enrollment_id: raced.enrollment_id, enrollment_transaction_id: raced.id };
        }
        throw error;
    }

    if (order.coupon_code && payload?.distributor_user && order.commission) {
        await requestService({
            requestServiceName: process.env.SERVICE_MAILER,
            onRequestStart: () => logger.info("Sending Coupon Code Commision Email"),
            requestMethod: "POST",
            parseResponseBody: false,
            requestPostBody: {
                to: payload.distributor_user?.email,
                subject: "Coupon Code Used",
                template: "commision",
                injects: {
                    distributor_name: payload.distributor_user?.full_name,
                    commision: order.commission,
                    coupon_code: order.coupon_code,
                    user_name: `${payload?.user?.firstName || ""} ${payload?.user?.lastName || ""}`.trim(),
                    user_email: payload?.user?.email,
                    used_at: getFormattedDate({ date: libMoment(), format: "DD-MM-YY HH:mm:ss" }),
                    course_title: payload?.course?.title || order.product_title,
                },
            },
            onResponseReceieved: (_, responseCode) => {
                if (responseCode === 201) logger.success(`Commission Email Sent`);
                else logger.error(`Failed To Send Commission Email`);
            },
        });
    }

    const cgst = Number(await getConfigByKey("payment_cgst"));
    const sgst = Number(await getConfigByKey("payment_sgst"));
    await generateCourseInvoiceAndEmail({ order, payload, enrollmentTransactionId, cgst, sgst });

    await recordActivity({
        user_id: userId,
        key: "PAY_FEES",
        values: {
            amount: order.amount,
            course: payload?.course?.title || order.product_title,
        },
    });

    await createNotification({
        user_id: userId,
        title: "An enrollment transaction was added",
        description: `An enrollment transaction for "${payload?.course?.title || order.product_title}" (amount ${order.amount}) was recorded.`,
        created_by: userId,
    });

    return { enrollment_id: enrollmentId, enrollment_transaction_id: enrollmentTransactionId };
}

async function fulfillExamSeriesOrder({ order, payload, userId }) {
    const existingEnrollment = await getExamSeriesEnrollmentByUserIdAndExamSeriesId({
        user_id: userId,
        exam_series_id: order.product_id,
    });

    if (!existingEnrollment) {
        const examSeriesEnrollmentId = await addExamSeriesEnrollment({
            user_id: userId,
            exam_series_id: order.product_id,
        });
        if (examSeriesEnrollmentId) {
            await recordActivity({
                user_id: userId,
                key: "PAY_FEES",
                values: {
                    amount: order.amount,
                    course: payload?.examSeries?.title || order.product_id,
                },
            });
        }
        await createNotification({
            user_id: userId,
            title: "Exam series access granted",
            description: `You enrolled in exam series "${payload?.examSeries?.title || order.product_id}".`,
            created_by: userId,
        });
    }

    await markPaymentOrderFulfilled({ txnid: order.txnid, enrollment_id: null, enrollment_transaction_id: null });
    return {};
}

async function fulfillStreamSelectionOrder({ order, userId }) {
    await patchUserStreamSelectionTestAllowedById({ id: userId, stream_selection_test_allowed: true });
    await createNotification({
        user_id: userId,
        title: "Psychometric test access granted",
        description: "You can now take the stream selection test.",
        created_by: userId,
    });
    await markPaymentOrderFulfilled({ txnid: order.txnid });
    return {};
}

/**
 * Idempotent fulfill for a single payment order txnid.
 * @param {string} txnid
 * @param {{ requireUserId?: number, skipAuthCheck?: boolean }} options
 */
async function fulfillPaymentOrder(txnid, { requireUserId, skipAuthCheck = false } = {}) {
    if (!txnid) {
        return { ok: false, statusCode: 400, error: "Missing Payment GateWay PayLoad Id", paid: false };
    }

    let order = await getPaymentOrderByTxnId({ txnid });
    if (!order) {
        return { ok: false, statusCode: 404, error: "Payment Order Not Found", paid: false };
    }

    if (!skipAuthCheck && requireUserId != null && Number(order.user_id) !== Number(requireUserId)) {
        return { ok: false, statusCode: 403, error: "Payment Order Does Not Belong To User", paid: false };
    }

    if (order.status === PAYMENT_ORDER_STATUS_FULFILLED) {
        const payload = buildPaymentGatewayResponseFromOrder(order);
        return {
            ok: true,
            statusCode: 200,
            paid: true,
            alreadyFulfilled: true,
            order,
            response: {
                transaction: { paid: true },
                course: payload.course,
                type: payload.type,
                exam_series_id: payload.exam_series_id,
                examSeries: payload.examSeries,
                product: payload.product,
                product_type: order.product_type,
            },
        };
    }

    if ([PAYMENT_ORDER_STATUS_FAILED, PAYMENT_ORDER_STATUS_EXPIRED].includes(order.status)) {
        return {
            ok: true,
            statusCode: 200,
            paid: false,
            order,
            response: {
                transaction: { paid: false },
                course: order.snapshot?.course,
                type: order.product_type === PAYMENT_ORDER_PRODUCT_EXAM_SERIES ? PAYMENT_GATEWAY_TYPE_EXAM_SERIES : undefined,
                exam_series_id: order.product_id,
                examSeries: order.snapshot?.examSeries,
                product: order.product_title,
                product_type: order.product_type,
            },
        };
    }

    const claimed = await claimPaymentOrderByTxnId({ txnid });
    order = await getPaymentOrderByTxnId({ txnid });

    if (!claimed) {
        if (order?.status === PAYMENT_ORDER_STATUS_FULFILLED) {
            const payload = buildPaymentGatewayResponseFromOrder(order);
            return {
                ok: true,
                statusCode: 200,
                paid: true,
                alreadyFulfilled: true,
                order,
                response: {
                    transaction: { paid: true },
                    course: payload.course,
                    type: payload.type,
                    exam_series_id: payload.exam_series_id,
                    examSeries: payload.examSeries,
                    product: payload.product,
                    product_type: order.product_type,
                },
            };
        }

        return {
            ok: true,
            statusCode: 200,
            paid: false,
            order,
            response: {
                transaction: { paid: false },
                course: order?.snapshot?.course,
                type: order?.product_type === PAYMENT_ORDER_PRODUCT_EXAM_SERIES ? PAYMENT_GATEWAY_TYPE_EXAM_SERIES : undefined,
                exam_series_id: order?.product_id,
                examSeries: order?.snapshot?.examSeries,
                product: order?.product_title,
                product_type: order?.product_type,
            },
        };
    }

    const verified = await verifyPaymentGatewayPayLoadStatus(toVerifyPayload(order));
    const paid = !!verified?.transaction?.paid;

    if (!paid) {
        await updatePaymentOrderStatusByTxnId({
            txnid,
            status: PAYMENT_ORDER_STATUS_PENDING,
            payu_status: "not_success",
        });
        return {
            ok: true,
            statusCode: 200,
            paid: false,
            order,
            response: {
                transaction: { paid: false },
                course: order.snapshot?.course,
                type: order.product_type === PAYMENT_ORDER_PRODUCT_EXAM_SERIES ? PAYMENT_GATEWAY_TYPE_EXAM_SERIES : undefined,
                exam_series_id: order.product_id,
                examSeries: order.snapshot?.examSeries,
                product: order.product_title,
                product_type: order.product_type,
            },
        };
    }

    const userId = order.user_id;
    const payload = {
        course: order.snapshot?.course,
        examSeries: order.snapshot?.examSeries,
        user: order.snapshot?.user,
        distributor_user: order.snapshot?.distributor_user,
    };

    try {
        if (order.product_type === PAYMENT_ORDER_PRODUCT_EXAM_SERIES) {
            await fulfillExamSeriesOrder({ order, payload, userId });
        } else if (order.product_type === PAYMENT_ORDER_PRODUCT_STREAM_SELECTION) {
            await fulfillStreamSelectionOrder({ order, userId });
        } else {
            await fulfillCourseOrder({ order, payload, userId });
        }
    } catch (error) {
        logger.error(`fulfillPaymentOrder failed for ${txnid}: ${error}`);
        await updatePaymentOrderStatusByTxnId({ txnid, status: PAYMENT_ORDER_STATUS_PENDING });
        return { ok: false, statusCode: 500, error: "Failed To Fulfill Payment Order", paid: false };
    }

    const fulfilledOrder = await getPaymentOrderByTxnId({ txnid });
    const responsePayload = buildPaymentGatewayResponseFromOrder(fulfilledOrder || order);

    return {
        ok: true,
        statusCode: 200,
        paid: true,
        order: fulfilledOrder,
        response: {
            transaction: { paid: true },
            course: responsePayload.course,
            type: responsePayload.type,
            exam_series_id: responsePayload.exam_series_id,
            examSeries: responsePayload.examSeries,
            product: responsePayload.product,
            product_type: (fulfilledOrder || order).product_type,
        },
    };
}

module.exports = {
    fulfillPaymentOrder,
};
