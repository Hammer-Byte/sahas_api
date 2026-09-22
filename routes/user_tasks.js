const libExpress = require("express");
const { validateRequestBody } = require("sahas_utils");
const requires_authority = require("../middlewares/requires_authority");
const { AUTHORITIES } = require("../constants");
const { hasRequiredAuthority } = require("../utils");
const {
    getUserTasksByFilters,
    getUserTasksCountByFilters,
    getUserTaskById,
    addUserTask,
    updateUserTaskById,
    updateUserTaskStatusById,
    deleteUserTaskById,
} = require("../db/user_tasks");
const {
    getUserTaskCommentsByTaskId,
    getUserTaskCommentById,
    addUserTaskComment,
    updateUserTaskCommentById,
    deleteUserTaskCommentById,
    deleteUserTaskCommentsByTaskId,
} = require("../db/user_task_comments");

const router = libExpress.Router();

function canViewTask(task, userId, authorities = []) {
    if (!task) return false;
    if (Number(task.user_id) === Number(userId) || Number(task.created_by) === Number(userId)) {
        return true;
    }
    return hasRequiredAuthority(authorities, AUTHORITIES.READ_ALL_USER_TASKS);
}

function isCreator(task, userId) {
    return task && Number(task.created_by) === Number(userId);
}

function isAssignee(task, userId) {
    return task && Number(task.user_id) === Number(userId);
}

function canEditStatus(task, userId) {
    return isCreator(task, userId) || isAssignee(task, userId);
}

router.get("/", requires_authority(AUTHORITIES.USE_PAGE_TASKS), async (req, res) => {
    const {
        scope,
        status_id,
        user_id,
        start_date,
        end_date,
        deadline_start,
        deadline_end,
        search,
        sort_order = "DESC",
        offSet = 0,
        limit = 20,
    } = req.query;

    if (!scope || !["assigned", "created", "all"].includes(scope)) {
        return res.status(400).json({ error: "scope must be assigned, created, or all" });
    }

    if (scope === "all" && !hasRequiredAuthority(req.user.authorities, AUTHORITIES.READ_ALL_USER_TASKS)) {
        return res.status(403).json({ error: "Forbidden" });
    }

    const normalizedSort = String(sort_order).toUpperCase() === "ASC" ? "ASC" : "DESC";

    const filters = {
        scope,
        viewer_id: req.user.id,
        status_id: status_id || null,
        user_id: (scope === "created" || scope === "all") && user_id ? user_id : null,
        start_date: start_date || null,
        end_date: end_date || null,
        deadline_start: deadline_start || null,
        deadline_end: deadline_end || null,
        search: search || null,
        sort_order: normalizedSort,
        offSet,
        limit,
    };

    res.status(200).json({
        recordsCount: await getUserTasksCountByFilters(filters),
        dataSet: await getUserTasksByFilters(filters),
    });
});

router.post("/", requires_authority(AUTHORITIES.CREATE_USER_TASK), async (req, res) => {
    const requiredBodyFields = ["title", "user_id", "status_id"];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);

    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    try {
        const id = await addUserTask({
            ...validatedRequestBody,
            description: req.body.description ?? null,
            attachment: req.body.attachment ?? null,
            deadline: req.body.deadline ?? null,
            created_by: req.user.id,
        });
        return res.status(201).json(await getUserTaskById({ id }));
    } catch (error) {
        return res.status(400).json({ error: error?.sqlMessage || error?.message || "Failed To Add Task" });
    }
});

router.patch("/comments/:id", requires_authority(AUTHORITIES.USE_PAGE_TASKS), async (req, res) => {
    const comment = await getUserTaskCommentById({ id: req.params.id });
    if (!comment) {
        return res.status(404).json({ error: "Comment Not Found" });
    }
    if (Number(comment.created_by) !== Number(req.user.id)) {
        return res.status(403).json({ error: "Forbidden" });
    }

    const requiredBodyFields = ["comment"];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);
    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    try {
        await updateUserTaskCommentById({
            id: comment.id,
            comment: validatedRequestBody.comment,
            attachment: req.body.attachment !== undefined ? req.body.attachment : comment.attachment,
        });
        return res.status(200).json(await getUserTaskCommentById({ id: comment.id }));
    } catch (error) {
        return res.status(400).json({ error: error?.sqlMessage || error?.message || "Failed To Update Comment" });
    }
});

router.delete("/comments/:id", requires_authority(AUTHORITIES.USE_PAGE_TASKS), async (req, res) => {
    const comment = await getUserTaskCommentById({ id: req.params.id });
    if (!comment) {
        return res.status(404).json({ error: "Comment Not Found" });
    }
    if (Number(comment.created_by) !== Number(req.user.id)) {
        return res.status(403).json({ error: "Forbidden" });
    }
    await deleteUserTaskCommentById({ id: comment.id });
    res.sendStatus(204);
});

