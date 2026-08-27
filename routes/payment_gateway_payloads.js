const libExpress = require("express");
const { verifyPaymentGatewayPayLoadStatus, getFormattedDate } = require("../utils");
const { requestService } = require("sahas_utils");
const { validateRequestBody } = require("sahas_utils");
const { getAllNonVerifiedPaymentGateWayPayLoads } = require("../db/payment_gateway_payloads");
const { getConfigByKey } = require("../db/configs");
const { logger } = require("sahas_utils");
const { addEnrollment } = require("../db/enrollments");
const libMoment = require("moment");
const { addEnrollmentCourse } = require("../db/enrollment_courses");
const { addEnrollmentTransaction, updateEnrollmentTransactionInvoiceById } = require("../db/enrollment_transactions");
const { addWalletTransaction } = require("../db/wallet_transactions");
const libNumbersToWords = require("number-to-words");
const { getBundledCoursesByCourseId } = require("../db/bundled_courses");
const { PAYMENT_GATEWAY_TYPE_EXAM_SERIES } = require("../constants");
const { addExamSeriesEnrollment, getExamSeriesEnrollmentByUserIdAndExamSeriesId } = require("../db/exam_series_enrollments");

const router = libExpress.Router();

//tested


router.get("/:id", async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing Payment GateWay PayLoad Id" });
    }

    //get config before we check all transcations
    const cgst = Number(await getConfigByKey("payment_cgst"));
    const sgst = Number(await getConfigByKey("payment_sgst"));

    //verify status with payment gateway
    const verifiedPaymentGatewayPayLoads = await Promise.all(getAllNonVerifiedPaymentGateWayPayLoads()?.map(verifyPaymentGatewayPayLoadStatus));
    //find those payment gateway payloads with success status
    const paidPaymentGatewayPayLoads = verifiedPaymentGatewayPayLoads?.filter(({ transaction }) => transaction?.paid);

    // process those payloads which are paid succesfully
    await Promise.all(
        paidPaymentGatewayPayLoads?.map(async (paymentGateWayPayLoad) => {
            //hold the date for different purpose
            paymentGateWayPayLoad.transaction.date_time = libMoment();


            if (paymentGateWayPayLoad?.product === "Stream Selection Test") {
                return;
            }

            if (paymentGateWayPayLoad?.type === PAYMENT_GATEWAY_TYPE_EXAM_SERIES) {
                const existingEnrollment = await getExamSeriesEnrollmentByUserIdAndExamSeriesId({
                    user_id: req?.user?.id,
                    exam_series_id: paymentGateWayPayLoad.exam_series_id,
                });

                if (!existingEnrollment) {
                    await addExamSeriesEnrollment({
                        user_id: req?.user?.id,
                        exam_series_id: paymentGateWayPayLoad.exam_series_id,
                    });
                }

                return;
            }

            {

                // add Enrollment
                const enrollmentId = await addEnrollment({
                    user_id: req?.user?.id,
                    start_date: getFormattedDate({ date: paymentGateWayPayLoad.transaction.date_time }),
                    end_date: getFormattedDate({ date: paymentGateWayPayLoad?.course?.validity }),
                    amount: paymentGateWayPayLoad?.transaction?.amount,
                    on_site_access: false,
                    digital_access: true,
                    created_by: req?.user?.id,
                });

                let enrollmentCourses = [paymentGateWayPayLoad?.course];

                //add course for it
                if (!!paymentGateWayPayLoad?.course?.is_bundle) {
                    enrollmentCourses = await getBundledCoursesByCourseId({ course_id: paymentGateWayPayLoad?.course?.id });
                }

                for (const enrollmentCourse of enrollmentCourses)
                    await addEnrollmentCourse({ created_by: req?.user?.id, enrollment_id: enrollmentId, course_id: enrollmentCourse?.id });


                paymentGateWayPayLoad.transaction.discount = (Number(paymentGateWayPayLoad?.transaction?.discount || 0) + Number(paymentGateWayPayLoad?.transaction?.usedWalletBalance || 0)).toFixed(2);
                //add transaction for it
                const enrollmentTransactionId = await addEnrollmentTransaction({
                    enrollment_id: enrollmentId,
                    amount: paymentGateWayPayLoad?.transaction?.amount,
                    cgst: paymentGateWayPayLoad?.transaction?.cgst,
                    sgst: paymentGateWayPayLoad?.transaction?.sgst,
                    created_by: req?.user?.id,
                    coupon_code: paymentGateWayPayLoad?.transaction?.couponCode,
                    discount: paymentGateWayPayLoad?.transaction?.discount,
                    note: "Self Purchased",
                    type: "PAYMENT_GATEWAY",
                });

                //deduct wallet if used
                if (paymentGateWayPayLoad?.transaction?.usedWalletBalance) {
                    await addWalletTransaction({
                        user_id: req?.user?.id,
                        amount: -paymentGateWayPayLoad?.transaction?.usedWalletBalance,
                        note: `Course Purchase - ${paymentGateWayPayLoad?.course?.title}`,
                        created_by: req?.user?.id,
                    });
                }

                //add distributor's commision
                if (
                    !!paymentGateWayPayLoad?.transaction?.couponCode &&
                    !!paymentGateWayPayLoad?.transaction?.distributor_user &&
                    !!paymentGateWayPayLoad?.transaction?.commision
                ) {
                    await addWalletTransaction({
                        user_id: paymentGateWayPayLoad.transaction.distributor_user.id,
                        amount: paymentGateWayPayLoad.transaction.commision,
                        note: `Coupon Distribution Benifit - ${paymentGateWayPayLoad.transaction.couponCode} - ${paymentGateWayPayLoad?.user?.email}`,
                        created_by: req?.user?.id,
                    });

                    await requestService({
                        requestServiceName: process.env.SERVICE_MAILER,
                        onRequestStart: () => logger.info("Sending Coupon Code Commision Email"),
                        requestMethod: "POST",
                        parseResponseBody: false,
                        requestPostBody: {
                            to: paymentGateWayPayLoad?.transaction.distributor_user?.email,
                            subject: "Coupon Code Used",
                            template: "commision",
                            injects: {
                                distributor_name: paymentGateWayPayLoad?.transaction?.distributor_user?.full_name,
                                commision: paymentGateWayPayLoad?.transaction?.commision,
                                coupon_code: paymentGateWayPayLoad?.transaction?.couponCode,
                                user_name: `${paymentGateWayPayLoad?.user?.firstName} ${paymentGateWayPayLoad?.user?.lastName}`,
                                user_email: paymentGateWayPayLoad?.user?.email,
                                used_at: getFormattedDate({ date: paymentGateWayPayLoad.transaction.date_time, format: "DD-MM-YY HH:mm:ss" }),
                                course_title: paymentGateWayPayLoad?.course?.title,
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

                //generate invoice
                await requestService({
                    requestServiceName: process.env.SERVICE_MEDIA,
                    onRequestStart: () => logger.info("Generating Invoice"),
                    requestPath: "templated/pdf",
                    requestMethod: "POST",
                    requestPostBody: {
                        template: "invoice",
                        injects: {
                            invoice_date: getFormattedDate({ date: paymentGateWayPayLoad.transaction.date_time, format: "DD-MM-YY" }),
                            transaction_id: enrollmentTransactionId,
                            course_title: paymentGateWayPayLoad?.course?.title,
                            user_name: `${paymentGateWayPayLoad?.user?.firstName} ${paymentGateWayPayLoad?.user?.lastName}`,
                            user_email: paymentGateWayPayLoad?.user?.email,
                            user_phone: paymentGateWayPayLoad?.user?.phone,
                            validity: getFormattedDate({ date: paymentGateWayPayLoad?.course?.validity, format: "DD-MM-YY" }),
                            payment_date: getFormattedDate({ date: paymentGateWayPayLoad.transaction.date_time, format: "DD-MM-YY HH:mm:ss" }),
                            cgst_percentage: cgst,
                            sgst_percentage: sgst,
                            price_original: paymentGateWayPayLoad?.course?.fees,
                            price_pre_tax: paymentGateWayPayLoad?.transaction?.preTaxAmount,
                            discount: paymentGateWayPayLoad?.transaction?.discount,
                            coupon_code: paymentGateWayPayLoad?.transaction?.couponCode || "No Coupon Code",
                            total_tax: (Number(paymentGateWayPayLoad?.transaction?.cgst) + Number(paymentGateWayPayLoad?.transaction?.sgst)).toFixed(2),
                            cgst: paymentGateWayPayLoad?.transaction?.cgst,
                            sgst: paymentGateWayPayLoad?.transaction?.sgst,
                            price_pay: paymentGateWayPayLoad?.transaction?.amount,
                            price_pay_words: libNumbersToWords.toWords(paymentGateWayPayLoad?.transaction?.amount).toUpperCase(),
                            received_by: "PayU",
                            mode_payment: "Online",
                            note: "NA",
                        },
                    },
                    onResponseReceieved: (generatedInvoice, responseCode) => {
                        if (generatedInvoice?.cdn_url && responseCode === 201) {
                            logger.success(`Invoice For Transaction - ${enrollmentTransactionId} Generated !`);
                            paymentGateWayPayLoad.transaction.invoice = generatedInvoice.cdn_url;
                            updateEnrollmentTransactionInvoiceById({ id: enrollmentTransactionId, invoice: generatedInvoice.cdn_url });
                        } else {
                            logger.error(
                                `Failed To Generate Invoice For Transaction - ${enrollmentTransactionId} - Media Responded With ${JSON.stringify(generatedInvoice)}`,
                            );
                        }
                    },
                });

                //send notification emails
                await requestService({
                    requestServiceName: process.env.SERVICE_MAILER,
                    onRequestStart: () => logger.info("Sending Enrollment Transcation Email"),
                    requestMethod: "POST",
                    parseResponseBody: false,
                    requestPostBody: {
                        to: paymentGateWayPayLoad?.user?.email,
                        subject: "Course Enrollment Transaction",
                        template: "enrollment",
                        injects: {
                            user_name: `${paymentGateWayPayLoad?.user?.firstName} ${paymentGateWayPayLoad?.user?.lastName}`,
                            course_title: paymentGateWayPayLoad?.course?.title,
                            amount: paymentGateWayPayLoad?.transaction?.amount,
                            invoice: paymentGateWayPayLoad.transaction.invoice,
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
        }),
    );

    const paymentGateWayPayLoad = { ...verifiedPaymentGatewayPayLoads?.find(({ transaction }) => transaction?.id == req.params.id) };

    res.status(200).json({
        transaction: { paid: paymentGateWayPayLoad?.transaction?.paid },
        course: paymentGateWayPayLoad?.course,
        type: paymentGateWayPayLoad?.type,
        exam_series_id: paymentGateWayPayLoad?.exam_series_id,
        examSeries: paymentGateWayPayLoad?.examSeries,
    });
});

module.exports = router;
