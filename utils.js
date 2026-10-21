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
 * Normalize India mobile to 10 digits for DB storage.
 * Accepts 9876543210, 919876543210, +919876543210.
 * Returns { phone } or { error }.
 */
function normalizeIndianPhone(raw) {
    if (raw == null || raw === "") {
        return { error: "Missing or Invalid Phone" };
    }
    let digits = String(raw).replace(/\D/g, "");
    if (digits.length === 12 && digits.startsWith("91")) {
        digits = digits.slice(2);
    } else if (digits.length === 11 && digits.startsWith("0")) {
        digits = digits.slice(1);
    }
    if (!/^[6-9]\d{9}$/.test(digits)) {
        return { error: "Missing or Invalid Phone" };
    }
    return { phone: digits };
}

function toMsg91Mobile(tenDigitPhone) {
    return `91${tenDigitPhone}`;
}

/**
 * App datetimes are stored as MySQL DATETIME / "YYYY-MM-DD HH:mm" wall-clock values in
 * Asia/Kolkata (IST). Use these helpers for parse/compare — never raw `new Date(mysqlString)`
 * on UTC hosts (shifts windows by 5.5h).
 */
const APP_TZ_OFFSET_MINUTES = 330; // Asia/Kolkata

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

function formatAppDateTime(value = new Date()) {
    return libMoment(value).utcOffset(APP_TZ_OFFSET_MINUTES).format("YYYY-MM-DD HH:mm:ss");
}

function isWithinAppDateWindow({ start_at, end_at, graceMs = 0, now = Date.now() }) {
    const start = parseAppDateTime(start_at);
    const end = parseAppDateTime(end_at);
    if (!Number.isFinite(start) || !Number.isFinite(end)) return false;
    return now >= start && now <= end + Number(graceMs || 0);
}

module.exports = {
    generateToken,
    getDeviceDescriptionByFingerPrint,
    verifyPaymentGatewayPayLoadStatus,
    getDateByInterval,
    getFormattedDate,
    getDifferenceOfDates,
    hasRequiredAuthority,
    normalizeIndianPhone,
    toMsg91Mobile,
    parseAppDateTime,
    formatAppDateTime,
    isWithinAppDateWindow,
    APP_TZ_OFFSET_MINUTES,
};
