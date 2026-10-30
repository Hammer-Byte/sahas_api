const libExpress = require("express");
const { validateRequestBody } = require("sahas_utils");
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
const { getChoghadiyaForDate, isValidDateString } = require("../libs/choghadiya");

const router = libExpress.Router();
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_SUMMARY_DAYS = 62;

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

router.get("/summary", async (req, res) => {
    if (!req.user?.id) {
        return res.status(401).json({ error: "Authentication Required" });
    }

    const fromStr = typeof req.query.from === "string" ? req.query.from.trim() : "";
    const toStr = typeof req.query.to === "string" ? req.query.to.trim() : "";
    if (!DATE_RE.test(fromStr) || !DATE_RE.test(toStr)) {
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

router.get("/choghadiya", async (req, res) => {
    if (!req.user?.id) {
        return res.status(401).json({ error: "Authentication Required" });
    }

    const dateStr = typeof req.query.date === "string" ? req.query.date.trim() : "";
    if (!isValidDateString(dateStr)) {
        return res.status(400).json({ error: "Missing or Invalid date (YYYY-MM-DD)" });
    }

    try {
        return res.status(200).json(await getChoghadiyaForDate(dateStr));
    } catch (error) {
        console.error("Failed to fetch Choghadiya timings", error?.message || error);
        return res.status(502).json({ error: "Couldn't load Choghadiya timings" });
    }
});

router.get("/", async (req, res) => {
    if (!req.user?.id) {
        return res.status(401).json({ error: "Authentication Required" });
    }

    const dateStr = typeof req.query.date === "string" ? req.query.date.trim() : "";
    if (!DATE_RE.test(dateStr)) {
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
            editable: true,
            source_id: userEvent.id,
        });
    }

    events.sort((a, b) => String(a.start_at).localeCompare(String(b.start_at)));
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

    const id = await addUserEvent({
        user_id: req.user.id,
        title: validatedRequestBody.title,
        description: req.body.description || null,
        start_at: validatedRequestBody.start_at,
        end_at: validatedRequestBody.end_at,
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

    const updated = await updateUserEventById({
        id: validatedRequestBody.id,
        user_id: req.user.id,
        title: validatedRequestBody.title,
        description: req.body.description || null,
        start_at: validatedRequestBody.start_at,
        end_at: validatedRequestBody.end_at,
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
