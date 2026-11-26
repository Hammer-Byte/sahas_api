const libExpress = require("express");
const { validateRequestBody, logger } = require("sahas_utils");
const { AUTHORITIES } = require("../constants");
const requires_authority = require("../middlewares/requires_authority");
const { getBatchesByUserId } = require("../db/batches");
const {
    getBatchSchedulesByBatchIdsAndWeekday,
    getBatchSchedulesByEventHandlerAndWeekday,
    getBatchSchedulesByBatchIds,
    getBatchSchedulesByEventHandler,
} = require("../db/batch_schedule");
const { getBatchEventsForUserBatchesOnDay, getBatchEventsForUserBatchesInRange } = require("../db/batch_events");
const {
    getUserEventsByUserIdOnDay,
    getUserEventsByUserIdInRange,
    getUserEventById,
    addUserEvent,
    updateUserEventById,
    deleteUserEventById,
} = require("../db/user_events");
const {
    getChoghadiyaSlotsByDate,
    deleteChoghadiyaSlotsExceptYear,
    countChoghadiyaDaysByYear,
    replaceChoghadiyaSlotsForDate,
} = require("../db/choghadiya");
const {
    getCalendarDateEntriesInRange,
    getCalendarDateEntryById,
    addCalendarDateEntry,
    updateCalendarDateEntryById,
    deleteCalendarDateEntryById,
} = require("../db/calendar_date_entries");
const {
    getAllCalendarMonthImages,
    getCalendarMonthImageByMonth,
    upsertCalendarMonthImage,
} = require("../db/calendar_month_images");
const { fetchYearChoghadiya, getChoghadiyaParamsFromEnv } = require("../libs/choghadiya");

const router = libExpress.Router();
const MAX_SUMMARY_DAYS = 62;
const AUSPICIOUS_NAMES = new Set(["Amrit", "Shubh", "Labh"]);
const INAUSPICIOUS_NAMES = new Set(["Rog", "Kaal", "Udveg"]);

function isCalendarDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split("-").map(Number);
    const check = new Date(Date.UTC(year, month - 1, day));
    return check.getUTCFullYear() === year && check.getUTCMonth() === month - 1 && check.getUTCDate() === day;
}

function choghadiyaQuality(name) {
    if (AUSPICIOUS_NAMES.has(name)) return "auspicious";
    if (INAUSPICIOUS_NAMES.has(name)) return "inauspicious";
    return "neutral";
}

function formatDateEntry(row) {
    if (!row) return null;
    const title = row.title || row.name || "";
    const isHoliday = row.is_holiday === true || row.is_holiday === 1 || row.is_holiday === "1";
    return {
        id: row.id,
        date: String(row.date).slice(0, 10),
        title,
        name: title,
        description: row.description || null,
        is_holiday: isHoliday,
        created_by: row.created_by ?? null,
    };
}

function parseIsHoliday(value) {
    return value === true || value === 1 || value === "1" || String(value).toLowerCase() === "true";
}

function formatChoghadiyaSlot(row) {
    return {
        period: row.period,
        slot: row.slot,
        name: row.name,
        quality: choghadiyaQuality(row.name),
        start_at: toWallClockDateTime(row.start_at),
        end_at: toWallClockDateTime(row.end_at),
    };
}

function toTimeString(value) {
    if (value == null) return null;
    if (typeof value === "string") {
        const match = value.match(/(\d{2}:\d{2}(?::\d{2})?)/);
        return match ? match[1] : value.slice(0, 8);
    }
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        // mysql TIME is decoded as a UTC Date (e.g. 16:30 → 1970-01-01T16:30:00.000Z).
        // Using local getHours() in IST shifts it to 22:00.
        const hh = String(value.getUTCHours()).padStart(2, "0");
        const mm = String(value.getUTCMinutes()).padStart(2, "0");
        const ss = String(value.getUTCSeconds()).padStart(2, "0");
        return `${hh}:${mm}:${ss}`;
    }
    return String(value);
}

function toWallClockDateTime(value) {
    if (value == null) return null;
    if (typeof value === "string") {
        const match = value.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/);
        if (match) return `${match[1]} ${match[2]}`;
        return value;
    }
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        const y = value.getFullYear();
        const mo = String(value.getMonth() + 1).padStart(2, "0");
        const d = String(value.getDate()).padStart(2, "0");
        const hh = String(value.getHours()).padStart(2, "0");
        const mm = String(value.getMinutes()).padStart(2, "0");
        return `${y}-${mo}-${d} ${hh}:${mm}`;
    }
    return String(value);
}

