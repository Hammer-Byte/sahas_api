const axios = require("axios");

const CHOGHADIYA_LOCATION = Object.freeze({
    latitude: 23.0225,
    longitude: 72.5714,
    city: "Ahmedabad",
    timeZone: "Asia/Kolkata",
});

const DAY_SEQUENCES = Object.freeze({
    0: ["Udveg", "Chal", "Labh", "Amrut", "Kaal", "Shubh", "Rog", "Udveg"],
    1: ["Amrut", "Kaal", "Shubh", "Rog", "Udveg", "Chal", "Labh", "Amrut"],
    2: ["Rog", "Udveg", "Chal", "Labh", "Amrut", "Kaal", "Shubh", "Rog"],
    3: ["Labh", "Amrut", "Kaal", "Shubh", "Rog", "Udveg", "Chal", "Labh"],
    4: ["Shubh", "Rog", "Udveg", "Chal", "Labh", "Amrut", "Kaal", "Shubh"],
    5: ["Chal", "Labh", "Amrut", "Kaal", "Shubh", "Rog", "Udveg", "Chal"],
    6: ["Kaal", "Shubh", "Rog", "Udveg", "Chal", "Labh", "Amrut", "Kaal"],
});

const NIGHT_SEQUENCES = Object.freeze({
    0: ["Shubh", "Amrut", "Chal", "Rog", "Kaal", "Labh", "Udveg", "Shubh"],
    1: ["Chal", "Rog", "Kaal", "Labh", "Udveg", "Shubh", "Amrut", "Chal"],
    2: ["Kaal", "Labh", "Udveg", "Shubh", "Amrut", "Chal", "Rog", "Kaal"],
    3: ["Udveg", "Shubh", "Amrut", "Chal", "Rog", "Kaal", "Labh", "Udveg"],
    4: ["Amrut", "Chal", "Rog", "Kaal", "Labh", "Udveg", "Shubh", "Amrut"],
    5: ["Rog", "Kaal", "Labh", "Udveg", "Shubh", "Amrut", "Chal", "Rog"],
    6: ["Labh", "Udveg", "Shubh", "Amrut", "Chal", "Rog", "Kaal", "Labh"],
});

function parseLocalDate(dateStr) {
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day);
}

function formatLocalDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function isValidDateString(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = parseLocalDate(value);
    return formatLocalDate(parsed) === value;
}

function addDays(dateStr, days) {
    const date = parseLocalDate(dateStr);
    date.setDate(date.getDate() + days);
    return formatLocalDate(date);
}

function toAladhanDate(dateStr) {
    const [year, month, day] = dateStr.split("-");
    return `${day}-${month}-${year}`;
}

function parseApiTime(dateStr, value) {
    const match = String(value || "").match(/^(\d{1,2}):(\d{2})/);
    if (!match) throw new Error("Invalid sunrise/sunset time from prayer-times API");

    return new Date(`${dateStr}T${match[1].padStart(2, "0")}:${match[2]}:00+05:30`);
}

function createPeriods(sequence, start, end, scope) {
    const duration = (end.getTime() - start.getTime()) / sequence.length;

    return sequence.map((name, index) => ({
        name_en: name,
        scope,
        period: index + 1,
        start: new Date(start.getTime() + duration * index).toISOString(),
        end: new Date(start.getTime() + duration * (index + 1)).toISOString(),
    }));
}

async function getPrayerTimings(dateStr) {
    const response = await axios.get(`https://api.aladhan.com/v1/timings/${toAladhanDate(dateStr)}`, {
        params: {
            latitude: CHOGHADIYA_LOCATION.latitude,
            longitude: CHOGHADIYA_LOCATION.longitude,
            method: 1,
        },
        timeout: 8000,
    });

    if (response.status !== 200 || response.data?.code !== 200) {
        throw new Error("Prayer-times API returned an unsuccessful response");
    }

    return response.data.data.timings;
}

async function getChoghadiyaForDate(dateStr) {
    const nextDateStr = addDays(dateStr, 1);
    const [todayTimings, tomorrowTimings] = await Promise.all([
        getPrayerTimings(dateStr),
        getPrayerTimings(nextDateStr),
    ]);

    const sunrise = parseApiTime(dateStr, todayTimings?.Sunrise);
    const sunset = parseApiTime(dateStr, todayTimings?.Sunset);
    const nextSunrise = parseApiTime(nextDateStr, tomorrowTimings?.Sunrise);
    const weekday = parseLocalDate(dateStr).getDay();

    return {
        date: dateStr,
        location: CHOGHADIYA_LOCATION,
        source: "AlAdhan prayer-times API",
        day: createPeriods(DAY_SEQUENCES[weekday], sunrise, sunset, "day"),
        night: createPeriods(NIGHT_SEQUENCES[weekday], sunset, nextSunrise, "night"),
    };
}

module.exports = { getChoghadiyaForDate, isValidDateString };
