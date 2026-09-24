const libCrypto = require("crypto");
const { logger } = require("sahas_utils");
const { PAYU_VERIFICATION_COMMAND } = require("./constants");
const libMoment = require("moment");

function generateToken() {
    const timestamp = Date.now().toString(); // Current timestamp in milliseconds - 1
    const randomPart = Math.random().toString(36).substring(2, 18); // Random alphanumeric string
    const token = (timestamp + randomPart).substring(0, 36); // Ensure token is 32 characters long
    return token;
}

function getDateByInterval({ baseDate = libMoment(), days }) {
    return libMoment(baseDate).add(days, "days");
}

function getFormattedDate({ date, format = "YYYY-MM-DD" }) {
    return libMoment(date).format(format);
}

function getDifferenceOfDates({ start_date, end_date }) {
    return libMoment(end_date).diff(libMoment(start_date), "days");
}

function generateSHA512(targetString) {
    return libCrypto.createHash("sha512").update(targetString).digest("hex");
}

const getDeviceDescriptionByFingerPrint = (fingerPrint) => Buffer.from(fingerPrint, "base64").toString("utf8");

async function verifyPaymentGatewayPayLoadStatus(paymentGateWayPayLoad) {
    if (paymentGateWayPayLoad?.transaction?.amount > 0) {
        const merchantKey = process.env.PAYU_MERCHANT_KEY;
        const merchantSalt = process.env.PAYU_MERCHANT_SALT;
        const verificationAPI = process.env.PAYU_VERIFICATION_URL;

        const headers = new Headers();
        headers.append("Content-Type", "application/x-www-form-urlencoded");
        const urlencoded = new URLSearchParams();
        urlencoded.append("key", merchantKey);
        urlencoded.append("command", PAYU_VERIFICATION_COMMAND);
        urlencoded.append("var1", paymentGateWayPayLoad?.transaction?.id);
        urlencoded.append("hash", generateSHA512(`${merchantKey}|${PAYU_VERIFICATION_COMMAND}|${paymentGateWayPayLoad?.transaction?.id}|${merchantSalt}`));

        const fetchOptions = {
            method: "POST",
            headers: headers,
            body: urlencoded,
            redirect: "follow",
        };
        try {
            const response = await fetch(verificationAPI, fetchOptions);
            const verificationResponse = await response.json();
            paymentGateWayPayLoad.transaction.paid = verificationResponse?.transaction_details[paymentGateWayPayLoad?.transaction?.id]?.status === "success";
        } catch (error) {
            logger.error(`Failed to Check Status For Transaction - ${paymentGateWayPayLoad.transaction.id} - error ${error}`);
        } finally {
            return paymentGateWayPayLoad;
        }
    }

    //must be free course
    paymentGateWayPayLoad.transaction.paid = true;
    return paymentGateWayPayLoad;
}

const hasRequiredAuthority = (authorities, requiredAuthority) => authorities.includes(requiredAuthority);

/**
 * App exam/series datetimes are stored as MySQL DATETIME / "YYYY-MM-DD HH:mm" wall-clock
 * values in Asia/Kolkata (IST). On UTC servers, `new Date("2026-09-24 21:00:00")` treats
 * that string as UTC and shifts the window by 5.5h — use this helper for comparisons.
 */
function parseAppDateTime(value) {
    if (value == null || value === "") return NaN;
    if (value instanceof Date) return value.getTime();

    const raw = String(value).trim();
    if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(raw)) {
        return new Date(raw).getTime();
    }

    const dateTime = raw.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
    if (dateTime) {
        const [, year, month, day, hour, minute, second = "00"] = dateTime;
        return Date.parse(`${year}-${month}-${day}T${hour}:${minute}:${second}+05:30`);
    }

    const dateOnly = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnly) {
        return Date.parse(`${raw}T00:00:00+05:30`);
    }

    return new Date(raw).getTime();
}

module.exports = {
    generateToken,
    getDeviceDescriptionByFingerPrint,
    verifyPaymentGatewayPayLoadStatus,
    getDateByInterval,
    getFormattedDate,
    getDifferenceOfDates,
    hasRequiredAuthority,
    parseAppDateTime,
};