function dateInBatchRange(dateStr, start_date, end_date) {
    if (start_date) {
        const start = String(start_date).slice(0, 10);
        if (dateStr < start) return false;
    }
    if (end_date) {
        const end = String(end_date).slice(0, 10);
        if (dateStr > end) return false;
    }
    return true;
}

function dayBounds(dateStr) {
    return {
        day_start: `${dateStr} 00:00:00`,
        day_end: `${dateStr} 23:59:59`,
    };
}

function pushScheduleEvent(events, seen, schedule, dateStr) {
    if (!schedule.active && schedule.active !== 1) return;
    if (!dateInBatchRange(dateStr, schedule.start_date, schedule.end_date)) return;

    const startTime = toTimeString(schedule.start_time);
    const endTime = toTimeString(schedule.end_time);
    if (!startTime || !endTime) return;

    const key = `${schedule.batch_id}:${schedule.weekday}`;
    if (seen.has(key)) return;
    seen.add(key);

    events.push({
        id: `schedule:${schedule.batch_id}:${schedule.weekday}`,
        type: "BATCH_SCHEDULE",
        title: schedule.subject || schedule.batch_title || "Batch class",
        description: null,
        start_at: `${dateStr} ${startTime.slice(0, 5)}`,
        end_at: `${dateStr} ${endTime.slice(0, 5)}`,
        cancelled: false,
        batch_id: schedule.batch_id,
        batch_title: schedule.batch_title,
        branch_id: schedule.branch_id || null,
        branch_title: schedule.branch_title || null,
        subject: schedule.subject || null,
        event_handler: schedule.event_handler || null,
        event_handler_name: schedule.event_handler_name || null,
        editable: false,
    });
}

function parseLocalDate(dateStr) {
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day);
}