router.get("/:id/comments", requires_authority(AUTHORITIES.USE_PAGE_TASKS), async (req, res) => {
    const task = await getUserTaskById({ id: req.params.id });
    if (!task) {
        return res.status(404).json({ error: "Task Not Found" });
    }
    if (!canViewTask(task, req.user.id, req.user.authorities)) {
        return res.status(403).json({ error: "Forbidden" });
    }
    res.status(200).json(await getUserTaskCommentsByTaskId({ task_id: task.id }));
});

router.post("/:id/comments", requires_authority(AUTHORITIES.USE_PAGE_TASKS), async (req, res) => {
    const task = await getUserTaskById({ id: req.params.id });
    if (!task) {
        return res.status(404).json({ error: "Task Not Found" });
    }
    if (!canViewTask(task, req.user.id, req.user.authorities)) {
        return res.status(403).json({ error: "Forbidden" });
    }

    const requiredBodyFields = ["comment"];
    const { isRequestBodyValid, missingRequestBodyFields, validatedRequestBody } = validateRequestBody(req.body, requiredBodyFields);
    if (!isRequestBodyValid) {
        return res.status(400).json({ error: `Missing ${missingRequestBodyFields?.join(",")}` });
    }

    try {
        const id = await addUserTaskComment({
            task_id: task.id,
            comment: validatedRequestBody.comment,
            attachment: req.body.attachment ?? null,
            created_by: req.user.id,
        });
        return res.status(201).json(await getUserTaskCommentById({ id }));
    } catch (error) {
        return res.status(400).json({ error: error?.sqlMessage || error?.message || "Failed To Add Comment" });
    }
});

router.get("/:id", requires_authority(AUTHORITIES.USE_PAGE_TASKS), async (req, res) => {
    const task = await getUserTaskById({ id: req.params.id });
    if (!task) {
        return res.status(404).json({ error: "Task Not Found" });
    }
    if (!canViewTask(task, req.user.id, req.user.authorities)) {
        return res.status(403).json({ error: "Forbidden" });
    }
    res.status(200).json(task);
});

router.patch("/:id", requires_authority(AUTHORITIES.USE_PAGE_TASKS), async (req, res) => {
    const task = await getUserTaskById({ id: req.params.id });
    if (!task) {
        return res.status(404).json({ error: "Task Not Found" });
    }
    if (!canViewTask(task, req.user.id, req.user.authorities)) {
        return res.status(403).json({ error: "Forbidden" });
    }

    const creator = isCreator(task, req.user.id);
    const statusEditor = canEditStatus(task, req.user.id);

    if (creator) {
        const title = req.body.title ?? task.title;
        const description = req.body.description !== undefined ? req.body.description : task.description;
        const user_id = req.body.user_id ?? task.user_id;
        const status_id = req.body.status_id ?? task.status_id;
        const attachment = req.body.attachment !== undefined ? req.body.attachment : task.attachment;
        const deadline = req.body.deadline !== undefined ? req.body.deadline : task.deadline;
        try {
            await updateUserTaskById({ id: task.id, title, description, user_id, status_id, attachment, deadline });
            return res.status(200).json(await getUserTaskById({ id: task.id }));
        } catch (error) {
            return res.status(400).json({ error: error?.sqlMessage || error?.message || "Failed To Update Task" });
        }
    }

    if (statusEditor && req.body.status_id !== undefined) {
        const disallowed = ["title", "description", "user_id", "attachment", "deadline"].some((key) => req.body[key] !== undefined);
        if (disallowed) {
            return res.status(403).json({ error: "Assignee can only update status" });
        }
        try {
            await updateUserTaskStatusById({ id: task.id, status_id: req.body.status_id });
            return res.status(200).json(await getUserTaskById({ id: task.id }));
        } catch (error) {
            return res.status(400).json({ error: error?.sqlMessage || error?.message || "Failed To Update Status" });
        }
    }

    return res.status(403).json({ error: "Forbidden" });
});

router.delete("/:id", requires_authority(AUTHORITIES.USE_PAGE_TASKS), async (req, res) => {
    const task = await getUserTaskById({ id: req.params.id });
    if (!task) {
        return res.status(404).json({ error: "Task Not Found" });
    }
    if (!isCreator(task, req.user.id)) {
        return res.status(403).json({ error: "Forbidden" });
    }

    try {
        await deleteUserTaskCommentsByTaskId({ task_id: task.id });
        await deleteUserTaskById({ id: task.id });
        return res.sendStatus(204);
    } catch (error) {
        return res.status(400).json({ error: error?.sqlMessage || error?.message || "Failed To Delete Task" });
    }
});

module.exports = router;
