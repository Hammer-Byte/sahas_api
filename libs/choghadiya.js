const axios = require("axios");
const { logger } = require("sahas_utils");

const NAVAMSHA_CHOGHADIYA_URL = "https://api.navamsha.in/api/v1/panchang/choghadiya";

function getChoghadiyaParamsFromEnv() {
    const latitude = Number(process.env.CHOGHADIYA_LATITUDE);
    const longitude = Number(process.env.CHOGHADIYA_LONGITUDE);
    const timezone = Number(process.env.CHOGHADIYA_TIMEZONE);
    const hours = Number(process.env.CHOGHADIYA_HOURS);
    const minutes = Number(process.env.CHOGHADIYA_MINUTES);

    if (![latitude, longitude, timezone, hours, minutes].every(Number.isFinite)) {
        throw new Error(
            "Missing or Invalid CHOGHADIYA_LATITUDE, CHOGHADIYA_LONGITUDE, CHOGHADIYA_TIMEZONE, CHOGHADIYA_HOURS or CHOGHADIYA_MINUTES",
        );
    }
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        throw new Error("Invalid CHOGHADIYA_HOURS or CHOGHADIYA_MINUTES");
    }

    return { latitude, longitude, timezone, hours, minutes };
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function utcIsoToIstWallClock(iso) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return null;

    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    }).formatToParts(date);

    const map = {};
    for (const part of parts) {
        if (part.type !== "literal") map[part.type] = part.value;
    }

    const hour = map.hour === "24" ? "00" : map.hour;
    return `${map.year}-${map.month}-${map.day} ${hour}:${map.minute}:${map.second}`;
}

function mapPeriodSlots(period, slots = []) {
    return (slots || [])
        .map((item) => {
            const start_at = utcIsoToIstWallClock(item.start);
            const end_at = utcIsoToIstWallClock(item.end);
            if (!start_at || !end_at || !item.name) return null;
            return {
                period,
                slot: Number(item.slot) || 0,
                name: String(item.name),
                start_at,
                end_at,
            };
        })
        .filter(Boolean);
}

async function fetchChoghadiyaForDate({ year, month, date, latitude, longitude, timezone, hours, minutes }) {
    const apiKey = process.env.NAVAMSHA_API_KEY;
    if (!apiKey) {
        throw new Error("NAVAMSHA_API_KEY is not configured");
    }
    if (![latitude, longitude, timezone, hours, minutes].every(Number.isFinite)) {
        throw new Error("Missing or Invalid choghadiya location parameters");
    }

    const response = await axios.post(
        NAVAMSHA_CHOGHADIYA_URL,
        {
            year,
            month,
            date,
            hours,
            minutes,
            latitude,
            longitude,
            timezone,
        },
        {
            headers: {
                "X-API-Key": apiKey,
                "Content-Type": "application/json",
            },
            timeout: 45000,
            validateStatus: () => true,
        },
    );

    if (response.status === 429) {
        const error = new Error("Navamsha rate limit (429)");
        error.response = { status: 429, data: response.data };
        throw error;
    }

    if (response.status < 200 || response.status >= 300) {
        const error = new Error(response.data?.message || `Navamsha request failed (${response.status})`);
        error.response = { status: response.status, data: response.data };
        throw error;
    }

    const payload = response.data;
    if (payload?.statusCode !== 200 || !payload?.output) {
        throw new Error(payload?.message || "Navamsha choghadiya request failed");
    }

    const daySlots = mapPeriodSlots("day", payload.output.day);
    const nightSlots = mapPeriodSlots("night", payload.output.night);
    if (!daySlots.length && !nightSlots.length) {
        throw new Error("Navamsha returned empty choghadiya slots");
    }

    return [...daySlots, ...nightSlots];
}

