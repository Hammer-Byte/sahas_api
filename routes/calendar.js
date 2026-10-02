const libExpress = require("express");
const { validateRequestBody } = require("sahas_utils");
const { getBatchesByUserId } = require("../db/batches");
const { getBatchSchedulesByBatchIdsAndWeekday } = require("../db/batch_schedule");
const { getBatchEventsForUserBatchesOnDay } = require("../db/batch_events");
const {
    getUserEventsByUserIdOnDay,
    getUserEventById,
    addUserEvent,
    updateUserEventById,
    deleteUserEventById,
} = require("../db/user_events");

const router = libExpress.Router();

function toTimeString(value) {
    if (value == null) return null;
    if (typeof value === "string") {
        return value.length >= 5 ? value.slice(0, 8) : value;
    }
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        const hh = String(value.getHours()).padStart(2, "0");
        const mm = String(value.getMinutes()).padStart(2, "0");
        const ss = String(value.getSeconds()).padStart(2, "0");
        return `${hh}:${mm}:${ss}`;
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

router.get("/", async (req, res) => {
    if (!req.user?.id) {
        return res.status(401).json({ error: "Authentication Required" });
    }

    const dateStr = typeof req.query.date === "string" ? req.query.date.trim() : "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return res.status(400).json({ error: "Missing or Invalid date (YYYY-MM-DD)" });
    }

    const [year, month, day] = dateStr.split("-").map(Number);
    const weekday = new Date(year, month - 1, day).getDay();
    const { day_start, day_end } = dayBounds(dateStr);

    const memberships = await getBatchesByUserId({ user_id: req.user.id });
    const activeBatches = memberships.filter((batch) => batch.active !== 0 && batch.active !== false);
    const batch_ids = activeBatches.map((batch) => batch.id);

    const events = [];

    if (batch_ids.length) {
        const schedules = await getBatchSchedulesByBatchIdsAndWeekday({ batch_ids, weekday });
        for (const schedule of schedules) {
            if (!schedule.active && schedule.active !== 1) continue;
            if (!dateInBatchRange(dateStr, schedule.start_date, schedule.end_date)) continue;

            const startTime = toTimeString(schedule.start_time);
            const endTime = toTimeString(schedule.end_time);
            if (!startTime || !endTime) continue;

            events.push({
                id: `schedule:${schedule.batch_id}:${weekday}`,
                type: "BATCH_SCHEDULE",
                title: schedule.batch_title || "Batch class",
                description: null,
                start_at: `${dateStr} ${startTime.slice(0, 5)}`,
                end_at: `${dateStr} ${endTime.slice(0, 5)}`,
                cancelled: false,
                batch_id: schedule.batch_id,
                batch_title: schedule.batch_title,
                editable: false,
            });
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
                start_at: batchEvent.start_at,
                end_at: batchEvent.end_at,
                cancelled: !!batchEvent.cancelled,
                batch_id: batchEvent.batch_id,
                batch_title: batchEvent.batch_title,
                editable: false,
            });
        }
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
            start_at: userEvent.start_at,
            end_at: userEvent.end_at,
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