function formatLocalDate(date) {
    const y = date.getFullYear();
    const mo = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${mo}-${d}`;
}

function daysBetweenInclusive(fromStr, toStr) {
    const start = parseLocalDate(fromStr);
    const end = parseLocalDate(toStr);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return -1;
    return Math.floor((end - start) / 86400000) + 1;
}

function bumpSummary(summary, dateStr, amount = 1) {
    if (!summary[dateStr]) summary[dateStr] = { count: 0 };
    summary[dateStr].count += amount;
}

function wallClockDatePart(value) {
    const wall = toWallClockDateTime(value);
    if (!wall) return null;
    const match = String(wall).match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : null;
}

function forEachOverlappingDay(startAt, endAt, fromStr, toStr, callback) {
    const startDate = wallClockDatePart(startAt);
    const endDate = wallClockDatePart(endAt);
    if (!startDate || !endDate) return;

    let cursorStr = startDate < fromStr ? fromStr : startDate;
    const lastStr = endDate > toStr ? toStr : endDate;
    if (cursorStr > lastStr) return;

    const cursor = parseLocalDate(cursorStr);
    const last = parseLocalDate(lastStr);
    while (cursor <= last) {
        callback(formatLocalDate(cursor));
        cursor.setDate(cursor.getDate() + 1);
    }
}

function scheduleCountsTowardDay(schedule, dateStr) {
    if (!schedule.active && schedule.active !== 1) return false;
    if (!dateInBatchRange(dateStr, schedule.start_date, schedule.end_date)) return false;
    const startTime = toTimeString(schedule.start_time);
    const endTime = toTimeString(schedule.end_time);
    return !!(startTime && endTime);
}

router.get("/choghadiya", async (req, res) => {
    if (!req.user?.id) {
        return res.status(401).json({ error: "Authentication Required" });
    }

    const dateStr = typeof req.query.date === "string" ? req.query.date.trim() : "";
    if (!isCalendarDate(dateStr)) {
        return res.status(400).json({ error: "Missing or Invalid date (YYYY-MM-DD)" });
    }

    const slots = await getChoghadiyaSlotsByDate({ date: dateStr });

    const day = [];
    const night = [];
    for (const slot of slots) {
        const formatted = formatChoghadiyaSlot(slot);
        if (slot.period === "night") night.push(formatted);
        else day.push(formatted);
    }

    res.status(200).json({
        date: dateStr,
        day,
        night,
    });
});

router.post("/choghadiya/sync", requires_authority(AUTHORITIES.SYNC_CALENDAR_CHOGHADIYA), async (req, res) => {
    if (!process.env.NAVAMSHA_API_KEY) {
        return res.status(500).json({ error: "NAVAMSHA_API_KEY is not configured" });
    }

    const requiredBodyFields = ["year"];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);
    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    const year = Number(validatedRequestBody.year);
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
        return res.status(400).json({ error: "Missing or Invalid year" });
    }

    let params;
    try {
        params = getChoghadiyaParamsFromEnv();
    } catch (error) {
        return res.status(500).json({ error: error.message || "Choghadiya env is not configured" });
    }

    try {
        const result = await fetchYearChoghadiya({
            year,
            ...params,
            onDayFetched: async ({ date, slots }) => replaceChoghadiyaSlotsForDate({ date, slots }),
            onProgress: ({ date, index, total }) => {
                if (index === 1 || index === total || index % 30 === 0) {
                    logger.info(`Choghadiya sync progress ${index}/${total} (${date})`);
                }
            },
        });

        let storedDays;
        try {
            storedDays = await countChoghadiyaDaysByYear({ year });
        } catch (error) {
            logger.error(`Choghadiya sync count failed: ${error}`);
            return res.status(500).json({ error: "Failed To Verify Synced Choghadiya Days" });
        }

        if (!result.complete || storedDays < result.days_requested) {
            return res.status(502).json({
                error: `Incomplete Sync: Saved ${storedDays}/${result.days_requested} Days. Please Sync Again`,
                year: result.year,
                days_requested: result.days_requested,
                days_synced: result.days_synced,
                stored_days: storedDays,
                failure_count: result.failures?.length || 0,
                failures: result.failures?.slice(0, 10) || [],
            });
        }

        await deleteChoghadiyaSlotsExceptYear({ year });

        res.status(200).json({
            year: result.year,
            days_requested: result.days_requested,
            days_synced: result.days_synced,
            stored_days: storedDays,
            failure_count: 0,
            replaced: true,
            complete: true,
        });
    } catch (error) {
        res.status(502).json({ error: error.message || "Failed To Sync Choghadiya" });
    }
});

router.get("/date-entries", async (req, res) => {
    if (!req.user?.id) {
        return res.status(401).json({ error: "Authentication Required" });
    }

    const fromStr = typeof req.query.from === "string" ? req.query.from.trim() : "";
    const toStr = typeof req.query.to === "string" ? req.query.to.trim() : "";
    if (!isCalendarDate(fromStr) || !isCalendarDate(toStr)) {
        return res.status(400).json({ error: "Missing or Invalid from/to (YYYY-MM-DD)" });
    }

    const dayCount = daysBetweenInclusive(fromStr, toStr);
    if (dayCount < 1) {
        return res.status(400).json({ error: "Invalid range: to must be on or after from" });
    }
    if (dayCount > 400) {
        return res.status(400).json({ error: "Range too large (max 400 days)" });
    }

    const rows = await getCalendarDateEntriesInRange({ from: fromStr, to: toStr });
    const grouped = {};
    for (const row of rows) {
        const key = String(row.date).slice(0, 10);
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(formatDateEntry(row));
    }
    res.status(200).json(grouped);
});

// Backward-compatible alias: holiday entries only, first per date (old map shape).
router.get("/holidays", async (req, res) => {
    if (!req.user?.id) {
        return res.status(401).json({ error: "Authentication Required" });
    }

    const fromStr = typeof req.query.from === "string" ? req.query.from.trim() : "";
    const toStr = typeof req.query.to === "string" ? req.query.to.trim() : "";
    if (!isCalendarDate(fromStr) || !isCalendarDate(toStr)) {
        return res.status(400).json({ error: "Missing or Invalid from/to (YYYY-MM-DD)" });
    }

    const dayCount = daysBetweenInclusive(fromStr, toStr);
    if (dayCount < 1) {
        return res.status(400).json({ error: "Invalid range: to must be on or after from" });
    }
    if (dayCount > 400) {
        return res.status(400).json({ error: "Range too large (max 400 days)" });
    }

    const rows = await getCalendarDateEntriesInRange({ from: fromStr, to: toStr, is_holiday: true });
    const holidays = {};
    for (const row of rows) {
        const key = String(row.date).slice(0, 10);
        if (!holidays[key]) holidays[key] = formatDateEntry(row);
    }
    res.status(200).json(holidays);
});

router.post("/date-entries", requires_authority(AUTHORITIES.CREATE_CALENDAR_DATE_ENTRY), async (req, res) => {
    const requiredBodyFields = ["date", "title"];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    const date = String(validatedRequestBody.date).trim();
    const title = String(validatedRequestBody.title).trim();
    const description =
        req.body.description != null && String(req.body.description).trim() !== "" ? String(req.body.description).trim() : null;
    const is_holiday = parseIsHoliday(req.body.is_holiday);

    if (!isCalendarDate(date)) {
        return res.status(400).json({ error: "Invalid date (YYYY-MM-DD)" });
    }
    if (!title) {
        return res.status(400).json({ error: "title is required" });
    }

    try {
        const id = await addCalendarDateEntry({
            date,
            title,
            description,
            is_holiday,
            created_by: req.user.id,
        });
        if (!id) {
            return res.status(400).json({ error: "Failed To Add Calendar Entry" });
        }
        return res.status(201).json(formatDateEntry(await getCalendarDateEntryById({ id })));
    } catch (error) {
        return res.status(400).json({ error: error?.sqlMessage || error?.message || "Failed To Add Calendar Entry" });
    }
});

router.patch("/date-entries", requires_authority(AUTHORITIES.UPDATE_CALENDAR_DATE_ENTRY), async (req, res) => {
    const requiredBodyFields = ["id", "date", "title"];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    const id = Number(validatedRequestBody.id);
    const date = String(validatedRequestBody.date).trim();
    const title = String(validatedRequestBody.title).trim();
    const description =
        req.body.description != null && String(req.body.description).trim() !== "" ? String(req.body.description).trim() : null;
    const is_holiday = parseIsHoliday(req.body.is_holiday);

    if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({ error: "Invalid id" });
    }
    if (!isCalendarDate(date)) {
        return res.status(400).json({ error: "Invalid date (YYYY-MM-DD)" });
    }
    if (!title) {
        return res.status(400).json({ error: "title is required" });
    }

    const existing = await getCalendarDateEntryById({ id });
    if (!existing) {
        return res.status(404).json({ error: "Calendar Entry Not Found" });
    }

    try {
        const updated = await updateCalendarDateEntryById({
            id,
            date,
            title,
            description,
            is_holiday,
        });
        if (!updated) {
            return res.status(400).json({ error: "Failed To Update Calendar Entry" });
        }
        return res.status(200).json(formatDateEntry(await getCalendarDateEntryById({ id })));
    } catch (error) {
        return res.status(400).json({ error: error?.sqlMessage || error?.message || "Failed To Update Calendar Entry" });
    }
});

router.delete("/date-entries/:id", requires_authority(AUTHORITIES.DELETE_CALENDAR_DATE_ENTRY), async (req, res) => {
    if (!req.params.id) {
        return res.status(400).json({ error: "Missing Entry Id" });
    }

    const deleted = await deleteCalendarDateEntryById({ id: req.params.id });
    if (!deleted) {
        return res.status(404).json({ error: "Calendar Entry Not Found" });
    }

    res.sendStatus(204);
});

router.get("/month-images", async (req, res) => {
    if (!req.user?.id) {
        return res.status(401).json({ error: "Authentication Required" });
    }

    const month = req.query.month != null && req.query.month !== "" ? Number(req.query.month) : null;
    if (month != null) {
        if (!Number.isInteger(month) || month < 1 || month > 12) {
            return res.status(400).json({ error: "month must be 1-12" });
        }
        const row = await getCalendarMonthImageByMonth({ month });
        return res.status(200).json(row || null);
    }

    res.status(200).json(await getAllCalendarMonthImages());
});

router.patch("/month-images", requires_authority(AUTHORITIES.UPDATE_CALENDAR_MONTH_IMAGE), async (req, res) => {
    const requiredBodyFields = ["month"];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    const month = Number(validatedRequestBody.month);
    if (!Number.isInteger(month) || month < 1 || month > 12) {
        return res.status(400).json({ error: "month must be 1-12" });
    }

    const image_url = req.body.image_url != null && String(req.body.image_url).trim() !== "" ? String(req.body.image_url).trim() : null;

    try {
        const saved = await upsertCalendarMonthImage({
            month,
            image_url,
            updated_by: req.user.id,
        });
        if (!saved) {
            return res.status(400).json({ error: "Failed To Save Month Image" });
        }
        return res.status(200).json(saved);
    } catch (error) {
        return res.status(400).json({ error: error?.sqlMessage || error?.message || "Failed To Save Month Image" });
    }
});

router.get("/summary", async (req, res) => {
    if (!req.user?.id) {
        return res.status(401).json({ error: "Authentication Required" });
    }

    const fromStr = typeof req.query.from === "string" ? req.query.from.trim() : "";
    const toStr = typeof req.query.to === "string" ? req.query.to.trim() : "";
    if (!isCalendarDate(fromStr) || !isCalendarDate(toStr)) {
        return res.status(400).json({ error: "Missing or Invalid from/to (YYYY-MM-DD)" });
    }

    const dayCount = daysBetweenInclusive(fromStr, toStr);
    if (dayCount < 1) {
        return res.status(400).json({ error: "Invalid range: to must be on or after from" });
    }
    if (dayCount > MAX_SUMMARY_DAYS) {
        return res.status(400).json({ error: `Range too large (max ${MAX_SUMMARY_DAYS} days)` });
    }

    const range_start = `${fromStr} 00:00:00`;
    const range_end = `${toStr} 23:59:59`;
    const summary = {};

    const memberships = await getBatchesByUserId({ user_id: req.user.id });
    const activeBatches = memberships.filter((batch) => batch.active !== 0 && batch.active !== false);
    const batch_ids = activeBatches.map((batch) => batch.id);

    const [batchSchedules, handlerSchedules, batchEvents, userEvents] = await Promise.all([
        batch_ids.length ? getBatchSchedulesByBatchIds({ batch_ids }) : Promise.resolve([]),
        getBatchSchedulesByEventHandler({ user_id: req.user.id }),
        batch_ids.length
            ? getBatchEventsForUserBatchesInRange({ batch_ids, range_start, range_end })
            : Promise.resolve([]),
        getUserEventsByUserIdInRange({ user_id: req.user.id, range_start, range_end }),
    ]);

    const schedulesByWeekday = new Map();
    const seenScheduleKeys = new Set();
    for (const schedule of [...batchSchedules, ...handlerSchedules]) {
        const key = `${schedule.batch_id}:${schedule.weekday}`;
        if (seenScheduleKeys.has(key)) continue;
        seenScheduleKeys.add(key);
        const weekday = Number(schedule.weekday);
        if (!schedulesByWeekday.has(weekday)) schedulesByWeekday.set(weekday, []);
        schedulesByWeekday.get(weekday).push(schedule);
    }

    const cursor = parseLocalDate(fromStr);
    const last = parseLocalDate(toStr);
    while (cursor <= last) {
        const dateStr = formatLocalDate(cursor);
        const weekday = cursor.getDay();
        const daySchedules = schedulesByWeekday.get(weekday) || [];
        for (const schedule of daySchedules) {
            if (scheduleCountsTowardDay(schedule, dateStr)) {
                bumpSummary(summary, dateStr);
            }
        }
        cursor.setDate(cursor.getDate() + 1);
    }

    const seenBatchEvents = new Set();
    for (const batchEvent of batchEvents) {
        if (seenBatchEvents.has(batchEvent.id)) continue;
        seenBatchEvents.add(batchEvent.id);
        forEachOverlappingDay(batchEvent.start_at, batchEvent.end_at, fromStr, toStr, (dateStr) => {
            bumpSummary(summary, dateStr);
        });
    }

    for (const userEvent of userEvents) {
        forEachOverlappingDay(userEvent.start_at, userEvent.end_at, fromStr, toStr, (dateStr) => {
            bumpSummary(summary, dateStr);
        });
    }

    res.status(200).json(summary);
});

router.get("/", async (req, res) => {
    if (!req.user?.id) {
        return res.status(401).json({ error: "Authentication Required" });
    }

    const dateStr = typeof req.query.date === "string" ? req.query.date.trim() : "";
    if (!isCalendarDate(dateStr)) {
        return res.status(400).json({ error: "Missing or Invalid date (YYYY-MM-DD)" });
    }

    const [year, month, day] = dateStr.split("-").map(Number);
    const weekday = new Date(year, month - 1, day).getDay();
    const { day_start, day_end } = dayBounds(dateStr);

    const memberships = await getBatchesByUserId({ user_id: req.user.id });
    const activeBatches = memberships.filter((batch) => batch.active !== 0 && batch.active !== false);
    const batch_ids = activeBatches.map((batch) => batch.id);

    const events = [];
    const seenSchedules = new Set();

    if (batch_ids.length) {
        const schedules = await getBatchSchedulesByBatchIdsAndWeekday({ batch_ids, weekday });
        for (const schedule of schedules) {
            pushScheduleEvent(events, seenSchedules, schedule, dateStr);
        }

        const batchEvents = await getBatchEventsForUserBatchesOnDay({ batch_ids, day_start, day_end });
        const seenBatchEvents = new Set();
        for (const batchEvent of batchEvents) {
            if (seenBatchEvents.has(batchEvent.id)) continue;
            seenBatchEvents.add(batchEvent.id);
            events.push({
                id: `batch_event:${batchEvent.id}`,
                type: "BATCH_EVENT",
                title: batchEvent.title,
                description: batchEvent.description,
                start_at: toWallClockDateTime(batchEvent.start_at),
                end_at: toWallClockDateTime(batchEvent.end_at),
                cancelled: !!batchEvent.cancelled,
                batch_id: batchEvent.batch_id,
                batch_title: batchEvent.batch_title,
                branch_id: batchEvent.branch_id || null,
                branch_title: batchEvent.branch_title || null,
                editable: false,
            });
        }
    }

    const handlerSchedules = await getBatchSchedulesByEventHandlerAndWeekday({
        user_id: req.user.id,
        weekday,
    });
    for (const schedule of handlerSchedules) {
        pushScheduleEvent(events, seenSchedules, schedule, dateStr);
    }

    const userEvents = await getUserEventsByUserIdOnDay({
        user_id: req.user.id,
        day_start,
        day_end,
    });
    for (const userEvent of userEvents) {
        events.push({
            id: `user_event:${userEvent.id}`,
            type: "USER_EVENT",
            title: userEvent.title,
            description: userEvent.description,
            start_at: toWallClockDateTime(userEvent.start_at),
            end_at: toWallClockDateTime(userEvent.end_at),
            cancelled: false,
            batch_id: null,
            batch_title: null,
            branch_id: null,
            branch_title: null,
            editable: true,
            source_id: userEvent.id,
        });
    }

    events.sort((a, b) => String(a.start_at).localeCompare(String(b.start_at)));
    res.status(200).json(events);
});

function validateUserEventBody(validatedRequestBody) {
    const title = String(validatedRequestBody.title || "").trim();
    if (!title) {
        return { error: "Title is required" };
    }

    const start_at = String(validatedRequestBody.start_at || "").trim();
    const end_at = String(validatedRequestBody.end_at || "").trim();
    if (!start_at || !end_at) {
        return { error: "Missing start_at or end_at" };
    }
    if (end_at <= start_at) {
        return { error: "End must be after start" };
    }

    return { title, start_at, end_at };
}

function listDateForRangeEvent(startAt, fromStr) {
    const startDate = wallClockDatePart(startAt);
    if (!startDate) return fromStr;
    return startDate < fromStr ? fromStr : startDate;
}

router.get("/events", async (req, res) => {
    if (!req.user?.id) {
        return res.status(401).json({ error: "Authentication Required" });
    }

    const fromStr = typeof req.query.from === "string" ? req.query.from.trim() : "";
    const toStr = typeof req.query.to === "string" ? req.query.to.trim() : "";
    if (!isCalendarDate(fromStr) || !isCalendarDate(toStr)) {
        return res.status(400).json({ error: "Missing or Invalid from/to (YYYY-MM-DD)" });
    }

    const dayCount = daysBetweenInclusive(fromStr, toStr);
    if (dayCount < 1) {
        return res.status(400).json({ error: "Invalid range: to must be on or after from" });
    }
    if (dayCount > MAX_SUMMARY_DAYS) {
        return res.status(400).json({ error: `Range too large (max ${MAX_SUMMARY_DAYS} days)` });
    }

    const range_start = `${fromStr} 00:00:00`;
    const range_end = `${toStr} 23:59:59`;

    const memberships = await getBatchesByUserId({ user_id: req.user.id });
    const activeBatches = memberships.filter((batch) => batch.active !== 0 && batch.active !== false);
    const batch_ids = activeBatches.map((batch) => batch.id);

    const [batchEvents, userEvents] = await Promise.all([
        batch_ids.length
            ? getBatchEventsForUserBatchesInRange({ batch_ids, range_start, range_end })
            : Promise.resolve([]),
        getUserEventsByUserIdInRange({ user_id: req.user.id, range_start, range_end }),
    ]);

    const events = [];
    const seenBatchEvents = new Set();
    for (const batchEvent of batchEvents) {
        if (seenBatchEvents.has(batchEvent.id)) continue;
        seenBatchEvents.add(batchEvent.id);
        events.push({
            id: `batch_event:${batchEvent.id}`,
            type: "BATCH_EVENT",
            title: batchEvent.title,
            description: batchEvent.description,
            date: listDateForRangeEvent(batchEvent.start_at, fromStr),
            start_at: toWallClockDateTime(batchEvent.start_at),
            end_at: toWallClockDateTime(batchEvent.end_at),
            cancelled: !!batchEvent.cancelled,
            batch_id: batchEvent.batch_id,
            batch_title: batchEvent.batch_title,
            branch_id: batchEvent.branch_id || null,
            branch_title: batchEvent.branch_title || null,
            editable: false,
        });
    }

    for (const userEvent of userEvents) {
        events.push({
            id: `user_event:${userEvent.id}`,
            type: "USER_EVENT",
            title: userEvent.title,
            description: userEvent.description,
            date: listDateForRangeEvent(userEvent.start_at, fromStr),
            start_at: toWallClockDateTime(userEvent.start_at),
            end_at: toWallClockDateTime(userEvent.end_at),
            cancelled: false,
            batch_id: null,
            batch_title: null,
            branch_id: null,
            branch_title: null,
            editable: true,
            source_id: userEvent.id,
        });
    }

    events.sort((a, b) => {
        const byDate = String(a.date).localeCompare(String(b.date));
        if (byDate !== 0) return byDate;
        return String(a.start_at).localeCompare(String(b.start_at));
    });

    res.status(200).json(events);
});

router.post("/events", async (req, res) => {
    if (!req.user?.id) {
        return res.status(401).json({ error: "Authentication Required" });
    }

    const requiredBodyFields = ["title", "start_at", "end_at"];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);
    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    const parsed = validateUserEventBody(validatedRequestBody);
    if (parsed.error) {
        return res.status(400).json({ error: parsed.error });
    }

    const id = await addUserEvent({
        user_id: req.user.id,
        title: parsed.title,
        description: req.body.description || null,
        start_at: parsed.start_at,
        end_at: parsed.end_at,
    });

    if (!id) {
        return res.status(400).json({ error: "Failed To Add Event" });
    }

    const event = await getUserEventById({ id });
    res.status(201).json(event);
});

router.patch("/events", async (req, res) => {
    if (!req.user?.id) {
        return res.status(401).json({ error: "Authentication Required" });
    }

    const requiredBodyFields = ["id", "title", "start_at", "end_at"];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);
    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    const existing = await getUserEventById({ id: validatedRequestBody.id });
    if (!existing || existing.user_id !== req.user.id) {
        return res.status(400).json({ error: "Event Not Exist" });
    }

    const parsed = validateUserEventBody(validatedRequestBody);
    if (parsed.error) {
        return res.status(400).json({ error: parsed.error });
    }

    const updated = await updateUserEventById({
        id: validatedRequestBody.id,
        user_id: req.user.id,
        title: parsed.title,
        description: req.body.description || null,
        start_at: parsed.start_at,
        end_at: parsed.end_at,
    });

    if (!updated) {
        return res.status(400).json({ error: "Failed To Update Event" });
    }

    res.status(200).json(await getUserEventById({ id: validatedRequestBody.id }));
});

router.delete("/events/:id", async (req, res) => {
    if (!req.user?.id) {
        return res.status(401).json({ error: "Authentication Required" });
    }

    if (!req.params.id) {
        return res.status(400).json({ error: "Missing Event Id" });
    }

    const deleted = await deleteUserEventById({ id: req.params.id, user_id: req.user.id });
    if (!deleted) {
        return res.status(400).json({ error: "Event Not Exist" });
    }

    res.sendStatus(204);
});

module.exports = router;