async function fetchChoghadiyaForDateWithRetry(params, { maxAttempts = 8 } = {}) {
    let lastError;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
            return await fetchChoghadiyaForDate(params);
        } catch (error) {
            lastError = error;
            const status = error?.response?.status;
            const retryable = status === 429 || status === 502 || status === 503 || status === 504 || !status;
            if (!retryable || attempt === maxAttempts) {
                throw error;
            }

            const base = status === 429 ? 4000 : 800;
            const delayMs = Math.min(60000, base * Math.pow(2, attempt - 1)) + Math.floor(Math.random() * 400);
            logger.info(
                `Choghadiya retry ${attempt}/${maxAttempts} for ${params.year}-${params.month}-${params.date} after ${delayMs}ms (${error.message})`,
            );
            await sleep(delayMs);
        }
    }

    throw lastError;
}

function buildYearDays(year) {
    const days = [];
    const cursor = new Date(year, 0, 1);
    const end = new Date(year, 11, 31);

    while (cursor <= end) {
        days.push({
            year: cursor.getFullYear(),
            month: cursor.getMonth() + 1,
            date: cursor.getDate(),
            dateKey: `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`,
        });
        cursor.setDate(cursor.getDate() + 1);
    }

    return days;
}

async function fetchYearChoghadiya({ year, latitude, longitude, timezone, hours, minutes, onDayFetched, onProgress } = {}) {
    const envParams = getChoghadiyaParamsFromEnv();
    const params = {
        latitude: latitude ?? envParams.latitude,
        longitude: longitude ?? envParams.longitude,
        timezone: timezone ?? envParams.timezone,
        hours: hours ?? envParams.hours,
        minutes: minutes ?? envParams.minutes,
    };

    const days = buildYearDays(year);
    const delayBetweenDaysMs = Math.max(150, Number(process.env.CHOGHADIYA_DAY_DELAY_MS || 350));
    let synced = 0;
    const failures = [];

    for (let index = 0; index < days.length; index += 1) {
        const day = days[index];
        try {
            const slots = await fetchChoghadiyaForDateWithRetry({
                year: day.year,
                month: day.month,
                date: day.date,
                ...params,
            });

            if (typeof onDayFetched === "function") {
                const saved = await onDayFetched({ date: day.dateKey, slots });
                if (saved === false) {
                    throw new Error("Failed To Save Choghadiya");
                }
            }

            synced += 1;
            if (typeof onProgress === "function") {
                onProgress({ date: day.dateKey, index: index + 1, total: days.length, synced });
            }
        } catch (error) {
            logger.error(`fetchYearChoghadiya ${day.dateKey}: ${error.message || error}`);
            failures.push({ date: day.dateKey, error: error.message || String(error) });
        }

        if (index < days.length - 1) {
            await sleep(delayBetweenDaysMs);
        }
    }

    if (failures.length) {
        const retryDates = failures.map((item) => item.date);
        const remaining = [];
        logger.info(`Retrying ${retryDates.length} failed choghadiya days`);

        for (let index = 0; index < retryDates.length; index += 1) {
            const dateKey = retryDates[index];
            const [retryYear, retryMonth, retryDate] = dateKey.split("-").map(Number);
            try {
                await sleep(delayBetweenDaysMs + 500);
                const slots = await fetchChoghadiyaForDateWithRetry({
                    year: retryYear,
                    month: retryMonth,
                    date: retryDate,
                    ...params,
                });
                if (typeof onDayFetched === "function") {
                    const saved = await onDayFetched({ date: dateKey, slots });
                    if (saved === false) {
                        throw new Error("Failed To Save Choghadiya");
                    }
                }
                synced += 1;
            } catch (error) {
                logger.error(`fetchYearChoghadiya retry ${dateKey}: ${error.message || error}`);
                remaining.push({ date: dateKey, error: error.message || String(error) });
            }
        }

        failures.length = 0;
        failures.push(...remaining);
    }

    return {
        year,
        days_requested: days.length,
        days_synced: synced,
        failures,
        params,
        complete: synced === days.length && failures.length === 0,
    };
}

module.exports = {
    getChoghadiyaParamsFromEnv,
    fetchChoghadiyaForDate,
    fetchChoghadiyaForDateWithRetry,
    fetchYearChoghadiya,
};
